from fastapi.testclient import TestClient

import main
from fake_demucs import make_fake_demucs

# with を使わない = lifespan(起動時クリーンアップ)は走らせない
client = TestClient(main.app)


def _wav_upload(filename="song.wav", content=b"RIFF fake"):
    return {"file": (filename, content, "audio/wav")}


def _isolate_dirs(monkeypatch, tmp_path):
    uploads = tmp_path / "uploads"
    outputs = tmp_path / "separated"
    uploads.mkdir()
    outputs.mkdir()
    monkeypatch.setattr(main, "UPLOAD_DIR", uploads)
    monkeypatch.setattr(main, "OUTPUT_DIR", outputs)
    return uploads, outputs


def test_rejects_unknown_model(monkeypatch, tmp_path):
    _isolate_dirs(monkeypatch, tmp_path)
    r = client.post("/separate", data={"model": "evil_model"}, files=_wav_upload())
    assert r.status_code == 400


def test_rejects_unsupported_extension(monkeypatch, tmp_path):
    _isolate_dirs(monkeypatch, tmp_path)
    r = client.post("/separate", files=_wav_upload(filename="script.exe"))
    assert r.status_code == 400


def test_rejects_oversized_upload(monkeypatch, tmp_path):
    uploads, _ = _isolate_dirs(monkeypatch, tmp_path)
    monkeypatch.setattr(main, "MAX_UPLOAD_BYTES", 10)
    r = client.post("/separate", files=_wav_upload(content=b"x" * 100))
    assert r.status_code == 413
    assert list(uploads.iterdir()) == []  # 途中まで書いたファイルも残らない


def test_traversal_filename_cannot_escape_uploads(monkeypatch, tmp_path):
    uploads, outputs = _isolate_dirs(monkeypatch, tmp_path)
    monkeypatch.setattr(main.subprocess, "run", make_fake_demucs())
    r = client.post("/separate", files=_wav_upload(filename="..\\..\\evil.wav"))
    assert r.status_code == 200
    # uploads/separated の外(tmp_path 直下や親)に evil ファイルが作られていない
    assert list(tmp_path.glob("evil*")) == []
    assert list(tmp_path.parent.glob("evil*")) == []


def test_separate_success_returns_stem_urls(monkeypatch, tmp_path):
    _isolate_dirs(monkeypatch, tmp_path)
    monkeypatch.setattr(main.subprocess, "run", make_fake_demucs())
    r = client.post("/separate", files=_wav_upload())
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert set(body["stems"].keys()) == {"vocals", "drums"}
    for url in body["stems"].values():
        assert url.startswith(f"/output/{body['session_id']}/htdemucs_6s/")
