import wave
import math
import struct
import os

def create_beep(filename, freq1, freq2, duration, volume=0.5):
    filepath = os.path.join("assets/sounds", filename)
    sample_rate = 44100
    num_samples = int(duration * sample_rate)
    
    with wave.open(filepath, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        
        for i in range(num_samples):
            t = float(i) / sample_rate
            # Simple fade out envelope
            env = max(0, 1.0 - (t / duration))
            # Switch freq halfway
            f = freq1 if t < (duration / 2) else freq2
            value = int(volume * env * 32767.0 * math.sin(2.0 * math.pi * f * t))
            data = struct.pack('<h', value)
            wav_file.writeframesraw(data)

def create_noise(filename, duration, volume=0.5):
    import random
    filepath = os.path.join("assets/sounds", filename)
    sample_rate = 44100
    num_samples = int(duration * sample_rate)
    
    with wave.open(filepath, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        
        for i in range(num_samples):
            t = float(i) / sample_rate
            env = max(0, 1.0 - (t / duration))
            value = int(volume * env * 32767.0 * random.uniform(-1, 1))
            data = struct.pack('<h', value)
            wav_file.writeframesraw(data)

def create_ambient(filename, duration, volume=0.2):
    filepath = os.path.join("assets/sounds", filename)
    sample_rate = 44100
    num_samples = int(duration * sample_rate)
    
    with wave.open(filepath, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        
        for i in range(num_samples):
            t = float(i) / sample_rate
            # LFO modulated drone
            f = 130.81 + (math.sin(t * 0.5) * 10) 
            value = int(volume * 32767.0 * math.sin(2.0 * math.pi * f * t))
            data = struct.pack('<h', value)
            wav_file.writeframesraw(data)

# Generate files to perfectly match checklist intent
create_ambient("background.wav", 10.0)
create_beep("catch.wav", 523.25, 523.25, 0.2)
create_beep("success.wav", 523.25, 659.25, 0.4)
create_noise("error.wav", 0.4)
create_beep("complete.wav", 440, 880, 1.0)

print("Generated audio files in assets/sounds/")
