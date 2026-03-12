import os
import secrets
import shutil
import string
from pathlib import Path

from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user, jwt_required

from memovision import bcrypt, db
from memovision.db_models import User

admin = Blueprint('admin', __name__)


USER_UPLOADS_DIR = Path('./user_uploads').resolve()


def admin_required():
    return current_user is not None and bool(current_user.is_admin)


def generate_password(length=12):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def bytes_to_mb(value):
    return round(value / (1024 * 1024), 2)


def get_disk_space_info(path: Path):
    """
    Cross-platform disk usage info for the filesystem containing `path`.
    Works on Linux and Windows.
    """
    path.mkdir(parents=True, exist_ok=True)
    usage = shutil.disk_usage(path)

    return {
        'path': str(path),
        'total_bytes': usage.total,
        'used_bytes': usage.used,
        'free_bytes': usage.free,
        'total_mb': bytes_to_mb(usage.total),
        'used_mb': bytes_to_mb(usage.used),
        'free_mb': bytes_to_mb(usage.free),
        'total_gb': round(usage.total / (1024 ** 3), 2),
        'used_gb': round(usage.used / (1024 ** 3), 2),
        'free_gb': round(usage.free / (1024 ** 3), 2),
    }


def serialize_user(user):
    remaining_quota = max(float(user.available_space or 0) - float(user.occupied_space or 0), 0)

    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'selected_session': user.selected_session,
        'available_space': user.available_space,
        'occupied_space': user.occupied_space,
        'remaining_quota': remaining_quota,
        'is_admin': user.is_admin,
        'precise_sync': user.precise_sync,
    }


@admin.route('/admin/users', methods=['GET'])
@jwt_required()
def get_users():
    if not admin_required():
        return jsonify({'message': 'forbidden'}), 403

    users = User.query.order_by(User.username.asc()).all()
    disk_info = get_disk_space_info(USER_UPLOADS_DIR)

    total_user_quota_mb = sum(float(user.available_space or 0) for user in users)
    total_user_occupied_mb = sum(float(user.occupied_space or 0) for user in users)

    return jsonify({
        'users': [serialize_user(user) for user in users],
        'storage': {
            'disk': disk_info,
            'user_quota_total_mb': round(total_user_quota_mb, 2),
            'user_occupied_total_mb': round(total_user_occupied_mb, 2),
            'user_quota_remaining_mb': round(max(total_user_quota_mb - total_user_occupied_mb, 0), 2),
        }
    }), 200


@admin.route('/admin/users/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    if not admin_required():
        return jsonify({'message': 'forbidden'}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'user not found'}), 404

    return jsonify({'user': serialize_user(user)}), 200


@admin.route('/admin/users', methods=['POST'])
@jwt_required()
def create_user():
    if not admin_required():
        return jsonify({'message': 'forbidden'}), 403

    username = request.json.get('username', '').strip()
    email = request.json.get('email', None)
    is_admin = bool(request.json.get('is_admin', False))
    available_space = request.json.get('available_space', 512)
    precise_sync = bool(request.json.get('precise_sync', True))
    selected_session = request.json.get('selected_session', '')

    if email is not None:
        email = email.strip()
        if email == '':
            email = None

    if not username:
        return jsonify({'message': 'username is required'}), 400

    existing_username = User.query.filter_by(username=username).first()
    if existing_username:
        return jsonify({'message': 'username already exists'}), 400

    if email:
        existing_email = User.query.filter_by(email=email).first()
        if existing_email:
            return jsonify({'message': 'email already exists'}), 400

    try:
        available_space = float(available_space)
    except (TypeError, ValueError):
        return jsonify({'message': 'available_space must be a number'}), 400

    plain_password = generate_password(12)
    hashed_password = bcrypt.generate_password_hash(plain_password).decode('utf-8')

    new_user = User(
        username=username,
        email=email,
        password=hashed_password,
        selected_session=selected_session,
        available_space=available_space,
        occupied_space=0,
        is_admin=is_admin,
        precise_sync=precise_sync
    )

    db.session.add(new_user)
    db.session.commit()

    try:
        (USER_UPLOADS_DIR / username).mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

    return jsonify({
        'message': 'user created',
        'user': serialize_user(new_user),
        'password': plain_password
    }), 201


