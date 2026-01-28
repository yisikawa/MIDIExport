import React, { useState, useRef } from 'react';
import { Upload, FileAudio } from 'lucide-react';

interface DropZoneProps {
    onFileSelected: (file: File) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFileSelected }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            validateAndPass(files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            validateAndPass(e.target.files[0]);
        }
    };

    const validateAndPass = (file: File) => {
        if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|m4a|flac)$/i)) {
            onFileSelected(file);
        } else {
            alert('Please upload a valid audio file.');
        }
    };

    return (
        <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`glass-panel`}
            style={{
                width: '100%',
                padding: '4rem 2rem',
                border: '2px dashed ' + (isDragOver ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)'),
                backgroundColor: isDragOver ? 'rgba(6, 182, 212, 0.1)' : 'rgba(30, 41, 59, 0.4)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                minHeight: '350px'
            }}
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleChange}
                accept="audio/*"
                style={{ display: 'none' }}
            />

            <div style={{
                marginBottom: '2rem',
                padding: '1.5rem',
                borderRadius: '50%',
                background: isDragOver ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.05)',
                transform: isDragOver ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
                {isDragOver ? (
                    <Upload size={64} color="var(--color-accent)" />
                ) : (
                    <FileAudio size={64} color="var(--color-text-dim)" />
                )}
            </div>

            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.5rem', fontWeight: 600, color: isDragOver ? 'var(--color-accent)' : 'var(--color-text)' }}>
                {isDragOver ? 'Drop to upload' : 'Select Audio File'}
            </h3>
            <p style={{ color: 'var(--color-text-dim)', margin: 0, textAlign: 'center', maxWidth: '300px', lineHeight: 1.5 }}>
                Drag and drop your audio file here,<br /> or click to browse
            </p>
        </div>
    );
};
