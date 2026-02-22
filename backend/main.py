import os
import shutil
import subprocess
import uuid
import pathlib
import sys
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# Allow CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = pathlib.Path(__file__).parent.resolve()
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "separated"

UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# URL path to access separated files
app.mount("/output", StaticFiles(directory=str(OUTPUT_DIR)), name="output")

@app.post("/separate")
async def separate_audio(file: UploadFile = File(...), model: str = "htdemucs_6s"):
    """
    Separates the uploaded audio file into multiple stems using Demucs.
    Default model is 'htdemucs_6s' for 6stems (vocals, drums, bass, guitar, piano, other).
    """
    session_id = str(uuid.uuid4())
    session_upload_path = UPLOAD_DIR / f"{session_id}_{file.filename}"
    
    # Save uploaded file
    with open(session_upload_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    try:
        # Prepare output directory for this session
        session_output_dir = OUTPUT_DIR / session_id
        session_output_dir.mkdir(exist_ok=True)
        
        # Run Demucs
        # Run Demucs using our patched script (run_demucs.py)
        # Use sys.executable to ensure it uses the current venv's python
        # Assuming run_demucs.py is in the same directory as main.py
        script_path = BASE_DIR / "run_demucs.py"
        cmd = [
            sys.executable, str(script_path),
            "-n", model,
            "-o", str(session_output_dir),
            str(session_upload_path)
        ]
        
        # Set FFmpeg path so ffmpeg-python can find the executable
        env = os.environ.copy()
        # ffmpeg_bin = r"C:\ffmpeg-8.0.1\bin"
        # env["PATH"] = f"{ffmpeg_bin};{env.get('PATH', '')}"
        # env["FFMPEG_BINARY_DIR"] = ffmpeg_bin 
        
        print(f"Running command: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, env=env)
        

        
        
        if result.returncode != 0:
            print(f"Demucs Error: {result.stderr}")
            raise HTTPException(status_code=500, detail=f"Separation failed: {result.stderr}")
        
        # Locate separated files
        # Demucs output structure: session_output_dir/{model}/{filename_no_ext}/{stem}.wav
        file_stem = session_upload_path.stem
        model_results_path = session_output_dir / model / file_stem
        
        if not model_results_path.exists():
            # Sometimes demucs replaces spaces or special chars in the filename
            # Let's look for any directory inside session_output_dir / model
            model_dir = session_output_dir / model
            subdirs = [d for d in model_dir.iterdir() if d.is_dir()]
            if subdirs:
                model_results_path = subdirs[0]
            else:
                raise HTTPException(status_code=500, detail="Could not find separated files.")
        
        stems = {}
        for stem_file in model_results_path.glob("*.wav"):
            # Construct accessible URL
            relative_url = f"/output/{session_id}/{model}/{model_results_path.name}/{stem_file.name}"
            stems[stem_file.stem] = relative_url
            
        return {
            "success": True,
            "session_id": session_id,
            "stems": stems
        }
        
    except Exception as e:
        print(f"Exception: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Optional: Clean up input file
        if session_upload_path.exists():
            os.remove(session_upload_path)

@app.get("/")
async def root():
    return {"message": "MIDIExport AI Backend (Demucs) is ready"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
