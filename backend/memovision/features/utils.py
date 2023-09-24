import numpy as np
from scipy import signal


def load_measures(username, session_name, filename, gt_measures):
    if gt_measures:
        measures = np.load(f'./user_uploads/{username}/{session_name}/{filename}/annotations/gt_measures.npy')
    else:
        measures = np.load(f'./user_uploads/{username}/{session_name}/{filename}/annotations/tf_measures.npy')
    return measures[1:-1]


def get_feature_data(tracks, username, session_name, feature_name, resampled=False, dtype=float):
    feat_list = []
    for track in tracks:
        try:
            feat_array = np.load(f'./user_uploads/{username}/{session_name}/{track.filename}/features/{feature_name}.npy')
        except FileNotFoundError:
            feat_array = np.zeros(0)
            continue
        feat_dict = {
            'filename': track.filename,
            'featData': list(feat_array.astype(dtype))
        }
        if resampled:
            feat_resampled = np.load(f'./user_uploads/{username}/{session_name}/{track.filename}/features/{feature_name}_resampled.npy')
            feat_dict['featDataResampled'] = list(feat_resampled.astype(dtype))
        feat_list.append(feat_dict)
    return feat_list


def get_segment(len_feature, start_measure, end_measure):
    start_pos = start_measure / len_feature
    end_pos = end_measure / len_feature
    return start_pos, end_pos


def get_resampled_feature(len_y, feature, measures, fps=20):
    measures_start = measures[:-1]
    measures_end = measures[1:]
    output = []
    for start_point, end_point in zip(measures_start, measures_end):
        start_percentage, end_percentage = get_segment(len_y, start_point, end_point)
        s = feature[int(len(feature) * start_percentage):int(len(feature) * end_percentage)]
        segment = signal.resample(s, fps)
        output.extend(segment)
    return output


# def get_xlimit_measures(relative_measures, region):
#     return [relative_measures[region[0]], relative_measures[region[-1] + 1]]


# def get_xlimit_time(len_feature, region_start, region_end):
#     x_start = int(len_feature * region_start)
#     x_end = int(len_feature * region_end)

#     return [x_start, x_end]

# def get_measures_steps(measures, fps=50):
#     # get relative measures
#     return [(i * fps) - 1 if i > 0 else (i * fps) for i in range(len(measures))]


# def get_measures_from_region(measures, region):
#     # get measures inside regions
#     return [measure for measure in measures if region[0] < measure < region[-1]]


# def get_measures_idx_from_region(measures, region):
#     # get measures indexes inside regions
#     return [np.where(measures == measure)[0][0] for measure in measures if region[0] < measure < region[-1]]