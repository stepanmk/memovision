from sklearn.preprocessing import StandardScaler
from memovision.classification.mrmr_funcs import f_classif
from memovision._modules.track_manager.label_routes import get_label_data
from flask import jsonify
import numpy as np
import pandas as pd
import functools


def get_per_measure_feature(feature, fpm, method=None):
    if method == 'var':
        per_measure_feature = []
        for i in range(0, len(feature), fpm):
            feature_value = np.var(feature[i: i + fpm])
            per_measure_feature.append(feature_value)
        return np.array(per_measure_feature)
    

def create_relevance_object(relevance, label_name, label_type):
    relevance_sum = 0
    measure_relevance = [] 
    relevance[relevance < 0] = 0
    for i, rel in enumerate(relevance):
        norm_rel = float(1 - np.exp(0.05 * -rel))
        measure_relevance.append({ 
            'measureIdx': i,
            'regionName': f'Measure {i + 1}',
            'relevance': norm_rel,
            'absoluteRelevance': str(rel),
            'type': 'relevantMeasure'
        })
        relevance_sum += norm_rel
    final_relevance = {
        'labelName': label_name,
        'labelType': label_type,
        'relevanceSum': relevance_sum,
        'measureRelevance': measure_relevance
    }
    return final_relevance


def compute_relevance(username, session, feature_name, fpm=None, resampled=False, downsample_method=None, scale=True):
    res_str = ''
    if (resampled): res_str = '_resampled'
    feature_list = []
    filenames = []
    for track in session.tracks:
        feature_path = f'./user_uploads/{username}/{session.name}/{track.filename}/features/{feature_name}{res_str}.npy'
        feature = np.load(feature_path)
        if (resampled): feature = get_per_measure_feature(feature, fpm=fpm, method=downsample_method)
        feature_list.append(np.round(feature, 4))
        filenames.append(track.filename)
    X = np.array(feature_list)
    if scale:
        scaler = StandardScaler(with_mean=True, with_std=True)
        X = scaler.fit_transform(X)
    relevance_func = functools.partial(f_classif, n_jobs=1)
    # compute relevance for each track (1 vs rest)
    one_vs_rest = []
    for i, track in enumerate(session.tracks):
        y = np.zeros(X.shape[0], dtype=np.int64)
        y[i] = 1
        relevance = relevance_func(**{'X': pd.DataFrame(X), 'y': pd.Series(y)})
        one_vs_rest.append(create_relevance_object(relevance, track.filename, 'oneVsRest'))
    # compute relevance according to the custom labels
    label_data = get_label_data(session)
    custom = []
    for label in label_data:
        relevance = relevance_func(**{'X': pd.DataFrame(X), 'y': pd.Series(label['labels'])})
        relevance_object = create_relevance_object(relevance, label['label_name'], 'custom')
        relevance_object['labels'] = label['labels'].astype(bool).tolist()
        custom.append(relevance_object)
    return {'oneVsRest': one_vs_rest, 'custom': custom}