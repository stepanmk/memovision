import os
import zipfile

import numpy as np
from flask import Blueprint, jsonify, send_from_directory
from flask_jwt_extended import current_user, jwt_required
from memovision.db_models import Session, Track

fetch_routes = Blueprint('fetch_routes', __name__)


@fetch_routes.route('/get-tracks', methods=['GET'])
@jwt_required()
def get_recordings():
    user = current_user
    track_info = []
    session = Session.query.filter_by(name=user.selected_session, user=current_user).first()
    for track in session.tracks:
        track_metadata = track.get_data()
        track_info.append(track_metadata)
    return jsonify({'message': 'success', 'info': track_info})


@fetch_routes.route('/get-measure-data', methods=['GET'])
@jwt_required()
def get_measure_data():
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()    
    measure_data = []
    for track in session.tracks:
        track_measures = {}
        track_measures['filename'] = track.filename
        track_measures['reference'] = track.reference
        if track.gt_measures:
            track_measures['gt_measures'] = list(
                np.load(f'./user_uploads/{current_user.username}/{current_user.selected_session}/{track.filename}/annotations/gt_measures.npy'))
        else:
            track_measures['gt_measures'] = []
        if track.tf_measures:
            track_measures['tf_measures'] = list(
                np.load(f'./user_uploads/{current_user.username}/{current_user.selected_session}/{track.filename}/annotations/tf_measures.npy'))
        else:
            track_measures['tf_measures'] = []
        measure_data.append(track_measures)
    return jsonify({'message': 'success', 'measureData': measure_data})


@fetch_routes.route('/get-audio/<audio_name>', methods=['GET'])
@jwt_required()
def get_audio_data(audio_name):
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    track = Track.query.filter_by(filename=audio_name, session_id=session.id).first()
    track_path, filename = os.path.split(track.path_44)
    return send_from_directory('.' + track_path, filename)


@fetch_routes.route('/get-waveform-data/<audio_name>', methods=['GET'])
@jwt_required()
def get_waveform_data(audio_name):
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    track = Track.query.filter_by(filename=audio_name, session_id=session.id).first()
    path = track.path_44[:-4] + '.dat'
    waveform_path, filename = os.path.split(path)
    return send_from_directory('.' + waveform_path, filename)


@fetch_routes.route('/download-measures', methods=['GET'])
@jwt_required()
def download_measures():
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    tracks = Track.query.filter_by(session_id=session.id).order_by(Track.filename.asc())
    zip_filename = f'./user_uploads/{current_user.username}/{current_user.selected_session}/{session.name}_measures.zip'
    measure_zip = zipfile.ZipFile(zip_filename, 'w')
    for track in tracks:
        if track.gt_measures:
            filename = f'./user_uploads/{current_user.username}/{current_user.selected_session}/{track.filename}/annotations/gt_measures.txt'
            measure_zip.write(filename=filename, arcname=f'{track.filename}_measures.txt')
        else:
            filename = f'./user_uploads/{current_user.username}/{current_user.selected_session}/{track.filename}/annotations/tf_measures.txt'
            measure_zip.write(filename=filename, arcname=f'{track.filename}_measures.txt')
    measure_zip.close()
    path, z_filename = os.path.split(zip_filename)
    return send_from_directory('.' + path, z_filename)