import { Midi } from '@tonejs/midi';
import type { NoteEventTime } from '@spotify/basic-pitch';

export const generateMidi = (noteEvents: NoteEventTime[]): string | null => {
    if (!noteEvents || noteEvents.length === 0) {
        return null;
    }

    const midi = new Midi();
    const track = midi.addTrack();

    noteEvents.forEach(note => {
        track.addNote({
            midi: note.pitchMidi,
            time: note.startTimeSeconds,
            duration: note.durationSeconds,
            velocity: note.amplitude
        });
    });

    const midiArray = midi.toArray();
    const blob = new Blob([midiArray as any], { type: 'audio/midi' });
    return URL.createObjectURL(blob);
};
