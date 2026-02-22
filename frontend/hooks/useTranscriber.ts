import { useState, useEffect, useRef, useCallback } from 'react';
import type { WorkerResponse } from '../types';
import type { NoteEventTime } from '@spotify/basic-pitch';

interface UseTranscriberResult {
    isProcessing: boolean;
    progress: number;
    result: NoteEventTime[] | null;
    startTranscription: (audioChannels: Float32Array, sampleRate: number) => void;
    resetTranscriber: () => void;
}

export const useTranscriber = (): UseTranscriberResult => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<NoteEventTime[] | null>(null);

    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        // Initialize worker
        workerRef.current = new Worker(new URL('../workers/basicPitchWorker.ts', import.meta.url), { type: 'module' });

        workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
            const { type, payload } = e.data;

            if (type === 'INIT_COMPLETE') {
                console.log('Worker initialized');
            } else if (type === 'PROGRESS') {
                setProgress(Math.round(payload as number * 100));
            } else if (type === 'RESULT') {
                setResult(payload as NoteEventTime[]);
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

    const startTranscription = useCallback((audioChannels: Float32Array, sampleRate: number) => {
        if (!workerRef.current) {
            console.error('Worker reference is null!');
            alert('System error: Worker not initialized.');
            return;
        }

        setResult(null);
        setProgress(0);
        setIsProcessing(true);

        workerRef.current.postMessage({
            type: 'PROCESS',
            payload: {
                audioChannels,
                sampleRate
            }
        });
    }, []);

    const resetTranscriber = useCallback(() => {
        setResult(null);
        setProgress(0);
        setIsProcessing(false);
    }, []);

    return {
        isProcessing,
        progress,
        result,
        startTranscription,
        resetTranscriber
    };
};
