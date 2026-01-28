/* eslint-disable no-restricted-globals */
// Polyfill window for libraries that expect it
if (typeof window === 'undefined') {
    (self as any).window = self;
}

import { BasicPitch, addPitchBendsToNoteEvents, outputToNotesPoly, noteFramesToTime } from '@spotify/basic-pitch';
import type { WorkerMessage, WorkerResponse } from '../types';

// State

// State
let basicPitch: BasicPitch | null = null;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
    const { type, payload } = e.data;

    try {
        if (type === 'INIT') {
            if (!basicPitch) {
                // Point to the model in public folder. 
                // Vite will serve /model/model.json from public/model/model.json
                basicPitch = new BasicPitch('/model/model.json');

                // Warmup usually helps
                // await basicPitch.evaluate(new Float32Array(22050)); 

                self.postMessage({ type: 'INIT_COMPLETE' });
            } else {
                self.postMessage({ type: 'INIT_COMPLETE' });
            }
        } else if (type === 'PROCESS') {
            if (!basicPitch) {
                throw new Error('BasicPitch not initialized');
            }

            const { audioChannels } = payload;
            // audioChannels: Float32Array (Already mono, 22050Hz)

            const onProgress = (p: number) => {
                self.postMessage({ type: 'PROGRESS', payload: p });
            };

            const accumulatedFrames: number[][] = [];
            const accumulatedOnsets: number[][] = [];
            const accumulatedContours: number[][] = [];

            await basicPitch.evaluateModel(
                audioChannels,
                (frames, onsets, contours) => {
                    accumulatedFrames.push(...frames);
                    accumulatedOnsets.push(...onsets);
                    accumulatedContours.push(...contours);
                },
                onProgress
            );

            const notes = outputToNotesPoly(accumulatedFrames, accumulatedOnsets);
            const noteEvents = addPitchBendsToNoteEvents(accumulatedContours, notes);
            const result = noteFramesToTime(noteEvents);
            self.postMessage({ type: 'RESULT', payload: result });
        }
    } catch (err: any) {
        console.error(err);
        self.postMessage({ type: 'ERROR', payload: err.message || 'Unknown error in worker' });
    }
};
