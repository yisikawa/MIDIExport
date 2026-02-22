import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioPlayerResult {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    analyser: AnalyserNode | null;
    volume: number;
    setVolume: (volume: number) => void;
    playAudio: (buffer: AudioBuffer) => void;
    togglePlayPause: () => void;
    seek: (time: number) => void;
    stopAudio: () => void;
    initAudioContext: () => AudioContext;
}

export const useAudioPlayer = (): UseAudioPlayerResult => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolumeState] = useState(1);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    const bufferRef = useRef<AudioBuffer | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);

    const startTimeRef = useRef<number>(0);
    const pauseTimeRef = useRef<number>(0);
    const requestRef = useRef<number>(0);

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

    const setVolume = useCallback((newVolume: number) => {
        setVolumeState(newVolume);
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = newVolume;
        }
    }, []);

    const updateProgress = useCallback(() => {
        if (audioContextRef.current && isPlaying) {
            const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
            setCurrentTime(pauseTimeRef.current + elapsed);
            requestRef.current = requestAnimationFrame(updateProgress);
        }
    }, [isPlaying]);

    useEffect(() => {
        if (isPlaying) {
            requestRef.current = requestAnimationFrame(updateProgress);
        } else {
            cancelAnimationFrame(requestRef.current);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [isPlaying, updateProgress]);

    const stopAudio = useCallback(() => {
        if (sourceRef.current) {
            try { sourceRef.current.stop(); } catch (e) { /* ignore */ }
        }
        setIsPlaying(false);
        pauseTimeRef.current = 0;
        setCurrentTime(0);
        bufferRef.current = null;
    }, []);

    const playAudio = useCallback((buffer: AudioBuffer) => {
        const ctx = initAudioContext();

        if (sourceRef.current) {
            try { sourceRef.current.stop(); } catch (e) { /* ignore */ }
        }

        bufferRef.current = buffer;
        setDuration(buffer.duration);
        pauseTimeRef.current = 0;
        setCurrentTime(0);

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        let dest = analyser;
        if (!dest) {
            dest = ctx.createAnalyser();
            dest.fftSize = 2048;
            setAnalyser(dest);
        }

        let gain = gainNodeRef.current;
        if (!gain) {
            gain = ctx.createGain();
            gain.connect(ctx.destination);
            gainNodeRef.current = gain;
        }
        gain.gain.value = volume;

        source.connect(dest);
        dest.connect(gain);

        startTimeRef.current = ctx.currentTime;
        source.start(0);

        sourceRef.current = source;
        setIsPlaying(true);

        source.onended = () => {
            setIsPlaying((currentIsPlaying) => {
                if (!currentIsPlaying) return false;
                if (ctx.currentTime - startTimeRef.current + pauseTimeRef.current >= buffer.duration - 0.1) {
                    pauseTimeRef.current = 0;
                    setCurrentTime(0);
                }
                return false;
            });
        };
    }, [initAudioContext, analyser]);

    const togglePlayPause = useCallback(() => {
        const ctx = audioContextRef.current;
        const buffer = bufferRef.current;
        const dest = analyser;
        if (!ctx || !buffer || !dest) return;

        if (isPlaying) {
            if (sourceRef.current) {
                try { sourceRef.current.stop(); } catch (e) { /* ignore */ }
            }
            pauseTimeRef.current += ctx.currentTime - startTimeRef.current;
            setIsPlaying(false);
        } else {
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(dest);
            const gain = gainNodeRef.current;
            if (gain) {
                dest.connect(gain);
            } else {
                dest.connect(ctx.destination);
            }

            startTimeRef.current = ctx.currentTime;

            if (pauseTimeRef.current >= buffer.duration) {
                pauseTimeRef.current = 0;
            }

            source.start(0, pauseTimeRef.current);
            sourceRef.current = source;
            setIsPlaying(true);

            source.onended = () => {
                setIsPlaying((currentIsPlaying) => {
                    if (!currentIsPlaying) return false;
                    if (ctx.currentTime - startTimeRef.current + pauseTimeRef.current >= buffer.duration - 0.1) {
                        pauseTimeRef.current = 0;
                        setCurrentTime(0);
                    }
                    return false;
                });
            };
        }
    }, [isPlaying, analyser]);

    const seek = useCallback((time: number) => {
        const ctx = audioContextRef.current;
        const buffer = bufferRef.current;
        const dest = analyser;
        if (!ctx || !buffer || !dest) return;

        if (time < 0) time = 0;
        if (time > buffer.duration) time = buffer.duration;

        const wasPlaying = isPlaying;
        if (sourceRef.current) {
            try { sourceRef.current.stop(); } catch (e) { /* ignore */ }
        }

        pauseTimeRef.current = time;
        setCurrentTime(time);

        if (wasPlaying) {
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(dest);
            const gain = gainNodeRef.current;
            if (gain) {
                dest.connect(gain);
            } else {
                dest.connect(ctx.destination);
            }

            startTimeRef.current = ctx.currentTime;
            source.start(0, time);
            sourceRef.current = source;

            source.onended = () => {
                setIsPlaying((currentIsPlaying) => {
                    if (!currentIsPlaying) return false;
                    if (ctx.currentTime - startTimeRef.current + pauseTimeRef.current >= buffer.duration - 0.1) {
                        pauseTimeRef.current = 0;
                        setCurrentTime(0);
                    }
                    return false;
                });
            };
        }
    }, [isPlaying, analyser]);

    return {
        isPlaying,
        currentTime,
        duration,
        analyser,
        volume,
        setVolume,
        playAudio,
        togglePlayPause,
        seek,
        stopAudio,
        initAudioContext
    };
};
