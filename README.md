# MIDIExport

音声ファイル（MP3・WAV）をMIDIに変換するWebアプリケーション。
Spotify Basic Pitch による高精度なピッチ検出と、Demucs によるステム分離を組み合わせ、ブラウザ上で完結した変換体験を提供します。

## 主な機能

- **音声 → MIDI 変換**: `@spotify/basic-pitch` を使用したブラウザ内ピッチ検出
- **ステム分離**: バックエンド（Demucs / htdemucs_6s）によるボーカル・楽器の分離
- **マルチトラック再生**: 分離済みステムのミュート・ソロ制御
- **オーディオプレイヤー**: プログレスバー・音量コントロール付き
- **プレミアムUI**: ダークモード・Glassmorphism・マイクロインタラクション

## 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | React 19 + TypeScript + Vite |
| ピッチ検出 | @spotify/basic-pitch（Web Worker） |
| MIDI生成 | @tonejs/midi |
| バックエンド | Python（FastAPI + uvicorn）|
| ステム分離 | Demucs（htdemucs_6s モデル） |

## セットアップ

### 必要環境

- Node.js 18 以上
- Python 3.9 以上
- （初回のみ）Demucs モデルのダウンロード

### インストール

```bash
# フロントエンド依存関係
npm install

# バックエンド依存関係（初回のみ）
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
pip install -r requirements.txt
```

### 起動

```bash
# フロントエンド・バックエンドを同時起動
npm start
```

または `start.bat` をダブルクリックしても起動できます。

個別に起動する場合:

```bash
# フロントエンドのみ
npm run dev

# バックエンドのみ
cd backend && venv\Scripts\activate && python main.py
```

## テスト

```bash
# フロントエンド（Vitest）
npm test

# バックエンド（pytest）
cd backend && venv\Scripts\python.exe -m pytest tests -v
```

## プロジェクト構成

```
MIDIExport/
├── frontend/
│   ├── components/
│   │   ├── AudioPlayerBar.tsx   # 再生コントロール
│   │   ├── DropZone.tsx         # ファイルアップロード
│   │   ├── Layout.tsx           # ページレイアウト
│   │   └── Visualizer.tsx       # 波形ビジュアライザー
│   ├── hooks/
│   │   ├── useAudioPlayer.ts      # 再生状態管理
│   │   ├── useSourceSeparation.ts # ステム分離API呼び出し
│   │   └── useStemTranscriber.ts  # ステムごとのMIDI変換
│   ├── workers/
│   │   └── basicPitchWorker.ts  # Web Worker（ピッチ検出）
│   ├── utils/
│   │   ├── audio.ts             # リサンプリング
│   │   └── midi.ts              # MIDIファイル生成
│   ├── App.tsx
│   └── main.tsx
├── backend/
│   ├── main.py                  # APIサーバー（FastAPI）
│   ├── run_demucs.py            # Demucs実行ラッパー（torchaudio保存パッチ）
│   ├── tests/                   # pytestテスト
│   ├── uploads/                 # アップロードされた音声（処理後に削除）
│   └── separated/               # 分離済みステム（24時間で自動削除）
├── start.bat
└── package.json
```

## 使い方

1. アプリをブラウザで開く（デフォルト: `http://localhost:5173`）
2. 音声ファイル（MP3・WAV）をドロップゾーンにドラッグ＆ドロップ
3. ステム分離が完了したらトラックを選択・ミュート調整
4. 「変換」ボタンで MIDI ファイルを生成・ダウンロード
