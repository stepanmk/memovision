import os
import zipfile

import numpy as np
from flask import Blueprint, jsonify, send_from_directory
from flask_jwt_extended import current_user, jwt_required
from memovision.db_models import Session, TimeSignature, Track, TrackRegion

fetch_routes = Blueprint('fetch_routes', __name__)


@fetch_routes.route('/get-tracks', methods=['GET'])
@jwt_required()
def get_recordings():
    user = current_user
    track_info = []
    session = Session.query.filter_by(name=user.selected_session,
                                      user=current_user).first()
    for track in session.tracks:
        track_metadata = track.get_data()
        track_info.append(track_metadata)
    return jsonify({'message': 'success', 'info': track_info})


@fetch_routes.route('/get-measure-data', methods=['GET'])
@jwt_required()
def get_measure_data():
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    measure_data = []
    for track in session.tracks:
        track_measures = {}
        track_measures['filename'] = track.filename
        track_measures['reference'] = track.reference
        if track.gt_measures:
            track_measures['gt_measures'] = list(
                np.load(
                    f'./user_uploads/{current_user.username}/{current_user.selected_session}/{track.filename}/annotations/gt_measures.npy'
                ))
        else:
            track_measures['gt_measures'] = []
        if track.tf_measures:
            track_measures['tf_measures'] = list(
                np.load(
                    f'./user_uploads/{current_user.username}/{current_user.selected_session}/{track.filename}/annotations/tf_measures.npy'
                ))
        else:
            track_measures['tf_measures'] = []
        measure_data.append(track_measures)
    return jsonify({'message': 'success', 'measureData': measure_data})


@fetch_routes.route('/get-audio/<audio_name>', methods=['GET'])
@jwt_required()
def get_audio_data(audio_name):
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    track = Track.query.filter_by(filename=audio_name,
                                  session_id=session.id).first()
    track_path, filename = os.path.split(track.path_44)
    return send_from_directory('.' + track_path, filename)


@fetch_routes.route('/get-waveform-data/<audio_name>', methods=['GET'])
@jwt_required()
def get_waveform_data(audio_name):
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    track = Track.query.filter_by(filename=audio_name,
                                  session_id=session.id).first()
    path = track.path_44[:-4] + '.dat'
    waveform_path, filename = os.path.split(path)
    return send_from_directory('.' + waveform_path, filename)


@fetch_routes.route('/download-measures', methods=['GET'])
@jwt_required()
def download_measures():
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    tracks = Track.query.filter_by(session_id=session.id).order_by(
        Track.filename.asc())
    zip_filename = f'./user_uploads/{current_user.username}/{current_user.selected_session}/{session.name}_measures.zip'
    measure_zip = zipfile.ZipFile(zip_filename, 'w')
    for track in tracks:
        if track.gt_measures:
            filename = f'./user_uploads/{current_user.username}/{current_user.selected_session}/{track.filename}/annotations/gt_measures.txt'
            measure_zip.write(filename=filename,
                              arcname=f'{track.filename}_measures.txt')
        else:
            filename = f'./user_uploads/{current_user.username}/{current_user.selected_session}/{track.filename}/annotations/tf_measures.txt'
            measure_zip.write(filename=filename,
                              arcname=f'{track.filename}_measures.txt')
    measure_zip.close()
    path, z_filename = os.path.split(zip_filename)
    return send_from_directory('.' + path, z_filename)


@fetch_routes.route('/get-diff-regions', methods=['GET'])
@jwt_required()
def get_diff_regions():
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    other_tracks = Track.query.filter_by(session_id=session.id,
                                         reference=False).order_by(
                                             Track.filename.asc())
    diff_regions = []
    for track in other_tracks:
        track_diff_regions = track.diff_regions
        for diff_region in track_diff_regions:
            reg_dict = {
                'regionName': track.filename,
                'startTime': diff_region.start_time_ref,
                'endTime': diff_region.end_time_ref,
                'startTimeTarget': diff_region.start_time,
                'endTimeTarget': diff_region.end_time,
                'type': 'differenceRegion',
                'color': '#ffff00'
            }
            diff_regions.append(reg_dict)
    return jsonify({'diffRegions': diff_regions})


@fetch_routes.route('/get-all-regions', methods=['GET'])
@jwt_required()
def get_all_regions():
    regs = []
    time_sigs = []
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    ref_track = Track.query.filter_by(reference=True,
                                      session_id=session.id).first()
    regions = TrackRegion.query.filter_by(track=ref_track).order_by(
        TrackRegion.id.asc())
    time_signatures = TimeSignature.query.filter_by(track=ref_track)
    for region in regions:
        regs.append({
            'regionName': region.region_name,
            'startTime': region.start_time,
            'endTime': region.end_time,
            'startMeasureIdx': region.start_measure_idx,
            'endMeasureIdx': region.end_measure_idx,
            'id': region.id,
            'lengthSec': region.length_sec,
            'type': 'selectedRegion',
            'color': '#0000ff'
        })
    for ts in time_signatures:
        time_sigs.append({
            'startTime': ts.start_time,
            'endTime': ts.end_time,
            'startMeasureIdx': ts.start_measure_idx,
            'endMeasureIdx': ts.end_measure_idx,
            'id': ts.id,
            'lengthSec': ts.length_sec,
            'noteCount': ts.note_count,
            'noteValue': ts.note_value,
            'type': 'timeSignature',
            'color': '#0000ff'
        })
    return jsonify({'regions': regs, 'timeSignatures': time_sigs})
