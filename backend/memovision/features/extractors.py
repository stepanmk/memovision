import librosa
import numpy as np
import pyloudnorm as pyln


def compute_rms(y, frame_length=1024, hop_length=256):
    rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
    return rms


def compute_loudness(y, sr):
    meter = pyln.Meter(sr)
    lufs, loudness = meter.integrated_loudness(y)
    loudness = np.nan_to_num(loudness, neginf=-100)
    return loudness


def compute_duration(measures):
    duration = measures[1:] - measures[:-1]
    return duration


def compute_tempo(measures, regions=None):
    duration = compute_duration(measures)
    tempo = 4 * 60 / duration
    if regions:
        for region in regions:
            beats_per_measure = region['beatsPerMeasure']
            start = region['startIdx']
            end = region['endIdx']
            tempo[start: end] = beats_per_measure * 60 / duration[start: end]
    return tempo