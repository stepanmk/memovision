import librosa
import numpy as np
from memovision.features.meter import MemovisionMeter


def compute_rms(y, frame_length=1024, hop_length=256):
    rms = librosa.feature.rms(y=y,
                              frame_length=frame_length,
                              hop_length=hop_length)[0]
    return rms


def compute_loudness(y, sr):
    meter = MemovisionMeter(sr)
    lufs, loudness = meter.integrated_loudness(y)
    print(type(loudness))
    loudness = np.nan_to_num(loudness, neginf=-100)
    return loudness


def compute_duration(measures):
    duration = measures[1:] - measures[:-1]
    return duration


def compute_tempo(measures, time_signatures=None):
    duration = compute_duration(measures)
    duration[duration == 0] = 5
    tempo = 4 * 60 / duration
    if time_signatures:
        for ts in time_signatures:
            tempo[ts.start_measure_idx:ts.end_measure_idx +
                  1] = ts.note_count * 60 / duration[ts.start_measure_idx:ts.
                                                     end_measure_idx + 1]
    return tempo
