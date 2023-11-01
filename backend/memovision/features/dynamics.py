import numpy as np
from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user, jwt_required
from librosa import load
from memovision.db_models import Session, Track
from memovision.features.extractors import compute_loudness, compute_rms
from memovision.features.relevance import compute_relevance
from memovision.features.utils import (get_feature_data, get_resampled_feature,
                                       load_measures)

dynamics = Blueprint('dynamics', __name__)


metadata = [
    {
        'id': 'rms', 
        'name': 'RMS', 
        'units': '[–]',
        'fpm': 10,
        'yMin': 0,
        'yMax': 0.5, 
        'timeAxis': True,
        'measureAxis': True,  
        'relevance': False,
        'computed': False
    },
    {
        'id': 'loudness', 
        'name': 'Loudness', 
        'units': 'LUFS', 
        'fpm': 10,
        'yMin': -80,
        'yMax': 0, 
        'timeAxis': True,
        'measureAxis': True,  
        'relevance': True,
        'computed': False
    }
]

time = [
    'rms', 'loudness'
]

measure = [
    'rms', 'loudness'
]


@dynamics.route('/feat-names-dynamics', methods=['GET'])
@jwt_required()
def feat_names_dynamics():
    return jsonify({'message': 'success', 'metadata': metadata, 'time': time, 'measure': measure})


@dynamics.route('/rms/<filename>', methods=['GET', 'PUT'])
@jwt_required()
def rms(filename):
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    if(request.method == 'PUT'):
        track = Track.query.filter_by(session_id=session.id, filename=filename).first()
        y, sr = load(track.path_22, sr=22050, mono=True)
        rms_array = compute_rms(y)
        np.save(f'./user_uploads/{current_user.username}/{session.name}/{filename}/features/rms.npy', rms_array)
        measures = load_measures(current_user.username, session.name, track.filename, track.gt_measures)
        rms_measure = get_resampled_feature(track.length_sec, rms_array, measures, fps=10)
        np.save(f'./user_uploads/{current_user.username}/{session.name}/{filename}/features/rms_measure.npy', rms_measure)
        return jsonify({'message': 'success'})
    else:
        feature_list = get_feature_data(session.tracks, current_user.username, session.name, 'rms', time_axis=True, measure_axis=True)
        return jsonify({'message': 'success', 'featureList': feature_list})


@dynamics.route('/loudness/<filename>', methods=['GET', 'PUT'])
@jwt_required()
def loudness(filename):
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    if(request.method == 'PUT'):
        track = Track.query.filter_by(session_id=session.id, filename=filename).first()
        y, sr = load(track.path_22, sr=22050, mono=True)
        loudness_array = compute_loudness(y, sr=22050)
        np.save(f'./user_uploads/{current_user.username}/{session.name}/{filename}/features/loudness.npy', loudness_array)
        measures = load_measures(current_user.username, session.name, track.filename, track.gt_measures)
        loudness_measure = get_resampled_feature(track.length_sec, loudness_array, measures, fps=10)
        np.save(f'./user_uploads/{current_user.username}/{session.name}/{filename}/features/loudness_measure.npy', loudness_measure)
        return jsonify({'message': 'success'})
    else:
        feature_list = get_feature_data(session.tracks, current_user.username, session.name, 'loudness', time_axis=True, measure_axis=True)
        if feature_list: relevance = compute_relevance(current_user.username, session, 'loudness', fpm=10, downsample_method='var')
        else: relevance = {}
        return jsonify({'message': 'success', 'featureList': feature_list, 'relevance': relevance})