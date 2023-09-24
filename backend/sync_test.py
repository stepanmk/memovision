import numpy as np
import os
from synctoolbox.dtw.mrmsdtw import sync_via_mrmsdtw
from scipy.interpolate import interp1d

print(os.listdir('./'))

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
            act_fun_50 = np.concatenate((np.zeros(pad), act_fun_50, np.zeros(pad)))
        else:
            pad = int(diff / 2)
            act_fun_50 = np.concatenate((np.zeros(pad), act_fun_50, np.zeros(pad)))
            null_to_append = np.array([0])
            act_fun_50 = np.append(act_fun_50, null_to_append)
    return act_fun_50.reshape(1, -1)

ref_chroma = np.load('./user_uploads/stepan/NovaSesna/001_Belcea_1/features/chroma.npy')

ref_onset = np.load('./user_uploads/stepan/NovaSesna/001_Belcea_1/features/act_func.npy')
ref_onset = pad_act_fun(resample_signal(ref_onset), ref_chroma.shape[1])

target_chroma = ref_chroma
target_onset = ref_onset

feature_rate = 50
step_weights = np.array([1.5, 1.5, 2.0])
threshold_rec = 10 ** 6

wp = sync_via_mrmsdtw(f_chroma1=ref_chroma,
                    f_chroma2=target_chroma,
                    f_onset1=ref_onset,
                    f_onset2=target_onset,
                    input_feature_rate=feature_rate,
                    step_weights=step_weights,
                    threshold_rec=threshold_rec,
                    verbose=True)