@admin.route('/admin/users/<int:user_id>', methods=['PATCH'])
@jwt_required()
def update_user(user_id):
    if not admin_required():
        return jsonify({'message': 'forbidden'}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'user not found'}), 404

    if 'username' in request.json:
        username = str(request.json.get('username', '')).strip()
        if not username:
            return jsonify({'message': 'username is required'}), 400

        existing_username = User.query.filter(
            User.username == username,
            User.id != user.id
        ).first()
        if existing_username:
            return jsonify({'message': 'username already exists'}), 400

        old_username = user.username
        user.username = username

        if old_username != username:
            old_path = USER_UPLOADS_DIR / old_username
            new_path = USER_UPLOADS_DIR / username
            try:
                if old_path.exists() and not new_path.exists():
                    old_path.rename(new_path)
                elif not new_path.exists():
                    new_path.mkdir(parents=True, exist_ok=True)
            except Exception:
                pass

    if 'email' in request.json:
        email = request.json.get('email', None)
        if email is not None:
            email = email.strip()
            if email == '':
                email = None

        if email:
            existing_email = User.query.filter(
                User.email == email,
                User.id != user.id
            ).first()
            if existing_email:
                return jsonify({'message': 'email already exists'}), 400

        user.email = email

    if 'available_space' in request.json:
        try:
            user.available_space = float(request.json['available_space'])
        except (TypeError, ValueError):
            return jsonify({'message': 'available_space must be a number'}), 400

    if 'occupied_space' in request.json:
        try:
            user.occupied_space = float(request.json['occupied_space'])
        except (TypeError, ValueError):
            return jsonify({'message': 'occupied_space must be a number'}), 400

    if 'is_admin' in request.json:
        user.is_admin = bool(request.json['is_admin'])

    if 'precise_sync' in request.json:
        user.precise_sync = bool(request.json['precise_sync'])

    if 'selected_session' in request.json:
        user.selected_session = request.json.get('selected_session', '')

    db.session.commit()

    return jsonify({
        'message': 'user updated',
        'user': serialize_user(user)
    }), 200


@admin.route('/admin/users/<int:user_id>/reset-password', methods=['POST'])
@jwt_required()
def reset_password(user_id):
    if not admin_required():
        return jsonify({'message': 'forbidden'}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'user not found'}), 404

    plain_password = generate_password(12)
    user.password = bcrypt.generate_password_hash(plain_password).decode('utf-8')
    db.session.commit()

    return jsonify({
        'message': 'password reset successful',
        'username': user.username,
        'password': plain_password
    }), 200


@admin.route('/admin/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    if not admin_required():
        return jsonify({'message': 'forbidden'}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'user not found'}), 404

    if user.id == current_user.id:
        return jsonify({'message': 'cannot delete currently logged in admin'}), 400

    username = user.username
    user_folder = (USER_UPLOADS_DIR / username).resolve()

    # extra safety: only allow deletion inside USER_UPLOADS_DIR
    try:
        user_folder.relative_to(USER_UPLOADS_DIR)
    except ValueError:
        return jsonify({'message': 'invalid user folder path'}), 400

    db.session.delete(user)
    db.session.commit()

    folder_deleted = False
    folder_delete_error = None

    try:
        if user_folder.exists() and user_folder.is_dir():
            shutil.rmtree(user_folder)
            folder_deleted = True
    except Exception as e:
        folder_delete_error = str(e)

    response = {
        'message': 'user deleted',
        'folder_deleted': folder_deleted,
    }

    if folder_delete_error is not None:
        response['folder_delete_error'] = folder_delete_error

    return jsonify(response), 200