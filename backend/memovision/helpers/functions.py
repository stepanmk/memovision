import os
import subprocess
import sys
from math import floor

import numpy as np
import scipy
from madmom.audio.signal import FramedSignalProcessor, SignalProcessor
from madmom.audio.spectrogram import (FilteredSpectrogramProcessor,
                                      LogarithmicSpectrogramProcessor)
from madmom.audio.stft import ShortTimeFourierTransformProcessor
from madmom.processors import SequentialProcessor
from scipy.interpolate import interp1d
from synctoolbox.dtw.mrmsdtw import sync_via_mrmsdtw
from synctoolbox.dtw.utils import (compute_optimal_chroma_shift,
                                   shift_chroma_vectors)
from synctoolbox.feature.chroma import (pitch_to_chroma, quantize_chroma,
                                        quantized_chroma_to_CENS)
from synctoolbox.feature.pitch import audio_to_pitch_features
from synctoolbox.feature.utils import estimate_tuning

feature_rate = 50
step_weights = np.array([1.5, 1.5, 2.0])
threshold_rec = 10**6

# def convert_audio(audio_path, sr=22050, mono=True, db_level=-23):
#     dirname, filename = os.path.split(audio_path)
#     filename_out = dirname + '/' + os.path.splitext(filename)[0] + f'_{sr}.ogg'
#     try:
#         cmd = 'ffmpeg-normalize "{}" -ar {} -t {} -o "{}" -f -q -c:a libvorbis'.format(audio_path,
#                                                                                     sr,
#                                                                                     db_level,
#                                                                                     filename_out)
#         subprocess.call(cmd, shell=True)
#     except IOError:
#         sys.exit(1)
#     return filename_out


def convert_audio(audio_path, sr=22050, mono=True):
    dirname, filename = os.path.split(audio_path)
    filename_out = dirname + '/' + os.path.splitext(filename)[0] + f'_{sr}.ogg'
    try:
        if mono:
            channels = '1'
        else:
            channels = '2'
        cmd = 'ffmpeg -y -loglevel fatal -i "{}" -ac {} -ar {} -vn {} -f f32le -nostdin'.format(
            audio_path, channels, sr, filename_out)
        subprocess.call(cmd, shell=True)
    except IOError:
        sys.exit(1)
    return filename_out


def strip_extension(filename):
    return os.path.splitext(filename)[0]


def get_chroma_features_from_audio(audio,
                                   tuning_offset,
                                   Fs=22050,
                                   feature_rate=50,
                                   verbose=False):
    f_pitch = audio_to_pitch_features(f_audio=audio,
                                      Fs=Fs,
                                      tuning_offset=tuning_offset,
                                      feature_rate=feature_rate,
                                      verbose=verbose)
    f_chroma = pitch_to_chroma(f_pitch=f_pitch)
    f_chroma_quantized = quantize_chroma(f_chroma=f_chroma)
    return f_chroma_quantized


def compute_chroma_from_audio(audio_array, fs=22050):
    tuning_offset = estimate_tuning(audio_array, fs)
    f_chroma = get_chroma_features_from_audio(audio=audio_array,
                                              tuning_offset=tuning_offset)
    return f_chroma, tuning_offset


def compute_dtw_path(ref_chroma,
                     target_chroma,
                     ref_onset=None,
                     target_onset=None,
                     with_onsets=False):
    # compute optimal chroma shift
    opt_chroma_shift = compute_optimal_chroma_shift(
        quantized_chroma_to_CENS(ref_chroma, 201, 50, feature_rate)[0],
        quantized_chroma_to_CENS(target_chroma, 201, 50, feature_rate)[0])
    # shift target chroma
    target_chroma = shift_chroma_vectors(target_chroma, opt_chroma_shift)
    # compute warping path via mrmsdtw
    if with_onsets:
        ref_onset = pad_act_fun(ref_onset, ref_chroma.shape[1])
        target_onset = pad_act_fun(target_onset, target_chroma.shape[1])

        wp = sync_via_mrmsdtw(f_chroma1=ref_chroma,
                              f_chroma2=target_chroma,
                              f_onset1=ref_onset,
                              f_onset2=target_onset,
                              input_feature_rate=feature_rate,
                              step_weights=step_weights,
                              threshold_rec=threshold_rec,
                              verbose=False)

    else:
        wp = sync_via_mrmsdtw(f_chroma1=ref_chroma,
                              f_chroma2=target_chroma,
                              input_feature_rate=feature_rate,
                              step_weights=step_weights,
                              threshold_rec=threshold_rec,
                              verbose=False)
    # return make_path_strictly_monotonic(wp)
    return wp


def transfer_step_annotations(step, ref_duration, target_duration, wp):
    ref_steps = floor(ref_duration / step)
    ref_positions = list(np.linspace(step, ref_steps * step, ref_steps))
    target_steps = list(
        scipy.interpolate.interp1d(wp[0] / 50, wp[1] / 50,
                                   kind='linear')(ref_positions))
    return [0] + target_steps + [target_duration]


def resample_signal(x_in, sr_in=100, sr_out=50, norm=True):
    t_coef_in = np.arange(x_in.shape[0]) / sr_in
    time_in_max_sec = t_coef_in[-1]
    time_max_sec = time_in_max_sec
    n_out = int(np.ceil(time_max_sec * sr_out))
    t_coef_out = np.arange(n_out) / sr_out
    if t_coef_out[-1] > time_in_max_sec:
        x_in = np.append(x_in, [0])
        t_coef_in = np.append(t_coef_in, [t_coef_out[-1]])
    x_out = interp1d(t_coef_in, x_in, kind='linear')(t_coef_out)
    if norm:
        x_max = max(x_out)
        if x_max > 0:
            x_out = x_out / max(x_out)
    return x_out


def pad_act_fun(act_fun_50, chroma_length):
    # paddding to ensure the same length of act function as chroma vectors
    if act_fun_50.size < chroma_length:
        diff = chroma_length - act_fun_50.size
        if diff % 2 == 0:
            pad = int(diff / 2)
            act_fun_50 = np.concatenate(
                (np.zeros(pad), act_fun_50, np.zeros(pad)))
        else:
            pad = int(diff / 2)
            act_fun_50 = np.concatenate(
                (np.zeros(pad), act_fun_50, np.zeros(pad)))
            null_to_append = np.array([0])
            act_fun_50 = np.append(act_fun_50, null_to_append)
    return act_fun_50.reshape(1, -1)


class PreProcessor(SequentialProcessor):

    def __init__(self,
                 frame_size=1024,
                 num_bands=12,
                 log=np.log,
                 add=1e-6,
                 fps=50,
                 sr=22050):
        # resample to a fixed sample rate in order to get always the same number of filter bins
        sig = SignalProcessor(num_channels=1, sample_rate=sr)
        # split audio signal in overlapping frames
        frames = FramedSignalProcessor(frame_size=frame_size, fps=fps)
        # compute STFT
        stft = ShortTimeFourierTransformProcessor()
        # filter the magnitudes
        filt = FilteredSpectrogramProcessor(num_bands=num_bands)
        # scale them logarithmically
        spec = LogarithmicSpectrogramProcessor(log=log, add=add)
        # instantiate a SequentialProcessor
        super(PreProcessor, self).__init__(
            (sig, frames, stft, filt, spec, np.array))
        # safe fps as attribute (needed for quantization of events)
        self.fps = fps
