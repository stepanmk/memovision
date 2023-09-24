from memovision import db, bcrypt, jwt
from memovision.db_models import User

import os
from flask import render_template, request, jsonify, Blueprint

# jwt auth
from flask_jwt_extended import create_access_token
from flask_jwt_extended import set_access_cookies
from flask_jwt_extended import unset_jwt_cookies
from flask_jwt_extended import jwt_required
from flask_jwt_extended import get_jwt

# current user is a global variable, which can be accessed by all routes guarded by jwt
from flask_jwt_extended import current_user
from flask_jwt_extended import verify_jwt_in_request

# time
from datetime import datetime
from datetime import timedelta

auth = Blueprint('auth', __name__)


# catch all the routes from Vue router (client-side routing)
@auth.route('/', defaults={'path': ''})
@auth.route('/<path:path>')
def catch_all(path):
    return render_template('index.html')


# if the jwt is about to expire, add a new one to a given request response
@auth.after_request
def refresh_expiring_jwts(response):
    try:
        exp_timestamp = get_jwt()['exp']
        now = datetime.now()
        target_timestamp = datetime.timestamp(now + timedelta(minutes=10))
        # print(datetime.fromtimestamp(target_timestamp), datetime.fromtimestamp(exp_timestamp))
        if target_timestamp > exp_timestamp:
            access_token = create_access_token(identity=current_user,
                                               expires_delta=timedelta(minutes=20))
            set_access_cookies(response, access_token)
        return response
    except (RuntimeError, KeyError):
        # Case where there is not a valid JWT. Just return the original response
        return response


@jwt.user_identity_loader
def user_identity_lookup(user):
    return user.id


# Register a callback function that loads a user from your database whenever
# a protected route is accessed. This should return any python object on a
# successful lookup, or None if the lookup failed for any reason (for example
# if the user has been deleted from the database).
@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data):
    identity = jwt_data['sub']
    return User.query.filter_by(id=identity).first()


def validate_username(username):
    return User.query.filter_by(username=username).first()


def validate_email(email):
    return User.query.filter_by(email=email).first()


@auth.route('/login', methods=['POST'])
def login():
    username = request.json['username']
    password = request.json['password']
    user = User.query.filter_by(username=username).first()
    if user:
        # check if the password is correct
        pw_correct = bcrypt.check_password_hash(user.password, password)
        if pw_correct:
            response = jsonify({'message': 'login successful'})
            # create access token with user from the db for later identification
            access_token = create_access_token(identity=user, expires_delta=timedelta(hours=12))
            set_access_cookies(response=response, encoded_access_token=access_token)
            return response
        else:
            return jsonify({'message': 'wrong password'})
    else:
        return jsonify({'message': 'user does not exist'})


@auth.route('/logout', methods=['POST'])
def logout():
    response = jsonify({'message': 'logout successful'})
    unset_jwt_cookies(response)
    return response


@auth.route('/login-check', methods=['GET'])
@jwt_required()
def login_check():
    jwt_from_request = verify_jwt_in_request()
    if jwt_from_request is not None:
        t = get_jwt()['exp']
        return jsonify({'valid': True,
                        'username': current_user.username,
                        'selectedSession': current_user.selected_session,
                        'preciseSync': current_user.precise_sync,
                        'exp': datetime.fromtimestamp(t)})
    else:
        return jsonify({'valid': False})


@auth.route('/register', methods=['POST'])
def register():
    username_exists = validate_username(request.json['username'])
    email_exists = validate_email(request.json['email'])
    if username_exists or email_exists:
        if username_exists and email_exists:
            return jsonify({'message': 'email and username already exist'})
        elif username_exists:
            return jsonify({'message': 'username already exists'})
        elif email_exists:
            return jsonify({'message': 'email already exists'})
    else:
        hashed_password = bcrypt.generate_password_hash(request.json['password']).decode('utf-8')
        new_user = User(username=request.json['username'],
                        email=request.json['email'],
                        password=hashed_password)
        db.session.add(new_user)
        db.session.commit()
        # create folder for audio file uploads
        username = request.json['username']
        try:
            os.mkdir(f'./user_uploads/{username}')
        except:
            IOError
        return jsonify({'message': 'registration successful'})
