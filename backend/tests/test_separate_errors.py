from fastapi.testclient import TestClient

import main
from fake_demucs import make_fake_demucs

client = TestClient(main.app)


def _wav_upload():
    return {"file": ("song.wav", b"RIFF fake", "audio/wav")}


def _isolate_dirs(monkeypatch, tmp_path):
    uploads = tmp_path / "uploads"
    outputs = tmp_path / "separated"
    uploads.mkdir()
    outputs.mkdir()
    monkeypatch.setattr(main, "UPLOAD_DIR", uploads)
    monkeypatch.setattr(main, "OUTPUT_DIR", outputs)


def test_demucs_failure_does_not_leak_stderr(monkeypatch, tmp_path):
    _isolate_dirs(monkeypatch, tmp_path)
    monkeypatch.setattr(
        main.subprocess, "run",
        make_fake_demucs(returncode=1, stderr="Traceback ... C:\\secret\\venv\\lib\\..."),
    )
    r = client.post("/separate", files=_wav_upload())
    assert r.status_code == 500
    assert "secret" not in r.json()["detail"]
    assert "Traceback" not in r.json()["detail"]


def test_timeout_returns_504(monkeypatch, tmp_path):
    _isolate_dirs(monkeypatch, tmp_path)

    def raise_timeout(cmd, **kwargs):
        raise main.subprocess.TimeoutExpired(cmd=cmd, timeout=1)

    monkeypatch.setattr(main.subprocess, "run", raise_timeout)
    r = client.post("/separate", files=_wav_upload())
    assert r.status_code == 504


def test_run_is_called_with_timeout(monkeypatch, tmp_path):
    _isolate_dirs(monkeypatch, tmp_path)
    captured = {}
    fake = make_fake_demucs()

    def capture_run(cmd, **kwargs):
        captured.update(kwargs)
        return fake(cmd, **kwargs)

    monkeypatch.setattr(main.subprocess, "run", capture_run)
    r = client.post("/separate", files=_wav_upload())
    assert r.status_code == 200
    assert captured.get("timeout") == main.SEPARATION_TIMEOUT_SECONDS
