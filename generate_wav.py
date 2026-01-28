import wave
import math
import struct

sample_rate = 44100
duration = 1.0  # seconds
frequency = 440.0  # Hz

num_samples = int(sample_rate * duration)
audio = []

for i in range(num_samples):
    sample = 32767.0 * math.sin(2.0 * math.pi * frequency * i / sample_rate)
    audio.append(int(sample))

with wave.open('d:/AntiGravity/MIDIExport/test.wav', 'w') as wav_file:
    wav_file.setnchannels(1)
    wav_file.setsampwidth(2)
    wav_file.setframerate(sample_rate)
    for sample in audio:
        wav_file.writeframes(struct.pack('<h', sample))

print("Created test.wav")
