import { useState, useCallback } from 'react';

interface SeparationResult {
    [stem: string]: string; // stem name -> url
}

export const useSourceSeparation = () => {
    const [isSeparating, setIsSeparating] = useState(false);
    const [separationResult, setSeparationResult] = useState<SeparationResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const separateAudio = useCallback(async (file: File, model: string = 'htdemucs_6s') => {
        setIsSeparating(true);
        setSeparationResult(null);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('model', model);

            // Assuming backend is running on localhost:8000
            const response = await fetch('http://localhost:8000/separate', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Separation failed');
            }

            const data = await response.json();
            if (data.success) {
                // Adjust URLs to include backend host
                const stems = data.stems;
                const absoluteStems: SeparationResult = {};
                for (const [key, val] of Object.entries(stems)) {
                    if (typeof val === 'string') {
                        absoluteStems[key] = `http://localhost:8000${val}`;
                    }
                }
                setSeparationResult(absoluteStems);
            } else {
                 throw new Error('Server returned success: false');
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Separation failed');
        } finally {
            setIsSeparating(false);
        }
    }, []);

    const resetSeparation = useCallback(() => {
        setSeparationResult(null);
        setError(null);
        setIsSeparating(false);
    }, []);

    return {
        isSeparating,
        separationResult,
        error,
        separateAudio,
        resetSeparation
    };
};
