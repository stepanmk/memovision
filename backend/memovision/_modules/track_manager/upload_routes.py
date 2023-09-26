from memovision import db
from memovision.db_models import Session, Track

import os
import subprocess
from flask import request, jsonify, Blueprint
from flask_jwt_extended import jwt_required, current_user
from werkzeug.utils import secure_filename

from memovision.helpers.functions import convert_audio, strip_extension, estimate_tuning
from librosa import load

import numpy as np

upload_routes = Blueprint('upload_routes', __name__)


@upload_routes.route('/pre-upload-check', methods=['POST'])
@jwt_required()
def pre_upload_check():
    req = request.json
    track_exists = False
    filename = secure_filename(req['filename'])
    filename = strip_extension(filename)
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    track = Track.query.filter_by(filename=filename, session_id=session.id).first()
    if track:
        track_exists = True
    return jsonify({'message': 'success', 'exists': track_exists})


@upload_routes.route('/upload-audio-file', methods=['POST'])
@jwt_required()
def upload_audio_file():
    user = current_user
    file = request.files['file']
    filename_with_ext = secure_filename(file.filename)
    filename = strip_extension(filename_with_ext)
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    if file:
        # create separate folder for audio file that is being uplodaded
        os.mkdir(f'./user_uploads/{user.username}/{user.selected_session}/{filename}')
        # create annotations folder
        os.mkdir(f'./user_uploads/{user.username}/{user.selected_session}/{filename}/annotations')
        # create features folder
        os.mkdir(f'./user_uploads/{user.username}/{user.selected_session}/{filename}/features')
        # create filepath
        filepath = f'./user_uploads/{user.username}/{user.selected_session}/{filename}/{filename_with_ext}'
        file.save(filepath)
        # convert to a sr of 22050 Hz via ffmpeg
        path_44 = convert_audio(filepath, sr=44100, mono=False)
        path_22 = convert_audio(filepath, sr=22050, mono=False)
        audiowaveform_path = path_44[:-4] + '.dat'
        audiowaveform_cmd = f'audiowaveform -i {path_44} -o {audiowaveform_path} -b 8 -q -z 32'
        subprocess.call(audiowaveform_cmd, shell=True)
        disk_space = (os.path.getsize(path_44) + os.path.getsize(path_22))
        # compute length in seconds
        audio, sr = load(path_22, sr=22050, mono=True)
        length_sec = len(audio) / sr
        tuning_offset_cents = estimate_tuning(audio, Fs=sr)
        tuning_offset_hz = round(440 * pow(2, tuning_offset_cents / 1200), 1)
        # remove original file
        os.remove(filepath)
        # add track to the database
        track = Track(filename=filename, length_sec=length_sec, path_44=path_44, path_22=path_22,
                      disk_space = disk_space, tuning_offset = tuning_offset_hz, session_id=session.id)
        db.session.add(track)
        db.session.commit()
        return jsonify({'message': 'file succesfully uploaded', 'obj': track.get_data()})
    else:
        return jsonify({'message': 'file could not be uploaded'})


@upload_routes.route('/upload-measures', methods=['POST'])
@jwt_required()
def upload_measures():
    file = request.files['file']
    filename = request.form['filename']
    measures = []
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    track = Track.query.filter_by(filename=filename, session_id=session.id).first()
    track.gt_measures = True
    # only tested with .txt files
    for line in file:
        measures.append(float(line.rsplit()[0]))
    np.savetxt(f'./user_uploads/{current_user.username}/{current_user.selected_session}/{filename}/annotations/gt_measures.txt', measures, fmt='%.5f')
    measures = [0] + measures + [track.length_sec]
    np.save(f'./user_uploads/{current_user.username}/{current_user.selected_session}/{filename}/annotations/gt_measures.npy', np.array(measures))
    db.session.commit()
    return jsonify({'message': 'measure annotations uploaded'})