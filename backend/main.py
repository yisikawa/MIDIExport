import asyncio
import os
import shutil
import subprocess
import time
import uuid
import pathlib
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

BASE_DIR = pathlib.Path(__file__).parent.resolve()
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "separated"

UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

OUTPUT_TTL_SECONDS = 24 * 60 * 60  # 24時間

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".ogg", ".m4a", ".flac"}
ALLOWED_MODELS = {"htdemucs", "htdemucs_6s"}
MAX_UPLOAD_BYTES = 200 * 1024 * 1024  # 200MB
SEPARATION_TIMEOUT_SECONDS = 900  # 15分


def cleanup_old_outputs(ttl_seconds: int = OUTPUT_TTL_SECONDS) -> int:
    """OUTPUT_DIR 直下の、TTL を超えて古いセッションディレクトリを削除する。"""
    removed = 0
    now = time.time()
    for session_dir in OUTPUT_DIR.iterdir():
        if session_dir.is_dir() and now - session_dir.stat().st_mtime > ttl_seconds:
            shutil.rmtree(session_dir, ignore_errors=True)
            removed += 1
    return removed


@asynccontextmanager
async def lifespan(_app: FastAPI):
    removed = cleanup_old_outputs()
    if removed:
        print(f"Cleaned up {removed} old session dir(s)")
    yield


app = FastAPI(lifespan=lifespan)

# Allow CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# URL path to access separated files
app.mount("/output", StaticFiles(directory=str(OUTPUT_DIR)), name="output")

@app.post("/separate")
async def separate_audio(file: UploadFile = File(...), model: str = Form("htdemucs_6s")):
    """
    Separates the uploaded audio file into multiple stems using Demucs.
    Default model is 'htdemucs_6s' for 6 stems (vocals, drums, bass, guitar, piano, other).
    """
    if model not in ALLOWED_MODELS:
        raise HTTPException(status_code=400, detail=f"Unsupported model. Allowed: {sorted(ALLOWED_MODELS)}")

    suffix = pathlib.Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {sorted(ALLOWED_EXTENSIONS)}")

    # クライアント由来のファイル名はパスに使わない(パストラバーサル対策)
    session_id = str(uuid.uuid4())
    session_upload_path = UPLOAD_DIR / f"{session_id}{suffix}"

    try:
        size = 0
        with open(session_upload_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="File too large (max 200MB)")
                f.write(chunk)

        session_output_dir = OUTPUT_DIR / session_id
        session_output_dir.mkdir(exist_ok=True)

        script_path = BASE_DIR / "run_demucs.py"
        cmd = [
            sys.executable, str(script_path),
            "-n", model,
            "-o", str(session_output_dir),
            str(session_upload_path),
        ]

        env = os.environ.copy()
        print(f"Running command: {' '.join(cmd)}")
        try:
            # subprocess.run はブロッキングなのでワーカースレッドで実行し、
            # イベントループを塞がない(分離中も他リクエストに応答できる)
            result = await asyncio.to_thread(
                subprocess.run,
                cmd,
                capture_output=True,
                text=True,
                env=env,
                timeout=SEPARATION_TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=504, detail="Separation timed out")

        if result.returncode != 0:
            print(f"Demucs Error: {result.stderr}")
            raise HTTPException(status_code=500, detail="Separation failed. See server logs for details.")

        # Demucs の出力構造: session_output_dir/{model}/{入力ファイル名(拡張子なし)}/{stem}.wav
        model_results_path = session_output_dir / model / session_upload_path.stem
        if not model_results_path.exists():
            model_dir = session_output_dir / model
            subdirs = [d for d in model_dir.iterdir() if d.is_dir()] if model_dir.exists() else []
            if subdirs:
                model_results_path = subdirs[0]
            else:
                raise HTTPException(status_code=500, detail="Could not find separated files.")

        stems = {}
        for stem_file in model_results_path.glob("*.wav"):
            relative_url = f"/output/{session_id}/{model}/{model_results_path.name}/{stem_file.name}"
            stems[stem_file.stem] = relative_url

        return {
            "success": True,
            "session_id": session_id,
            "stems": stems,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Exception: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        session_upload_path.unlink(missing_ok=True)

@app.get("/")
async def root():
    return {"message": "MIDIExport AI Backend (Demucs) is ready"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
