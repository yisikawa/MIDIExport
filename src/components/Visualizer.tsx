import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
    analyser: AnalyserNode | null;
    isPlaying: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ analyser, isPlaying }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>();

    useEffect(() => {
        if (!analyser || !isPlaying || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i];

                const style = getComputedStyle(document.documentElement);
                const primary = style.getPropertyValue('--color-primary').trim() || '#a78bfa';
                const accent = style.getPropertyValue('--color-accent').trim() || '#22d3ee';

                // Gradient fill
                const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
                gradient.addColorStop(0, primary);
                gradient.addColorStop(1, accent);

                ctx.fillStyle = gradient;

                // Rounded bars (simulated by ignoring bottom radius)
                ctx.beginPath();
                ctx.roundRect(x, canvas.height - barHeight / 1.5, barWidth, barHeight / 1.5, [4, 4, 0, 0]);
                ctx.fill();

                x += barWidth + 2;
            }

            animationFrameRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [analyser, isPlaying]);

    return (
        <canvas
            ref={canvasRef}
            width={600}
            height={150}
            style={{ width: '100%', height: '150px', marginTop: '2rem' }}
        />
    );
};
