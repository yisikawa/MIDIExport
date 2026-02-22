import { useState, useRef, useCallback } from 'react';

interface UseAudioPlayerResult {
    isPlaying: boolean;
    analyser: AnalyserNode | null;
    playAudio: (buffer: AudioBuffer) => void;
    stopAudio: () => void;
    initAudioContext: () => AudioContext;
}

export const useAudioPlayer = (): UseAudioPlayerResult => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

    // WE keep a reference to the AudioContext to prevent it from being garbage collected or recreated unnecessarily
    // However, browsers usually require user interaction to create/resume AudioContext.
    // We will create it on demand or manage a single instance if preferred.
    // For this app, creating one per file load is the current pattern, but here we can be more flexible.
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);

    const initAudioContext = useCallback(() => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            const ctx = new AudioContext();
            audioContextRef.current = ctx;

            const ana = ctx.createAnalyser();
            ana.fftSize = 2048;
            setAnalyser(ana);

            return ctx;
        }
        return audioContextRef.current;
    }, []);

    const playAudio = useCallback((buffer: AudioBuffer) => {
        const ctx = initAudioContext();

        if (sourceRef.current) {
            try {
                sourceRef.current.stop();
            } catch (e) { /* ignore */ }
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        // Connect to analyser if it exists (it should be init by initAudioContext)
        // We need to re-fetch analyser from state or ref? 
        // State updates are async, so let's rely on the fact that initAudioContext sets it.
        // However, the state 'analyser' might not be updated in this render cycle yet if we just called init.
        // Ideally, we return context and analyser from init.

        // Re-getting analyser from the context destination chain is complex.
        // Let's rely on the pattern that initAudioControl is called before or we ensure analyser is ready.
        // For safety, let's create a temporary reference or assume the state will catch up for the visualizer, 
        // but for connection we need the node instance immediately.

        // Simplification: Re-create analyser if missing or just use the one we have?
        // Better to store analyser in ref as well for immediate access.

        // Let's try a simpler approach compatible with existing App.tsx logic:
        // User calls playAudio(buffer), we ensure context/analyser exist.

        // FIX: Implementation detail - we need the AnalyserNode instance synchronously to connect.
        // We can't rely on state 'analyser' here.

        // Let's grab it from the context workflow or ref.
        // Actually, let's restructure: initAudioContext returns the context AND the analyser.
        // But we are in a hook.

        // Revised approach: Use the context ref.


        // We know initAudioContext creates it and sets state. 
        // Let's create a dedicated Ref for analyzer to read it synchronously.

        // For now, let's trust the logic where we might need to recreate it if context changes.
        // Or simpler:
        const dest = ctx.createAnalyser();
        dest.fftSize = 2048;
        setAnalyser(dest); // Update state for UI

        // Connecting
        source.connect(dest);
        dest.connect(ctx.destination);

        source.start(0);
        sourceRef.current = source;
        setIsPlaying(true);

        source.onended = () => setIsPlaying(false);
    }, [initAudioContext]);

    const stopAudio = useCallback(() => {
        if (sourceRef.current) {
            try {
                sourceRef.current.stop();
            } catch (e) { /* ignore */ }
        }
        setIsPlaying(false);
    }, []);

    return {
        isPlaying,
        analyser,
        playAudio,
        stopAudio,
        initAudioContext
    };
};
