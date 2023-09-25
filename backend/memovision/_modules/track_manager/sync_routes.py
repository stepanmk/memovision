from memovision import db
from memovision.db_models import Session, Track, DiffRegion
from memovision.helpers.functions import compute_chroma_from_audio, compute_dtw_path, transfer_step_annotations, PreProcessor
from memovision.duplicate_finder.functions import run_duplicate_finder, run_structure_checker, save_chromaImage

from flask import request, jsonify, Blueprint
from flask_jwt_extended import jwt_required, current_user
from madmom.audio import Signal
from madmom.features.chords import DeepChromaChordRecognitionProcessor
from madmom.audio.chroma import DeepChromaProcessor
from madmom.features.beats import DBNBeatTrackingProcessor
from tensorflow import keras
from librosa import load

import numpy as np
import scipy
import os 

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
beat_tracking_model = keras.models.load_model('./models/simple_tcn_dp_skip_dilations_22_fps50.h5')
sync_routes = Blueprint('sync_routes', __name__)


@sync_routes.route('/select-reference', methods=['PUT'])
@jwt_required()
def select_reference():
    req = request.json
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    for track in session.tracks:
        track.reference = False
    track = Track.query.filter_by(filename=req['filename'], session_id=session.id).first()
    track.reference = req['state']
    db.session.commit()
    return jsonify({'message': 'success'})


@sync_routes.route('/sync-track/<audio_name>', methods=['PUT'])
@jwt_required()
def sync_track(audio_name):
    # target track
    req = request.json
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    target = Track.query.filter_by(filename=audio_name, session_id=session.id).first()
    # if not target.sync:
    target_chroma = np.load(f'./user_uploads/{current_user.username}/{current_user.selected_session}/{target.filename}/features/chroma.npy')
    # reference track
    ref = Track.query.filter_by(reference=True, session_id=session.id).first()
    ref_chroma = np.load(f'./user_uploads/{current_user.username}/{current_user.selected_session}/{ref.filename}/features/chroma.npy')
    # compute warping path
    if req['precise']:
        ref_act_func = np.load(f'./user_uploads/{current_user.username}/{current_user.selected_session}/{ref.filename}/features/act_func.npy')
        target_act_func = np.load(f'./user_uploads/{current_user.username}/{current_user.selected_session}/{target.filename}/features/act_func.npy')
        wp = compute_dtw_path(ref_chroma=ref_chroma, target_chroma=target_chroma, ref_onset=ref_act_func, target_onset=target_act_func, with_onsets=True)
    else:
        wp = compute_dtw_path(ref_chroma=ref_chroma, target_chroma=target_chroma)
    with open(f'./user_uploads/{current_user.username}/{current_user.selected_session}/{target.filename}/features/wp.npy', 'wb') as f:
        np.save(f, wp)
    target.sync = True
    db.session.commit()
    # transfer step annotations
    steps = transfer_step_annotations(10, ref.length_sec, target.length_sec, wp)
    np.savetxt(f'./user_uploads/{current_user.username}/{current_user.selected_session}/{target.filename}/annotations/steps.txt', steps, fmt='%.5f')
    return jsonify({'message': 'success'})


@sync_routes.route('/transfer-measures', methods=['PUT'])
@jwt_required()
def transfer_measures():
    req = request.json
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    target = Track.query.filter_by(filename=req['target'], session_id=session.id).first()
    target_name = target.filename
    # open ref measures
    ref_name = req['reference']
    ref_measures = np.load(
        f'./user_uploads/{current_user.username}/{current_user.selected_session}/{ref_name}/annotations/gt_measures.npy')
    # transfer measures
    wp = np.load(f'./user_uploads/{current_user.username}/{current_user.selected_session}/{target_name}/features/wp.npy')
    target_measures = list(scipy.interpolate.interp1d(wp[0] / 50, wp[1] / 50, kind='linear')(ref_measures))
    target.tf_measures = True
    db.session.commit()
    # save transferred measures
    np.save(f'./user_uploads/{current_user.username}/{current_user.selected_session}/{target_name}/annotations/tf_measures.npy',
            target_measures)
    np.savetxt(f'./user_uploads/{current_user.username}/{current_user.selected_session}/{target_name}/annotations/tf_measures.txt', 
               target_measures[1:-1], fmt='%.5f')
    return jsonify({'message': 'success'})


