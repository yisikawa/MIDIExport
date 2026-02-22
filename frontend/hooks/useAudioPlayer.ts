import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioTrack {
    name: string;
    buffer: AudioBuffer;
}

export interface UseAudioPlayerResult {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    analyser: AnalyserNode | null;
    volume: number;
    setVolume: (volume: number) => void;
    playAudio: (buffer: AudioBuffer) => void;
    playTracks: (tracks: AudioTrack[]) => void;
    toggleTrackMute: (name: string, isMuted: boolean) => void;
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
    const buffersRef = useRef<AudioTrack[]>([]);
    const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
    const gainsRef = useRef<Map<string, GainNode>>(new Map());
    const masterGainRef = useRef<GainNode | null>(null);
    const mutedTracksRef = useRef<Set<string>>(new Set());

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

    const stopAllSources = useCallback(() => {
        sourcesRef.current.forEach(source => {
            try { source.stop(); } catch (e) { /* ignore */ }
        });
        sourcesRef.current = [];
    }, []);

    const setVolume = useCallback((newVolume: number) => {
        setVolumeState(newVolume);
        if (masterGainRef.current) {
            masterGainRef.current.gain.value = newVolume;
        }
    }, []);

    const toggleTrackMute = useCallback((name: string, isMuted: boolean) => {
        if (isMuted) {
            mutedTracksRef.current.add(name);
        } else {
            mutedTracksRef.current.delete(name);
        }

        const gainNode = gainsRef.current.get(name);
        if (gainNode) {
            gainNode.gain.value = isMuted ? 0 : 1;
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
        stopAllSources();
        setIsPlaying(false);
        pauseTimeRef.current = 0;
        setCurrentTime(0);
        buffersRef.current = [];
        gainsRef.current.clear();
        mutedTracksRef.current.clear();
    }, [stopAllSources]);

    const startPlayback = useCallback((ctx: AudioContext, timeOffset: number) => {
        stopAllSources();

        let dest = analyser;
        if (!dest) {
            dest = ctx.createAnalyser();
            dest.fftSize = 2048;
            setAnalyser(dest);
        }

        let masterGain = masterGainRef.current;
        if (!masterGain) {
            masterGain = ctx.createGain();
            masterGainRef.current = masterGain;
        }
        masterGain.gain.value = volume;

        try { masterGain.disconnect(); } catch (e) { /* ignore */ }
        try { dest.disconnect(); } catch (e) { /* ignore */ }

        masterGain.connect(dest);
        dest.connect(ctx.destination);

        const newSources: AudioBufferSourceNode[] = [];
        gainsRef.current.clear();

        let maxDuration = 0;
        let longestSource: AudioBufferSourceNode | null = null;

        buffersRef.current.forEach(track => {
            const source = ctx.createBufferSource();
            source.buffer = track.buffer;

            const trackGain = ctx.createGain();
            trackGain.gain.value = mutedTracksRef.current.has(track.name) ? 0 : 1;

            source.connect(trackGain);
            trackGain.connect(masterGain);

            source.start(0, timeOffset);
            newSources.push(source);
            gainsRef.current.set(track.name, trackGain);

            if (track.buffer.duration > maxDuration) {
                maxDuration = track.buffer.duration;
                longestSource = source;
            }
        });

        sourcesRef.current = newSources;
        startTimeRef.current = ctx.currentTime;
        setIsPlaying(true);

        if (longestSource) {
            (longestSource as AudioBufferSourceNode).onended = () => {
                setIsPlaying((currentIsPlaying) => {
                    if (!currentIsPlaying) return false;
                    if (ctx.currentTime - startTimeRef.current + pauseTimeRef.current >= maxDuration - 0.1) {
                        pauseTimeRef.current = 0;
                        setCurrentTime(0);
                    }
                    return false;
                });
            };
        }
    }, [analyser, volume, stopAllSources]);

    const playTracks = useCallback((tracks: AudioTrack[]) => {
        const ctx = initAudioContext();
        buffersRef.current = tracks;

        const maxDur = tracks.reduce((max, t) => Math.max(max, t.buffer.duration), 0);
        setDuration(maxDur);
        pauseTimeRef.current = 0;
        setCurrentTime(0);

        startPlayback(ctx, 0);
    }, [initAudioContext, startPlayback]);

    const playAudio = useCallback((buffer: AudioBuffer) => {
        playTracks([{ name: 'main', buffer }]);
    }, [playTracks]);

    const togglePlayPause = useCallback(() => {
        const ctx = audioContextRef.current;
        if (!ctx || buffersRef.current.length === 0) return;

        if (isPlaying) {
            stopAllSources();
            pauseTimeRef.current += ctx.currentTime - startTimeRef.current;
            setIsPlaying(false);
        } else {
            let offset = pauseTimeRef.current;
            if (offset >= duration) {
                offset = 0;
                pauseTimeRef.current = 0;
            }
            startPlayback(ctx, offset);
        }
    }, [isPlaying, duration, startPlayback, stopAllSources]);

    const seek = useCallback((time: number) => {
        const ctx = audioContextRef.current;
        if (!ctx || buffersRef.current.length === 0) return;

        if (time < 0) time = 0;
        if (time > duration) time = duration;

        const wasPlaying = isPlaying;
        stopAllSources();

        pauseTimeRef.current = time;
        setCurrentTime(time);

        if (wasPlaying) {
            startPlayback(ctx, time);
        }
    }, [isPlaying, duration, startPlayback, stopAllSources]);

    return {
        isPlaying,
        currentTime,
        duration,
        analyser,
        volume,
        setVolume,
        playAudio,
        playTracks,
        toggleTrackMute,
        togglePlayPause,
        seek,
        stopAudio,
        initAudioContext
    };
};
