import sys
import os
import torch
import torchaudio
import ffmpeg
import numpy as np

# Direct patch for torchaudio.save to bypass torchcodec entirely
def safe_save(filepath, src, sample_rate, **kwargs):
    """
    Replacement for torchaudio.save that uses ffmpeg-python directly.
    """
    # Ensure src is on CPU and convert to numpy
    if src.is_cuda:
        src = src.cpu()
    
    # torchaudio tensors are (Channels, Time)
    # ffmpeg expects (Time, Channels) for input usually, or we can specify layout.
    # We will transpose to (Time, Channels) and flatten for pipe
    src_np = src.detach().numpy()
    
    channels = 1
    if src_np.ndim > 1:
        channels = src_np.shape[0]
        src_np = src_np.transpose() # (Time, Channels)
    
    # Ensure float32
    src_np = src_np.astype(np.float32)

    # Use ffmpeg to save
    try:
        process = (
            ffmpeg
            .input('pipe:', format='f32le', ac=channels, ar=sample_rate)
            .output(filepath)
            .overwrite_output()
            .run_async(pipe_stdin=True, quiet=True)
        )
        process.communicate(input=src_np.tobytes())
    except ffmpeg.Error as e:
        print(f"ffmpeg error: {e.stderr.decode() if e.stderr else str(e)}")
        # Fallback or re-raise? Re-raising to be safe
        raise e

# Apply the monkey patch
print("Applying direct patch: torchaudio.save -> ffmpeg-python")
torchaudio.save = safe_save

# Validating the patch
try:
    import demucs.audio
    demucs.audio.ta.save = safe_save
    print("Patched demucs.audio.ta.save")
except ImportError:
    pass

if __name__ == "__main__":
    print("Starting Demucs with patched audio saver...")
    from demucs.separate import main
    sys.exit(main())