@sync_routes.route('/find-duplicates', methods=['GET'])
@jwt_required()
def find_duplicates():
    filenames = []
    chroma_paths = []
    img_paths = []
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    for track in session.tracks:
        filenames.append(track.filename)
        chroma_paths.append(f'./user_uploads/{current_user.username}/{current_user.selected_session}/{track.filename}/features/chroma.npy')
        img_paths.append(f'./user_uploads/{current_user.username}/{current_user.selected_session}/{track.filename}/features/chroma.png')
    duplicates = run_duplicate_finder(chromas=chroma_paths, filenames=filenames, img_paths=img_paths)
    return jsonify({'message': 'success', 'duplicates': duplicates})


@sync_routes.route('/check-structure', methods=['GET'])
@jwt_required()
def check_structure():
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    ref_filename = Track.query.filter_by(reference=True, session_id=session.id).first().filename
    other_tracks = Track.query.filter_by(reference=False, session_id=session.id).order_by(Track.filename.asc())
    target_filenames = []
    wps = []
    for track in other_tracks:
        target_filenames.append(track.filename)
        wps.append(f'./user_uploads/{current_user.username}/{current_user.selected_session}/{track.filename}/features/wp.npy')
    diff_recordings, diff_regions_list = run_structure_checker(ref_filename, target_filenames, wps)
    for diff_region in diff_regions_list:
        track = Track.query.filter_by(filename=diff_region['filename'], session_id=session.id).first()
        track.num_bad_regions = len(diff_region['target'])
        track.diff = True
        for i in range(len(diff_region['target'])):
            db_diff_region = DiffRegion(start_time_ref=diff_region['ref'][i][0],
            end_time_ref=diff_region['ref'][i][1],
            start_time=diff_region['target'][i][0],
            end_time=diff_region['target'][i][1],
            track=track)
            db.session.add(db_diff_region)
        db.session.commit()
    return jsonify({'message': 'success', 'diff_regions': diff_regions_list})


@sync_routes.route('/compute-chroma/<audio_name>', methods=['PUT'])
@jwt_required()
def compute_chroma(audio_name):
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    track = Track.query.filter_by(filename=audio_name, session=session).first()
    if not track.chroma:
        chroma_path = f'./user_uploads/{current_user.username}/{current_user.selected_session}/{track.filename}/features/chroma.npy'
        audio, _ = load(track.path_22, mono=True)
        chroma, tuning_offset = compute_chroma_from_audio(audio)
        with open(chroma_path, 'wb') as f:
            np.save(f, chroma)
        save_chromaImage(chroma_path, f'./user_uploads/{current_user.username}/{current_user.selected_session}/{track.filename}/features/chroma.png')    
        chroma_proc = DeepChromaProcessor()
        audio_44, _ = load(track.path_44, mono=True, sr=44100)
        deep_chroma = chroma_proc(audio_44)
        chords_proc = DeepChromaChordRecognitionProcessor()
        chords_path = f'./user_uploads/{current_user.username}/{current_user.selected_session}/{track.filename}/features/chords.txt'
        chords = chords_proc(deep_chroma)
        with open(chords_path, 'wb') as f:
            np.savetxt(f, chords, fmt='%s')
        track.chroma = True
        db.session.commit()
    return jsonify({'message': 'success'})


@sync_routes.route('/compute-act-func/<audio_name>', methods=['PUT'])
@jwt_required()
def compute_act_func(audio_name):
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    track = Track.query.filter_by(filename=audio_name, session=session).first()
    if not track.act_func:
        act_func_path = f'./user_uploads/{current_user.username}/{current_user.selected_session}/{track.filename}/features/act_func.npy'
        audio_data, sr = load(track.path_22, mono=True)
        audio_signal = Signal(audio_data, sr)
        preprocessed = PreProcessor()(audio_signal)
        act_fun = beat_tracking_model(preprocessed[np.newaxis, ..., np.newaxis]).numpy().flatten('C')
        np.save(act_func_path, act_fun)
        track.act_func = True
        dbn_proc = DBNBeatTrackingProcessor(fps=50)
        beats = dbn_proc(act_fun)
        beats_path = f'./user_uploads/{current_user.username}/{current_user.selected_session}/{track.filename}/features/beats.txt'
        np.savetxt(beats_path, beats, fmt='%.10f')
        db.session.commit()
    return jsonify({'message': 'success'})