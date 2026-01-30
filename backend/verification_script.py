import torch
import os
import numpy as np
from run_demucs import safe_save

def test_safe_save():
    print("Testing safe_save...")
    # Create dummy audio tensor (Channels, Time)
    # 2 channels, 44100 Hz, 1 second
    sample_rate = 44100
    duration = 1
    t = torch.linspace(0, duration, sample_rate * duration)
    # Sine wave
    waveform = torch.sin(2 * torch.pi * 440 * t)
    # Stereo
    audio = torch.stack([waveform, waveform])
    
    output_path = "test_output.wav"
    
    try:
        safe_save(output_path, audio, sample_rate)
        if os.path.exists(output_path):
            print(f"Success: {output_path} created.")
            file_size = os.path.getsize(output_path)
            print(f"File size: {file_size} bytes")
            # Cleanup
            os.remove(output_path)
        else:
            print(f"Failure: {output_path} not found.")
            exit(1)
    except Exception as e:
        print(f"Exception during test: {e}")
        exit(1)

if __name__ == "__main__":
    test_safe_save()
