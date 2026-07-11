import { describe, it, expect, vi, beforeAll } from 'vitest';
import type { NoteEventTime } from '@spotify/basic-pitch';
import { generateMidi } from './midi';

beforeAll(() => {
    // Node 環境には createObjectURL がないためスタブする
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
});

describe('generateMidi', () => {
    it('ノートが空のとき null を返す', () => {
        expect(generateMidi([])).toBeNull();
    });

    it('ノートがあるとき Blob URL を返す', () => {
        const note = {
            pitchMidi: 60,
            startTimeSeconds: 0,
            durationSeconds: 1,
            amplitude: 0.8,
            pitchBends: [],
        } as unknown as NoteEventTime;
        expect(generateMidi([note])).toBe('blob:mock-url');
    });
});
