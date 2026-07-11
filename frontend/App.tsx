import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { DropZone } from './components/DropZone';
import { Visualizer } from './components/Visualizer';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { Download, RefreshCw, Music, Mic2, Layers, Piano, Drum, Activity, CheckCircle2, Circle } from 'lucide-react';

import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useSourceSeparation } from './hooks/useSourceSeparation';
import { useStemTranscriber } from './hooks/useStemTranscriber';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { isPlaying, currentTime, duration, analyser, volume, setVolume, playAudio, playTracks, toggleTrackMute, togglePlayPause, seek, stopAudio, initAudioContext } = useAudioPlayer();
  const { isSeparating, separationResult, error: separationError, separateAudio, resetSeparation } = useSourceSeparation();
  const { stemStates, convertStem, resetStemStates } = useStemTranscriber();

  const [activeTracks, setActiveTracks] = useState<Record<string, boolean>>({});
  const [isStemsLoading, setIsStemsLoading] = useState(false);

  // Handle stem loading and playback when separation is ready
  useEffect(() => {
    let active = true;
    const loadStems = async () => {
      if (separationResult) {
        setIsStemsLoading(true);
        try {
          const ctx = initAudioContext();
          const tracks = await Promise.all(
            Object.entries(separationResult).map(async ([name, url]) => {
              const response = await fetch(url);
              const arrayBuffer = await response.arrayBuffer();
              const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
              return { name, buffer: audioBuffer };
            })
          );

          if (!active) return;

          playTracks(tracks);

          const initialActiveTracks: Record<string, boolean> = {};
          tracks.forEach(track => {
            initialActiveTracks[track.name] = true;
          });
          setActiveTracks(initialActiveTracks);

        } catch (error) {
          console.error("Failed to load stems", error);
        } finally {
          if (active) {
            setIsStemsLoading(false);
          }
        }
      }
    };

    loadStems();
    return () => { active = false; };
  }, [separationResult, initAudioContext, playTracks]);

  const toggleTrack = (name: string) => {
    setActiveTracks(prev => {
      const isCurrentlyActive = prev[name];
      const newActiveState = !isCurrentlyActive;
      toggleTrackMute(name, !newActiveState);
      return { ...prev, [name]: newActiveState };
    });
  };

  const handleFileSelected = async (selectedFile: File) => {
    setLoadError(null);
    setFile(selectedFile);
    resetSeparation();
    resetStemStates();
    setActiveTracks({});

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const ctx = initAudioContext();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      playAudio(audioBuffer);

    } catch (err) {
      console.error(err);
      setFile(null);
      setLoadError('音声ファイルの読み込みに失敗しました。別のMP3またはWAVをお試しください。');
    }
  };

  const handleSeparate = () => {
    if (file) {
      separateAudio(file, 'htdemucs_6s');
    }
  };

  const reset = () => {
    setFile(null);
    setLoadError(null);
    stopAudio();
    resetSeparation();
    resetStemStates();
    setActiveTracks({});
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
            {loadError && (
              <div style={{ color: '#ff4d4d', padding: '1rem', background: 'rgba(255,0,0,0.1)', borderRadius: '0.5rem', marginBottom: '1rem', textAlign: 'center' }}>
                {loadError}
              </div>
            )}
            <DropZone onFileSelected={handleFileSelected} />
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', transition: 'all 0.3s ease' }}>
            <h2 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>{file.name}</h2>

            <Visualizer analyser={analyser} isPlaying={isPlaying} />

            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <AudioPlayerBar
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                volume={volume}
                onTogglePlayPause={togglePlayPause}
                onSeek={seek}
                onVolumeChange={setVolume}
              />
            </div>

            {/* 音源分離 */}
            <div style={{ minHeight: '160px', marginTop: '1.5rem' }}>
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

              {isStemsLoading && (
                <div style={{ padding: '2rem' }}>
                  <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                  <p>分離された音源を再生準備中...</p>
                </div>
              )}

              {separationResult && !isStemsLoading && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  {Object.entries(separationResult).map(([name, url]) => {
                    const stemState = stemStates[name];
                    return (
                      <div key={name} className="glass-panel" style={{
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                        opacity: activeTracks[name] === false ? 0.4 : 1,
                        transition: 'opacity 0.2s',
                        boxShadow: activeTracks[name] !== false ? '0 4px 12px rgba(123, 74, 255, 0.2)' : 'none',
                        border: activeTracks[name] !== false ? '1px solid rgba(123, 74, 255, 0.3)' : '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <button
                          onClick={() => toggleTrack(name)}
                          style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s' }}
                          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
                          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                          title={activeTracks[name] !== false ? 'Mute' : 'Unmute'}
                        >
                          {activeTracks[name] !== false
                            ? <CheckCircle2 color="var(--color-primary)" size={28} />
                            : <Circle color="rgba(255,255,255,0.3)" size={28} />}
                        </button>

                        <span style={{ color: activeTracks[name] !== false ? 'white' : 'var(--color-text-dim)', transition: 'color 0.2s' }}>{getStemIcon(name)}</span>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize', color: activeTracks[name] !== false ? 'white' : 'var(--color-text-dim)', transition: 'color 0.2s' }}>{name}</span>

                        <a
                          href={url}
                          onClick={(e) => handleDownload(e, url, `${name}.wav`)}
                          className="btn-secondary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginTop: '0.25rem', pointerEvents: 'auto', opacity: 1 }}
                        >
                          <Download size={14} /> WAV
                        </a>

                        {stemState?.isProcessing ? (
                          <div style={{ width: '100%' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', marginBottom: '3px', textAlign: 'center' }}>
                              変換中... {stemState.progress}%
                            </div>
                            <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${stemState.progress}%`, background: 'var(--color-primary)', height: '100%', transition: 'width 0.2s linear' }} />
                            </div>
                          </div>
                        ) : stemState?.midiUrl ? (
                          <a
                            href={stemState.midiUrl}
                            download={`${name}.mid`}
                            className="btn-primary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Download size={14} /> MIDI
                          </a>
                        ) : (
                          <button
                            onClick={() => convertStem(name, url)}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', borderRadius: '0.5rem', cursor: 'pointer' }}
                          >
                            <Music size={14} /> MIDI変換
                          </button>
                        )}

                        {stemState?.error && (
                          <div style={{ fontSize: '0.7rem', color: '#ff8080', textAlign: 'center' }}>
                            {stemState.error}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
