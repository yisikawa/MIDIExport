import pathlib
import sys

# backend/ を import パスに追加して `import main` を可能にする
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
