from memovision import db
from memovision.db_models import Session, Track

import os
import shutil
from flask import request, jsonify, Blueprint
from flask_jwt_extended import jwt_required, current_user

track_routes = Blueprint('track_routes', __name__)


@track_routes.route('/update-metadata', methods=['PUT'])
@jwt_required()
def update_metadata():
    req = request.json
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    track = Track.query.filter_by(filename=req['filename'], session_id=session.id).first()
    track.year = req['year']
    track.performer = req['performer']
    track.origin = req['origin']
    db.session.commit()
    return jsonify({'message': 'success'})


@track_routes.route('/delete-from-db', methods=['DELETE'])
@jwt_required()
def delete_from_db():
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    filename = request.json['data']
    track = Track.query.filter_by(filename=filename, session_id=session.id).first()
    db.session.delete(track)
    db.session.commit()
    filepath = f'./user_uploads/{current_user.username}/{current_user.selected_session}/{filename}'
    if os.path.exists(filepath):
        shutil.rmtree(filepath)
    return jsonify({'message': f'successfully deleted track: {filename}'})


@track_routes.route('/delete-all-from-db', methods=['DELETE'])
@jwt_required()
def delete_all_from_db():
    session = Session.query.filter_by(name=current_user.selected_session, user=current_user).first()
    tracks = session.tracks
    for track in tracks:
        db.session.delete(track)
    db.session.commit()
    shutil.rmtree(f'./user_uploads/{current_user.username}/{current_user.selected_session}/')
    os.mkdir(f'./user_uploads/{current_user.username}/{current_user.selected_session}/')
    os.mkdir(f'./user_uploads/{current_user.username}/{current_user.selected_session}/relevance')
    return jsonify({'message': 'success'})