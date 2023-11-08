from memovision import db
from memovision.db_models import Session

import os
import shutil
from flask import request, jsonify, Blueprint
from flask_jwt_extended import jwt_required, current_user
from datetime import datetime

session_selector = Blueprint('session_selector', __name__)


@session_selector.route('/get-sessions', methods=['GET'])
@jwt_required()
def get_sessions():
    user = current_user
    session_list = Session.get_sessions(user_id=user.id)
    return jsonify({'message': 'success', 'sessions': session_list})


@session_selector.route('/create-session', methods=['POST'])
@jwt_required()
def create_session():
    user = current_user
    req = request.json
    session_name = req['sessionName']
    session_exists = Session.query.filter_by(name=session_name, user=current_user).first()
    if session_exists:
        return jsonify({'message': 'session already exists'})
    else:
        session = Session(name=session_name, user=user, created_at=datetime.now(), last_modified=datetime.now())
        os.mkdir(f'./user_uploads/{user.username}/{session_name}')
        os.mkdir(f'./user_uploads/{user.username}/{session_name}/relevance')
        db.session.add(session)
        db.session.commit()
        return jsonify({'message': 'success'})
    

@session_selector.route('/select-session', methods=['POST'])
@jwt_required()
def select_session():
    user = current_user
    req = request.json
    session_name = req['sessionName']
    user.selected_session = session_name
    db.session.commit()
    return jsonify({'message': 'success'})


@session_selector.route('/delete-session', methods=['POST'])
@jwt_required()
def delete_session():
    req = request.json
    session_name = req['sessionName']
    session = Session.query.filter_by(name=session_name, user=current_user).first()
    db.session.delete(session)
    db.session.commit()
    filepath = f'./user_uploads/{current_user.username}/{session_name}/'
    if os.path.exists(filepath):
        shutil.rmtree(filepath)
    return jsonify({'message': 'success'})
