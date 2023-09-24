from memovision import db
from flask import request, jsonify, Blueprint
from flask_jwt_extended import jwt_required, current_user

setting_routes = Blueprint('setting_routes', __name__)


@setting_routes.route('/set-precise-sync', methods=['PUT'])
@jwt_required()
def set_precise_sync():
    req = request.json
    current_user.precise_sync = req['preciseSync']
    db.session.commit()
    return jsonify({'message': 'success'})