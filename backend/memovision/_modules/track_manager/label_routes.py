import numpy as np
import pandas as pd
from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user, jwt_required
from memovision.db_models import Session, Track, TrackLabel
from werkzeug.utils import secure_filename

from memovision import db

label_routes = Blueprint('label_routes', __name__)


def track_label_names(session):
    label_names = []
    for track in session.tracks:
        for label in track.labels:
            label_names.append(label.label_name)
    return (sorted(list(set(label_names))))


def get_label_data(session):
    label_names = track_label_names(session)
    label_data = []
    for label_name in label_names:
        single_label_data = []
        for track in session.tracks:
            label = TrackLabel.query.filter_by(track=track,
                                               label_name=label_name).first()
            single_label_data.append(label.label)
        label_data.append({
            'label_name': label_name,
            'labels': np.array(single_label_data, dtype=int)
        })
    return label_data


@label_routes.route('/save-label', methods=['PUT'])
@jwt_required()
def save_label():
    req = request.json
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    for i, track in enumerate(session.tracks):
        label = TrackLabel(track_count=len(session.tracks),
                           label_name=req['labelName'],
                           label_type=req['labelType'],
                           label=req['labels'][i],
                           track=track)

        db.session.add(label)
    db.session.commit()
    return jsonify({'message': 'success'})


@label_routes.route('/edit-label', methods=['PUT'])
@jwt_required()
def edit_label():
    req = request.json
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    for i, track in enumerate(session.tracks):
        label_to_edit = TrackLabel.query.filter_by(
            track=track, label_name=req['labelName']).first()
        label_to_edit.label_name = req['newLabelName']
        label_to_edit.label = req['labels'][i]
    db.session.commit()
    return jsonify({'message': 'success'})


@label_routes.route('/delete-label/<label_name>', methods=['DELETE'])
@jwt_required()
def delete_label(label_name):
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    for track in session.tracks:
        label_to_delete = TrackLabel.query.filter_by(
            track=track, label_name=label_name).first()
        db.session.delete(label_to_delete)
    db.session.commit()
    return jsonify({'message': 'success'})


@label_routes.route('/get-label/<label_name>', methods=['GET'])
@jwt_required()
def get_label(label_name):
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    label_data = []
    for track in session.tracks:
        label = TrackLabel.query.filter_by(track=track,
                                           label_name=label_name).first()
        label_data.append(label.label)
    return jsonify({'message': 'success', 'labelData': label_data})


@label_routes.route('/get-label-names', methods=['GET'])
@jwt_required()
def get_labels_names():
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    return jsonify({
        'message': 'success',
        'labelNames': track_label_names(session)
    })


@label_routes.route('/check-labels', methods=['PUT'])
@jwt_required()
def check_labels():
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    label_names = []
    label_counts = []
    if len(session.tracks) > 0:
        for track in session.tracks:
            label_counts.append(len(track.labels))
            if len(track.labels) > 0:
                for label in track.labels:
                    label_names.append(label.label_name)
    label_names = list(set(label_names))
    for i, count in enumerate(label_counts):
        track = session.tracks[i]
        if count == 0:
            for label_name in label_names:
                label = TrackLabel(track_count=len(session.tracks),
                                   label_name=label_name,
                                   label_type='custom',
                                   label=False,
                                   track=track)
                db.session.add(label)
        else:
            for label_name in label_names:
                label_to_edit = TrackLabel.query.filter_by(
                    track=track, label_name=label_name).first()
                label_to_edit.track_count = len(session.tracks)
    db.session.commit()
    return jsonify({'message': 'success'})


@label_routes.route('/upload-labels', methods=['POST'])
@jwt_required()
def upload_labels():
    file = request.files['file']
    filename = file.filename
    if filename.endswith('.csv'):
        df = pd.read_csv(file)
    elif filename.endswith('.xlsx') or filename.endswith('.xls'):
        df = pd.read_excel(file)
    else:
        return jsonify({'message': 'wrong extension'})
    col_names = df.keys().to_list()
    if col_names[0] == 'filename':
        session = Session.query.filter_by(name=current_user.selected_session,
                                          user=current_user).first()
        # ekelhaft
        for _, row in df.iterrows():
            row_dict = row.to_dict()
            track = Track.query.filter_by(
                filename=secure_filename(row_dict['filename'])).first()
            if track:
                for j in range(1, len(col_names)):
                    label_value = row_dict[col_names[j]]
                    if label_value == 'M': label_value = False
                    elif label_value == 'F': label_value = True
                    elif label_value == 0: label_value = False
                    elif label_value == 1: label_value = True
                    label_exists = TrackLabel.query.filter_by(
                        track_count=len(session.tracks),
                        label_name=col_names[j],
                        label_type='custom',
                        label=label_value,
                        track=track).first()
                    if not label_exists:
                        label = TrackLabel(track_count=len(session.tracks),
                                           label_name=col_names[j],
                                           label_type='custom',
                                           label=label_value,
                                           track=track)
                        db.session.add(label)
    db.session.commit()
    return jsonify({'message': 'metadata uploaded'})
