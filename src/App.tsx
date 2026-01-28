import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { DropZone } from './components/DropZone';
import { Visualizer } from './components/Visualizer';
import { Download, RefreshCw } from 'lucide-react';

import { useTranscriber } from './hooks/useTranscriber';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { resampleAudio } from './utils/audio';
import { generateMidi } from './utils/midi';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [midiUrl, setMidiUrl] = useState<string | null>(null);

  const { isProcessing, progress, result: transcriptionResult, startTranscription, resetTranscriber } = useTranscriber();
  const { isPlaying, analyser, playAudio, stopAudio, initAudioContext } = useAudioPlayer();

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

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();

      // Initialize Audio Context (needed for decoding and playing)
      const ctx = initAudioContext();

      // Decode
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      // Play audio for visualization
      playAudio(audioBuffer);

      // Resample and process
      const { channelData, sampleRate } = await resampleAudio(audioBuffer);
      startTranscription(channelData, sampleRate);

    } catch (err) {
      console.error(err);
      alert('Failed to load audio file. Please try a different MP3 or WAV.');
      resetTranscriber();
    }
  };

  const reset = () => {
    setFile(null);
    setMidiUrl(null);
    stopAudio();
    resetTranscriber();
  };

  return (
    <Layout>
      <div className="container" style={{ maxWidth: '800px', width: '100%' }}>
        {!file ? (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2rem', fontWeight: 300 }}>
              Convert Audio to <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>MIDI</span>
            </h2>

            <DropZone onFileSelected={handleFileSelected} />
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', transition: 'all 0.3s ease' }}>
            <h2 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>{file.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '2rem', color: 'var(--color-text-dim)' }}>
              <span>{isProcessing ? 'Transcribing...' : 'Transcription Complete'}</span>
            </div>

            <Visualizer analyser={analyser} isPlaying={isPlaying} />

            {isProcessing && (
              <div style={{ margin: '2rem 0', width: '100%' }}>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, background: 'var(--color-primary)', height: '100%', transition: 'width 0.2s linear' }} />
                </div>
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-dim)' }}>
                  {progress}%
                </p>
              </div>
            )}

            {!isProcessing && midiUrl && (
              <div style={{ marginTop: '2rem', animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                <a href={midiUrl} download={`${file.name.replace(/\.[^/.]+$/, "")}.mid`} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', fontSize: '1.25rem', padding: '1rem 2rem' }}>
                  <Download size={24} />
                  Download MIDI
                </a>
              </div>
            )}

            <div style={{ marginTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
              <button onClick={reset} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--color-text)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}>
                <RefreshCw size={16} /> Convert Another
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
      `}</style>
    </Layout>
  );
}

export default App;
