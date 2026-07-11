import { useState, useCallback } from 'react';
import type { WorkerResponse } from '../types';
import type { NoteEventTime } from '@spotify/basic-pitch';
import { resampleAudio } from '../utils/audio';
import { generateMidi } from '../utils/midi';

interface StemMidiState {
    isProcessing: boolean;
    progress: number;
    midiUrl: string | null;
    error: string | null;
}

export const useStemTranscriber = () => {
    const [stemStates, setStemStates] = useState<Record<string, StemMidiState>>({});

    const convertStem = useCallback(async (stemName: string, wavUrl: string) => {
        setStemStates(prev => ({
            ...prev,
            [stemName]: { isProcessing: true, progress: 0, midiUrl: null, error: null }
        }));

        try {
            const response = await fetch(wavUrl);
            if (!response.ok) throw new Error('音声ファイルの取得に失敗しました');
            const arrayBuffer = await response.arrayBuffer();

            const audioCtx = new AudioContext();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            audioCtx.close();

            const { channelData } = await resampleAudio(audioBuffer);

            await new Promise<void>((resolve, reject) => {
                const worker = new Worker(
                    new URL('../workers/basicPitchWorker.ts', import.meta.url),
                    { type: 'module' }
                );

                worker.onerror = (event) => {
                    worker.terminate();
                    reject(new Error(event.message || 'Workerの読み込みに失敗しました'));
                };

                worker.onmessageerror = () => {
                    worker.terminate();
                    reject(new Error('Workerとの通信に失敗しました'));
                };

                worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
                    const { type, payload } = e.data;

                    if (type === 'INIT_COMPLETE') {
                        worker.postMessage({ type: 'PROCESS', payload: { audioChannels: channelData } });
                    } else if (type === 'PROGRESS') {
                        setStemStates(prev => ({
                            ...prev,
                            [stemName]: { ...prev[stemName], progress: Math.round((payload as number) * 100) }
                        }));
                    } else if (type === 'RESULT') {
                        const midiUrl = generateMidi(payload as NoteEventTime[]);
                        setStemStates(prev => ({
                            ...prev,
                            [stemName]: {
                                isProcessing: false,
                                progress: 100,
                                midiUrl,
                                error: midiUrl ? null : 'ノートが検出されませんでした',
                            }
                        }));
                        worker.terminate();
                        resolve();
                    } else if (type === 'ERROR') {
                        worker.terminate();
                        reject(new Error(payload as string));
                    }
                };

                worker.postMessage({ type: 'INIT' });
            });

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : '不明なエラー';
            console.error(err);
            setStemStates(prev => ({
                ...prev,
                [stemName]: { isProcessing: false, progress: 0, midiUrl: null, error: message }
            }));
        }
    }, []);

    const resetStemStates = useCallback(() => {
        setStemStates({});
    }, []);

    return { stemStates, convertStem, resetStemStates };
};
