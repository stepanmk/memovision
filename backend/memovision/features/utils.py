import numpy as np
from scipy import signal


def load_measures(username, session_name, filename, gt_measures):
    if gt_measures:
        measures = np.load(
            f'./user_uploads/{username}/{session_name}/{filename}/annotations/gt_measures.npy'
        )
    else:
        measures = np.load(
            f'./user_uploads/{username}/{session_name}/{filename}/annotations/tf_measures.npy'
        )
    return measures[1:-1]


def get_feature_data(tracks,
                     username,
                     session_name,
                     feature_name,
                     time_axis=False,
                     measure_axis=False,
                     dtype=float):
    feat_list = []
    for track in tracks:
        feat_dict = {'filename': track.filename}
        if time_axis:
            try:
                feat_array = np.load(
                    f'./user_uploads/{username}/{session_name}/{track.filename}/features/{feature_name}.npy'
                )
            except FileNotFoundError:
                feat_array = np.zeros(0)
                continue
            feat_dict['featData'] = list(feat_array.astype(dtype))
        if measure_axis:
            try:
                feat_measure = np.load(
                    f'./user_uploads/{username}/{session_name}/{track.filename}/features/{feature_name}_measure.npy'
                )
            except FileNotFoundError:
                feat_measure = np.zeros(0)
                continue
            feat_dict['featDataMeasure'] = list(feat_measure.astype(dtype))
        feat_list.append(feat_dict)
    return feat_list


def get_segment(len_feature, start_measure, end_measure):
    start_pos = start_measure / len_feature
    end_pos = end_measure / len_feature
    return start_pos, end_pos


def get_resampled_feature(len_y, feature, measures, fps=10):
    output = []
    previous_value = 0
    for start_point, end_point in zip(measures[:-1], measures[1:]):
        try:
            start_percentage, end_percentage = get_segment(
                len_y, start_point, end_point)
            s = feature[int(len(feature) * start_percentage
                            ):int(len(feature) * end_percentage)]
            segment = signal.resample(s, fps)
        except:
            segment = previous_value
        previous_value = segment
        output.extend(segment)
    return output
