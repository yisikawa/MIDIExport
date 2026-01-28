import { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { DropZone } from './components/DropZone';
import { Visualizer } from './components/Visualizer';
import type { WorkerResponse, NoteEventTime } from './types';
import { Midi } from '@tonejs/midi';
import { Download, RefreshCw } from 'lucide-react';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [midiUrl, setMidiUrl] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Standardized processing state
  const workerRef = useRef<Worker | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./workers/basicPitchWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { type, payload } = e.data;
      if (type === 'INIT_COMPLETE') {
        console.log('Worker initialized');
      } else if (type === 'PROGRESS') {
        setProgress(Math.round(payload as number * 100));
      } else if (type === 'RESULT') {
        generateMidi(payload as NoteEventTime[]);
        setIsProcessing(false);
        setProgress(100);
      } else if (type === 'ERROR') {
        console.error(payload);
        setIsProcessing(false);
        alert('Error processing audio: ' + (payload || 'Unknown error'));
      }
    };
    workerRef.current.postMessage({ type: 'INIT' });

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setMidiUrl(null);
    setProgress(0);
    setIsProcessing(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const ctx = new AudioContext();

      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      // Setup Visualizer
      const ana = ctx.createAnalyser();
      ana.fftSize = 2048;
      setAnalyser(ana);

      // Play audio for visualization
      playAudio(ctx, audioBuffer, ana);

      console.log('Starting offline rendering setup...');
      // Resample to 22050Hz Mono for Basic Pitch
      const targetSampleRate = 22050;
      // Ensure length is an integer
      const length = Math.ceil(audioBuffer.duration * targetSampleRate);

      const offlineCtx = new OfflineAudioContext(
        1, // Mono
        length,
        targetSampleRate
      );

      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start();

      console.log(`Rendering offline audio (Length: ${length} frames)...`);
      const resampled = await offlineCtx.startRendering();
      const channelData = resampled.getChannelData(0);
      console.log('Offline rendering complete. Sending to worker...');

      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'PROCESS',
          payload: {
            audioChannels: channelData, // Send as Float32Array (Mono)
            sampleRate: targetSampleRate
          }
        });
      } else {
        console.error('Worker reference is null!');
        alert('System error: Worker not initialized.');
        setIsProcessing(false);
      }

    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      alert('Failed to load audio file. Please try a different MP3 or WAV.');
    }
  };

  const playAudio = (ctx: AudioContext, buffer: AudioBuffer, dest: AnalyserNode) => {
    if (sourceRef.current) sourceRef.current.stop();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(dest);
    dest.connect(ctx.destination);
    source.start(0);
    sourceRef.current = source;
    setIsPlaying(true);
    source.onended = () => setIsPlaying(false);
  };

  const generateMidi = (noteEvents: NoteEventTime[]) => {
    if (!noteEvents || noteEvents.length === 0) {
      alert('No notes detected!');
      return;
    }

    const midi = new Midi();
    const track = midi.addTrack();

    noteEvents.forEach(note => {
      track.addNote({
        midi: note.pitchMidi,
        time: note.startTimeSeconds,
        duration: note.durationSeconds,
        velocity: note.amplitude
      });
    });

    const midiArray = midi.toArray();
    const blob = new Blob([midiArray], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    setMidiUrl(url);
  };

  const reset = () => {
    setFile(null);
    setMidiUrl(null);
    setIsProcessing(false);
    if (sourceRef.current) {
      sourceRef.current.stop();
    }
    setIsPlaying(false);
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
