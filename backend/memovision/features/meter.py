import warnings

import numpy as np
from future.utils import iteritems
from pyloudnorm import Meter, util


class MemovisionMeter(Meter):

    def __init__(self, rate):
        Meter.__init__(self, rate)

    # override integrated_loudness method of pyloudnorm Meter to get loudness for each frame
    def integrated_loudness(self, data):
        input_data = data.copy()
        util.valid_audio(input_data, self.rate, self.block_size)
        if input_data.ndim == 1:
            input_data = np.reshape(input_data, (input_data.shape[0], 1))
        numChannels = input_data.shape[1]
        numSamples = input_data.shape[0]
        for (filter_class, filter_stage) in iteritems(self._filters):
            for ch in range(numChannels):
                input_data[:, ch] = filter_stage.apply_filter(input_data[:,
                                                                         ch])
        G = [1.0, 1.0, 1.0, 1.41, 1.41]
        T_g = self.block_size
        Gamma_a = -70.0
        overlap = 0.75
        step = 1.0 - overlap
        T = numSamples / self.rate
        numBlocks = int(np.round(((T - T_g) / (T_g * step))) + 1)
        j_range = np.arange(0, numBlocks)
        z = np.zeros(shape=(numChannels, numBlocks))
        for i in range(numChannels):
            for j in j_range:
                l = int(T_g * (j * step) * self.rate)
                u = int(T_g * (j * step + 1) * self.rate)
                z[i, j] = (1.0 / (T_g * self.rate)) * np.sum(
                    np.square(input_data[l:u, i]))
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", category=RuntimeWarning)
            l = [
                -0.691 + 10.0 *
                np.log10(np.sum([G[i] * z[i, j] for i in range(numChannels)]))
                for j in j_range
            ]
        J_g = [j for j, l_j in enumerate(l) if l_j >= Gamma_a]
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", category=RuntimeWarning)
            z_avg_gated = [
                np.mean([z[i, j] for j in J_g]) for i in range(numChannels)
            ]
        Gamma_r = -0.691 + 10.0 * np.log10(
            np.sum([G[i] * z_avg_gated[i] for i in range(numChannels)])) - 10.0
        J_g = [
            j for j, l_j in enumerate(l) if (l_j > Gamma_r and l_j > Gamma_a)
        ]
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", category=RuntimeWarning)
            z_avg_gated = np.nan_to_num(
                np.array([
                    np.mean([z[i, j] for j in J_g]) for i in range(numChannels)
                ]))
        with np.errstate(divide='ignore'):
            LUFS = -0.691 + 10.0 * np.log10(
                np.sum([G[i] * z_avg_gated[i] for i in range(numChannels)]))

        return LUFS, l
