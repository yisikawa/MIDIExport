import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { DropZone } from './components/DropZone';
import { Visualizer } from './components/Visualizer';
import { Download, RefreshCw, Music, Mic2, Layers, Piano, Drum, Activity } from 'lucide-react';

import { useTranscriber } from './hooks/useTranscriber';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useSourceSeparation } from './hooks/useSourceSeparation';
import { resampleAudio } from './utils/audio';
import { generateMidi } from './utils/midi';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [midiUrl, setMidiUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'midi' | '分離'>('midi');

  const { isProcessing, progress, result: transcriptionResult, startTranscription, resetTranscriber } = useTranscriber();
  const { isPlaying, analyser, playAudio, stopAudio, initAudioContext } = useAudioPlayer();
  const { isSeparating, separationResult, error: separationError, separateAudio, resetSeparation } = useSourceSeparation();

  // Watch for transcription results to generate MIDI
  useEffect(() => {
    if (transcriptionResult) {
      const url = generateMidi(transcriptionResult);
      if (url) {
        setMidiUrl(url);
      } else {
        alert('No notes detected!');
      }
    }
  }, [transcriptionResult]);

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setMidiUrl(null);
    resetTranscriber();
    resetSeparation();
    setActiveTab('midi');

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const ctx = initAudioContext();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      playAudio(audioBuffer);

      const { channelData, sampleRate } = await resampleAudio(audioBuffer);
      startTranscription(channelData, sampleRate);

    } catch (err) {
      console.error(err);
      alert('Failed to load audio file. Please try a different MP3 or WAV.');
      resetTranscriber();
    }
  };

  const handleSeparate = () => {
    if (file) {
      separateAudio(file, 'htdemucs_6s');
    }
  };

  const reset = () => {
    setFile(null);
    setMidiUrl(null);
    stopAudio();
    resetTranscriber();
    resetSeparation();
  };

  const getStemIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'vocals': return <Mic2 size={20} />;
      case 'drums': return <Drum size={20} />;
      case 'bass': return <Activity size={20} />;
      case 'piano': return <Piano size={20} />;
      case 'guitar': return <Music size={20} />;
      default: return <Layers size={20} />;
    }
  };

  const handleDownload = async (e: React.MouseEvent, url: string, filename: string) => {
    e.preventDefault();
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(objUrl);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      alert('ダウンロードに失敗しました。');
    }
  };

  return (
    <Layout>
      <div className="container" style={{ maxWidth: '900px', width: '100%' }}>
        {!file ? (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2rem', fontWeight: 300 }}>
              AI <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Audio Studio</span>
            </h2>
            <DropZone onFileSelected={handleFileSelected} />
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', transition: 'all 0.3s ease' }}>
            <h2 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>{file.name}</h2>

            <Visualizer analyser={analyser} isPlaying={isPlaying} />

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', marginBottom: '2rem' }}>
              <button
                onClick={() => setActiveTab('midi')}
                className={`btn-tab ${activeTab === 'midi' ? 'active' : ''}`}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '1rem',
                  border: 'none',
                  background: activeTab === 'midi' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s'
                }}
              >
                <Music size={18} /> MIDI 変換
              </button>
              <button
                onClick={() => setActiveTab('分離')}
                className={`btn-tab ${activeTab === '分離' ? 'active' : ''}`}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '1rem',
                  border: 'none',
                  background: activeTab === '分離' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s'
                }}
              >
                <Layers size={18} /> 音源分離 (AI)
              </button>
            </div>

            <div style={{ minHeight: '200px' }}>
              {activeTab === 'midi' ? (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ color: 'var(--color-text-dim)', marginBottom: '1rem' }}>
                    {isProcessing ? `変換中... ${progress}%` : transcriptionResult ? 'MIDI変換完了' : '準備完了'}
                  </div>

                  {isProcessing && (
                    <div style={{ margin: '1rem 0' }}>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, background: 'var(--color-primary)', height: '100%', transition: 'width 0.2s linear' }} />
                      </div>
                    </div>
                  )}

                  {!isProcessing && midiUrl && (
                    <div style={{ marginTop: '1.5rem', animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                      <a
                        href={midiUrl}
                        onClick={() => {
                          // MIDIはブラウザで再生されないため、通常はそのままでもダウンロードされるが、
                          // 統一感を持たせるために必要なら同様の処理を行っても良い。
                          // ここでは念のためそのままにするか、handleDownloadを使うか選択できますが、
                          // Blob URL (createObjectURL) の場合は download 属性が効くのでそのままでOKです。
                          // ただし、もしbackendからのURLなら handleDownload が安全です。
                          // この midiUrl は generateMidi で生成された Blob URL なので、そのまま download 属性でOKです。
                        }}
                        download={`${file.name.replace(/\.[^/.]+$/, "")}.mid`}
                        className="btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', fontSize: '1.2rem', padding: '0.8rem 2rem' }}
                      >
                        <Download size={24} /> Download MIDI
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  {!separationResult && !isSeparating && (
                    <div style={{ padding: '1rem' }}>
                      <p style={{ color: 'var(--color-text-dim)', marginBottom: '1.5rem' }}>AIを使用してボーカル、ドラム、ベース、ピアノ、ギターなどを分離します。</p>
                      <button onClick={handleSeparate} className="btn-primary" style={{ padding: '0.8rem 2rem' }}>
                        分離を開始する (Demucs)
                      </button>
                    </div>
                  )}

                  {isSeparating && (
                    <div style={{ padding: '2rem' }}>
                      <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                      <p>AIが音源を分離しています...<br /><span style={{ fontSize: '0.8rem', opacity: 0.6 }}>初回のモデルダウンロードには時間がかかる場合があります</span></p>
                    </div>
                  )}

                  {separationError && (
                    <div style={{ color: '#ff4d4d', padding: '1rem', background: 'rgba(255,0,0,0.1)', borderRadius: '0.5rem' }}>
                      {separationError}
                    </div>
                  )}

                  {separationResult && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '1rem',
                      marginTop: '1rem'
                    }}>
                      {Object.entries(separationResult).map(([name, url]) => (
                        <div key={name} className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: 'var(--color-primary)' }}>{getStemIcon(name)}</span>
                          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{name}</span>
                          <a
                            href={url}
                            onClick={(e) => handleDownload(e, url, `${name}.wav`)}
                            className="btn-secondary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                          >
                            <Download size={14} /> Download
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
              <button onClick={reset} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--color-text)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}>
                <RefreshCw size={16} /> Another File
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .btn-tab:hover {
          background: rgba(255,255,255,0.12) !important;
        }
        .btn-tab.active:hover {
          background: var(--color-primary) !important;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255,255,255,0.1);
          border-left-color: var(--color-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
}

export default App;
