from memovision.db_models import Session, Track
from memovision.features.extractors import compute_duration, compute_tempo
from memovision.features.utils import load_measures, get_feature_data
from memovision.features.relevance import compute_relevance
from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user, jwt_required
import numpy as np


rhythm = Blueprint('rhythm', __name__)


feature_list = [
    {
        'id': 'duration', 
        'name': 'Measure duration', 
        'units': 's', 
        'fpm': 1, 
        'resampled': False,
        'relevance': True, 
        'computed': False
    },
    {
        'id': 'tempo', 
        'name': 'Tempo', 
        'units': 'BPM', 
        'fpm': 1, 
        'resampled': False,
        'relevance': False,
        'computed': False
    }
]


@rhythm.route('/feat-names-rhythm', methods=['GET'])
@jwt_required()
def feat_names_rhythm():
    return jsonify({'message': 'success', 'featureList': feature_list})


@rhythm.route('/duration/<filename>', methods=['GET', 'PUT'])
@jwt_required()
def duration(filename):
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    if(request.method == 'PUT'):
        track = Track.query.filter_by(session_id=session.id, filename=filename).first()
        measures = load_measures(current_user.username, session.name, track.filename, track.gt_measures)
        duration_array = compute_duration(measures)
        np.save(f'./user_uploads/{current_user.username}/{session.name}/{filename}/features/duration.npy', duration_array)
        return jsonify({'message': 'success'})
    else:
        feature_list = get_feature_data(session.tracks, current_user.username, session.name, 'duration', resampled=False)
        if feature_list: relevance = compute_relevance(current_user.username, session, 'duration')
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
        np.save(f'./user_uploads/{current_user.username}/{session.name}/{filename}/features/tempo.npy', tempo_array)
        return jsonify({'message': 'success'})
    else:
        feature_list = get_feature_data(session.tracks, current_user.username, session.name, 'tempo', resampled=False)
        return jsonify({'message': 'success', 'featureList': feature_list})
