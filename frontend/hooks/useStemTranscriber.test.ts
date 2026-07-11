// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStemTranscriber } from './useStemTranscriber';

vi.mock('../utils/audio', () => ({
    resampleAudio: vi.fn().mockResolvedValue({
        channelData: new Float32Array(10),
        sampleRate: 22050,
    }),
}));

// Worker の読み込みに失敗するケースを再現するモック。
// postMessage({ type: 'INIT' }) を受け取ると、onmessage(INIT_COMPLETE) を
// 一度も呼ばずに onerror を発火させる。
class FailingWorkerMock {
    onerror: ((event: ErrorEvent) => void) | null = null;
    onmessageerror: ((event: MessageEvent) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;

    constructor(_url: string | URL, _options?: WorkerOptions) {
        // コンストラクタ引数は無視する
    }

    postMessage(msg: { type: string }) {
        if (msg.type === 'INIT') {
            queueMicrotask(() => {
                this.onerror?.(
                    new ErrorEvent('error', { message: 'mock worker load failure' })
                );
            });
        }
    }

    terminate() {
        // no-op
    }
}

describe('useStemTranscriber', () => {
    beforeEach(() => {
        URL.createObjectURL = vi.fn(() => 'blob:mock-url');
        URL.revokeObjectURL = vi.fn();

        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        }));

        vi.stubGlobal('AudioContext', class {
            decodeAudioData(_buf: ArrayBuffer) {
                return Promise.resolve({} as AudioBuffer);
            }
            close() {
                // no-op
            }
        });

        vi.stubGlobal('Worker', FailingWorkerMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('Workerがエラーで停止した場合、isProcessingがfalseになりerrorが設定される', async () => {
        const { result } = renderHook(() => useStemTranscriber());

        await act(async () => {
            await result.current.convertStem('vocals', 'blob:fake-wav-url');
        });

        await waitFor(() => {
            expect(result.current.stemStates.vocals?.isProcessing).toBe(false);
        });

        expect(result.current.stemStates.vocals?.error).not.toBeNull();
        expect(typeof result.current.stemStates.vocals?.error).toBe('string');
    });
});
