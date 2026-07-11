import os
import time

import main


def test_cleanup_removes_only_old_session_dirs(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "OUTPUT_DIR", tmp_path)

    old_dir = tmp_path / "old-session"
    old_dir.mkdir()
    (old_dir / "vocals.wav").write_bytes(b"x")
    old_time = time.time() - 10 * 24 * 60 * 60  # 10日前
    os.utime(old_dir, (old_time, old_time))

    new_dir = tmp_path / "new-session"
    new_dir.mkdir()

    removed = main.cleanup_old_outputs(ttl_seconds=24 * 60 * 60)

    assert removed == 1
    assert not old_dir.exists()
    assert new_dir.exists()


def test_cleanup_ignores_plain_files(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "OUTPUT_DIR", tmp_path)
    stray = tmp_path / "stray.txt"
    stray.write_text("keep me")
    old_time = time.time() - 10 * 24 * 60 * 60
    os.utime(stray, (old_time, old_time))

    removed = main.cleanup_old_outputs(ttl_seconds=24 * 60 * 60)

    assert removed == 0
    assert stray.exists()
