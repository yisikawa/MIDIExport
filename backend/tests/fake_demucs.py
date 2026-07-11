"""subprocess.run 互換の Demucs 偽実装。実際の分離は行わない。"""
import pathlib


class FakeCompletedProcess:
    def __init__(self, returncode=0, stderr="", stdout=""):
        self.returncode = returncode
        self.stderr = stderr
        self.stdout = stdout


def make_fake_demucs(returncode=0, stderr=""):
    def fake_run(cmd, **kwargs):
        # cmd 形式: [python, run_demucs.py, -n, model, -o, outdir, inputfile]
        model = cmd[cmd.index("-n") + 1]
        outdir = pathlib.Path(cmd[cmd.index("-o") + 1])
        input_path = pathlib.Path(cmd[-1])
        if returncode == 0:
            stem_dir = outdir / model / input_path.stem
            stem_dir.mkdir(parents=True, exist_ok=True)
            (stem_dir / "vocals.wav").write_bytes(b"fake wav")
            (stem_dir / "drums.wav").write_bytes(b"fake wav")
        return FakeCompletedProcess(returncode=returncode, stderr=stderr)

    return fake_run
