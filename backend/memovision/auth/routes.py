
import re
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
# current user is a global variable, which can be accessed by all routes guarded by jwt
# jwt auth
from flask_jwt_extended import (create_access_token, current_user, get_jwt,
                                jwt_required, set_access_cookies,
                                unset_jwt_cookies, verify_jwt_in_request)

from memovision import bcrypt, db, jwt
from memovision.db_models import User

auth = Blueprint('auth', __name__)

USERNAME_RE = re.compile(r"^[A-Za-z0-9._-]{3,64}$")

# if the jwt is about to expire, add a new one to a given request response
@auth.after_request
def refresh_expiring_jwts(response):
    try:
        exp_timestamp = get_jwt()['exp']
        now = datetime.now()
        target_timestamp = datetime.timestamp(now + timedelta(minutes=10))
        # print(datetime.fromtimestamp(target_timestamp), datetime.fromtimestamp(exp_timestamp))
        if target_timestamp > exp_timestamp:
            access_token = create_access_token(
                identity=current_user, expires_delta=timedelta(minutes=20))
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
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({'message': 'invalid request body'}), 400

    username = data.get('username')
    password = data.get('password')

    if not isinstance(username, str) or not isinstance(password, str):
        return jsonify({'message': 'invalid credentials format'}), 400

    username = username.strip()

    if not username or not password:
        return jsonify({'message': 'username and password are required'}), 400

    if len(username) > 64 or len(password) > 128:
        return jsonify({'message': 'input too long'}), 400

    if '\x00' in username or '\x00' in password:
        return jsonify({'message': 'invalid characters'}), 400

    if any(ord(c) < 32 or ord(c) == 127 for c in username):
        return jsonify({'message': 'invalid characters'}), 400

    if any(ord(c) < 32 or ord(c) == 127 for c in password):
        return jsonify({'message': 'invalid characters'}), 400

    if not USERNAME_RE.fullmatch(username):
        return jsonify({'message': 'invalid username format'}), 400

    user = User.query.filter_by(username=username).first()

    if not user:
        return jsonify({'message': 'invalid username or password'}), 401

    pw_correct = bcrypt.check_password_hash(user.password, password)
    if not pw_correct:
        return jsonify({'message': 'invalid username or password'}), 401

    response = jsonify({'message': 'login successful'})
    access_token = create_access_token(
        identity=user,
        expires_delta=timedelta(hours=12),
    )
    set_access_cookies(
        response=response,
        encoded_access_token=access_token,
    )
    return response, 200


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
        return jsonify({
            'valid': True,
            'username': current_user.username,
            'selectedSession': current_user.selected_session,
            'preciseSync': current_user.precise_sync,
            'isAdmin': current_user.is_admin,
            'exp': datetime.fromtimestamp(t)
        })
    else:
        return jsonify({'valid': False})


# @auth.route('/register', methods=['POST'])
# def register():
#     username_exists = validate_username(request.json['username'])
#     email_exists = validate_email(request.json['email'])
#     if username_exists or email_exists:
#         if username_exists and email_exists:
#             return jsonify({'message': 'email and username already exist'})
#         elif username_exists:
#             return jsonify({'message': 'username already exists'})
#         elif email_exists:
#             return jsonify({'message': 'email already exists'})
#     else:
#         hashed_password = bcrypt.generate_password_hash(
#             request.json['password']).decode('utf-8')
#         new_user = User(username=request.json['username'],
#                         email=request.json['email'],
#                         password=hashed_password)
#         db.session.add(new_user)
#         db.session.commit()
#         # create folder for audio file uploads
#         username = request.json['username']
#         try:
#             os.mkdir(f'./user_uploads/{username}')
#         except:
#             IOError
#         return jsonify({'message': 'registration successful'})
