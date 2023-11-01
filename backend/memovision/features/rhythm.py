import numpy as np
from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user, jwt_required
from memovision.db_models import Session, Track
from memovision.features.extractors import compute_duration, compute_tempo
from memovision.features.relevance import compute_relevance
from memovision.features.utils import get_feature_data, load_measures

rhythm = Blueprint('rhythm', __name__)


metadata = [
    {
        'id': 'duration', 
        'name': 'Duration', 
        'units': 's', 
        'fpm': 1, 
        'yMin': 0,
        'yMax': 5, 
        'measureAxis': True,
        'timeAxis': False,
        'relevance': True, 
        'computed': False
    },
    {
        'id': 'tempo', 
        'name': 'Tempo', 
        'units': 'BPM', 
        'fpm': 1, 
        'yMin': 50,
        'yMax': 300, 
        'measureAxis': True,
        'timeAxis': False,
        'relevance': False,
        'computed': False
    },
    {
        'id': 'beatfun', 
        'name': 'Beat tracking act. fun.', 
        'units': '[–]', 
        'fpm': 50,  
        'yMin': 0,
        'yMax': 0.5, 
        'measureAxis': False,
        'timeAxis': True,
        'relevance': False,
        'computed': True
    }
]

time = [
    'beatfun'
]

measure = [
    'duration', 'tempo'
]


@rhythm.route('/feat-names-rhythm', methods=['GET'])
@jwt_required()
def feat_names_rhythm():
    return jsonify({'message': 'success', 'metadata': metadata, 'time': time, 'measure': measure})


@rhythm.route('/duration/<filename>', methods=['GET', 'PUT'])
@jwt_required()
def duration(filename):
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    if(request.method == 'PUT'):
        track = Track.query.filter_by(session_id=session.id, filename=filename).first()
        measures = load_measures(current_user.username, session.name, track.filename, track.gt_measures)
        duration_array = compute_duration(measures)
        np.save(f'./user_uploads/{current_user.username}/{session.name}/{filename}/features/duration_measure.npy', duration_array)
        return jsonify({'message': 'success'})
    else:
        feature_list = get_feature_data(session.tracks, current_user.username, session.name, 'duration', time_axis=False, measure_axis=True)
        if feature_list: relevance = compute_relevance(current_user.username, session, 'duration', fpm=1)
        else: relevance = {}
        return jsonify({'message': 'success', 'featureList': feature_list, 'relevance': relevance})


@rhythm.route('/tempo/<filename>', methods=['GET', 'PUT'])
@jwt_required()
def tempo(filename):
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    if(request.method == 'PUT'):
        track = Track.query.filter_by(session_id=session.id, filename=filename).first()
        measures = load_measures(current_user.username, session.name, track.filename, track.gt_measures)
        tempo_array = compute_tempo(measures)
        np.save(f'./user_uploads/{current_user.username}/{session.name}/{filename}/features/tempo_measure.npy', tempo_array)
        return jsonify({'message': 'success'})
    else:
        feature_list = get_feature_data(session.tracks, current_user.username, session.name, 'tempo', time_axis=False, measure_axis=True)
        return jsonify({'message': 'success', 'featureList': feature_list})


@rhythm.route('/beatfun/<filename>', methods=['GET'])
@jwt_required()
def beatfun(filename):
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    feature_list = get_feature_data(session.tracks, current_user.username, session.name, 'beatfun', time_axis=True, measure_axis=False)
    return jsonify({'message': 'success', 'featureList': feature_list})