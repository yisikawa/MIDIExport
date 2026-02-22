import React, { useState } from 'react';
import { Play, Pause, SkipBack, Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerBarProps {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    onTogglePlayPause: () => void;
    onSeek: (time: number) => void;
    onVolumeChange: (volume: number) => void;
}

const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({ isPlaying, currentTime, duration, volume, onTogglePlayPause, onSeek, onVolumeChange }) => {
    const [isHoveringVolume, setIsHoveringVolume] = useState(false);

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = x / rect.width;
        onSeek(ratio * duration);
    };

    return (
        <div style={{
            background: 'rgba(25, 25, 30, 0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '1rem',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            margin: '1rem 0'
        }}>
            <button
                onClick={() => onSeek(0)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.5rem',
                    opacity: 0.8,
                    transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
            >
                <SkipBack size={20} />
            </button>

            <button
                onClick={onTogglePlayPause}
                style={{
                    background: 'var(--color-primary)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '3rem',
                    height: '3rem',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 15px rgba(255, 62, 165, 0.4)',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 62, 165, 0.6)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 62, 165, 0.4)';
                }}
            >
                {isPlaying ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: '2px' }} />}
            </button>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.85rem', opacity: 0.8, minWidth: '40px', textAlign: 'right' }}>
                    {formatTime(currentTime)}
                </span>
                <div
                    onClick={handleProgressClick}
                    style={{
                        flex: 1,
                        height: '6px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <div style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        background: 'var(--color-primary)',
                        borderRadius: '3px',
                        transition: 'width 0.1s linear'
                    }} />
                </div>
                <span style={{ fontSize: '0.85rem', opacity: 0.8, minWidth: '40px' }}>
                    {formatTime(duration)}
                </span>
            </div>

            <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem', position: 'relative' }}
                onMouseEnter={() => setIsHoveringVolume(true)}
                onMouseLeave={() => setIsHoveringVolume(false)}
            >
                <button
                    onClick={() => onVolumeChange(volume > 0 ? 0 : 1)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text)',
                        cursor: 'pointer',
                        opacity: 0.8,
                        transition: 'opacity 0.2s',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                >
                    {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <div
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        onVolumeChange(Math.max(0, Math.min(1, x / rect.width)));
                    }}
                    style={{
                        width: isHoveringVolume ? '80px' : '0px',
                        opacity: isHoveringVolume ? 1 : 0,
                        height: '6px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'width 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s'
                    }}
                >
                    <div style={{
                        width: `${volume * 100}%`,
                        height: '100%',
                        background: 'var(--color-primary)',
                        borderRadius: '3px',
                        transition: 'width 0.1s linear'
                    }} />
                </div>
            </div>
        </div>
    );
};
