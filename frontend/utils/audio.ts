export const resampleAudio = async (
    audioBuffer: AudioBuffer,
    targetSampleRate: number = 22050
): Promise<{ channelData: Float32Array; sampleRate: number }> => {
    console.log('Starting offline rendering setup...');

    // Ensure length is an integer (fix for potential floating point issues)
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
    console.log('Offline rendering complete.');

    return {
        channelData,
        sampleRate: targetSampleRate
    };
};
