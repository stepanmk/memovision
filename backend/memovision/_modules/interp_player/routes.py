from math import floor

import numpy as np
import scipy
from flask import Blueprint, jsonify
from flask_jwt_extended import current_user, jwt_required
from memovision.db_models import Session, Track
from memovision.features.utils import load_measures

interp_player = Blueprint('interp_player', __name__)


@interp_player.route('/get-sync-points', methods=['GET'])
@jwt_required()
def get_warping_path():
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    ref_track = Track.query.filter_by(session_id=session.id,
                                      reference=True).first()
    all_tracks = Track.query.filter_by(session_id=session.id).order_by(
        Track.filename.asc())
    measures = load_measures(current_user.username, session.name,
                             ref_track.filename, ref_track.gt_measures)
    step = 0.05
    ref_steps = floor(ref_track.length_sec / step)
    ref_positions = [0] + list(np.linspace(step, ref_steps * step, ref_steps))
    for meas in measures:
        idx = (np.abs(np.array(ref_positions) - meas)).argmin()
        ref_positions[idx] = meas
    positions = []
    # target positions in rest of the tracks
    for track in all_tracks:
        if track.sync:
            wp = np.load(
                f'./user_uploads/{current_user.username}/{current_user.selected_session}/{track.filename}/features/wp.npy'
            )
            target_positions = scipy.interpolate.interp1d(
                wp[0] / 50, wp[1] / 50, kind='linear')(ref_positions)
            target_positions = list(
                np.clip(target_positions, 0., track.length_sec))
            if track.reference: target_positions = ref_positions.copy()
            positions.append(target_positions)
    return jsonify(positions)
