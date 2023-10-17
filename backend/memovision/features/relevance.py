from sklearn.preprocessing import StandardScaler
from memovision.features.mrmr_funcs import f_classif
from memovision._modules.track_manager.label_routes import get_label_data
from flask import jsonify
import numpy as np
import pandas as pd
import functools
import pickle
import os



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


def compute_one_vs_rest(tracks, relevance_func, X):
    one_vs_rest = []
    for i, track in enumerate(tracks):
        y = np.zeros(X.shape[0], dtype=np.int64)
        y[i] = 1
        relevance = relevance_func(**{'X': pd.DataFrame(X), 'y': pd.Series(y)})
        one_vs_rest.append(create_relevance_object(relevance, track.filename, 'oneVsRest'))
    return one_vs_rest


def compute_relevance(username, session, feature_name, fpm=None, downsample_method=None, scale=True):
    feature_list = []
    filenames = []
    for track in session.tracks:
        feature_path = f'./user_uploads/{username}/{session.name}/{track.filename}/features/{feature_name}_measure.npy'
        feature = np.load(feature_path)
        if (fpm > 1): feature = get_per_measure_feature(feature, fpm=fpm, method=downsample_method)
        feature_list.append(np.round(feature, 4))
        filenames.append(track.filename)
    X = np.array(feature_list)
    if scale:
        scaler = StandardScaler(with_mean=True, with_std=True)
        X = scaler.fit_transform(X)
    relevance_func = functools.partial(f_classif, n_jobs=1)
    # compute relevance for each track (one vs rest)
    one_vs_rest = []
    one_vs_rest_path = f'./user_uploads/{username}/{session.name}/relevance/{feature_name}_one_vs_rest.pkl'
    if (os.path.exists(one_vs_rest_path)):
        with open(one_vs_rest_path, 'rb') as f:
            one_vs_rest_file = pickle.load(f)
        if filenames == one_vs_rest_file['filenames']:
            one_vs_rest = one_vs_rest_file['data']
        else:
            one_vs_rest = compute_one_vs_rest(session.tracks, relevance_func, X)
            with open(one_vs_rest_path, 'wb') as f:
                pickle.dump({'data': one_vs_rest, 'filenames': filenames}, f)
    else:
        one_vs_rest = compute_one_vs_rest(session.tracks, relevance_func, X)
        with open(one_vs_rest_path, 'wb') as f:
            pickle.dump({'data': one_vs_rest, 'filenames': filenames}, f)
    # compute relevance according to the custom labels
    label_data = get_label_data(session)
    custom = []
    for label in label_data:
        relevance = relevance_func(**{'X': pd.DataFrame(X), 'y': pd.Series(label['labels'])})
        relevance_object = create_relevance_object(relevance, label['label_name'], 'custom')
        relevance_object['labels'] = label['labels'].astype(bool).tolist()
        custom.append(relevance_object)
    return {'oneVsRest': one_vs_rest, 'custom': custom}