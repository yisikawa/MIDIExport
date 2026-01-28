# MIDIExport アプリケーション開発計画

## 目標
音声ファイル (MP3, WAV等) をMIDIファイルに変換するWebアプリケーション「MIDIExport」を作成する。
GitHubの `basic-pitch-ts` (Spotify Basic Pitch) を使用し、ブラウザ上で高精度な変換を実現する。
ユーザー体験を重視し、"Rich Aesthetics", "Premium Design" なUIを提供する。

## ユーザーレビュー必須事項
- **デザイン方針**: プレミアムでモダンなデザイン（ダークモード、Glassmorphism、マイクロインタラクション）を採用します。
- **技術スタック**: React + Vite + TypeScript + Vanilla CSS を使用します。

## 提案される変更

### 新規プロジェクト作成
- `d:\AntiGravity\MIDIExport` に Vite + React + TypeScript プロジェクトを作成。

### 構成要素

#### 1. Core Logic (`src/logic`)
- **Pitch Detection**: `@spotify/basic-pitch-ts` を導入。
- **Web Worker**: 変換処理は重いため、Web Worker内で実行しUIのフリーズを防ぐ。
- **Audio Processing**: Web Audio API を使用してファイルのデコードと波形データの取得を行う。

#### 2. UI Components (`src/components`)
- **Layout**: 全画面を使用し、没入感のあるデザイン。
- **DropZone**: 大きく、直感的なファイルアップロードエリア。ホバーエフェクトとアニメーション付き。
- **Visualizer**: アップロードされた音声の波形をCanvasで美しく描画。
- **ConverterControls**: 変換開始ボタン、パラメータ調整（もしあれば）、プログレスバー。
- **ResultArea**: 変換完了後のMIDIダウンロードボタン、再生プレビュー（簡易シンセ）。

#### 3. Styling (`src/styles`)
- **Theme**: 変数を使用したカラーパレット管理（Deep Blue/Purple, Neon accents）。
- **Global**: リセットCSSとベーススタイル。
- **Animations**: CSS Transitions & Keyframes によるスムーズな動き。

### ファイル構成案
```
MIDIExport/
  ├── public/
  ├── src/
  │   ├── assets/
  │   ├── components/
  │   │   ├── DropZone.tsx
  │   │   ├── Visualizer.tsx
  │   │   ├── Controls.tsx
  │   │   └── Layout.tsx
  │   ├── workers/
  │   │   └── basicPitchWorker.ts
  │   ├── App.tsx
  │   ├── main.tsx
  │   └── index.css
  └── package.json
```

## 検証計画

### 自動テスト
- 現時点ではユニットテストは最小限とし、E2E的な動作確認を優先する。

### 手動検証
1. **起動**: `npm run dev` でローカルサーバーを起動。
2. **UI確認**: デザインが崩れていないか、アニメーションがスムーズか確認。
3. **変換テスト**:
    - 短い音声ファイル (ボーカル、単楽器) をアップロード。
    - 変換プロセス中のプログレス表示を確認。
    - MIDIファイルがダウンロードされることを確認。
4. **品質確認**: ダウンロードしたMIDIを外部ツールで開き、音程がある程度正しいか確認。
