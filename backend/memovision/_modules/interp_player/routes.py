from math import floor

import numpy as np
import scipy
from flask import Blueprint, jsonify
from flask_jwt_extended import current_user, jwt_required
from memovision.db_models import Session, Track
from memovision.features.utils import load_measures

interp_player = Blueprint('interp_player', __name__)


def prepare_positions(positions, measures):
    for m in measures:
        idx = (np.abs(np.array(positions) - m)).argmin()
        positions[idx] = m
    return positions


@interp_player.route('/get-sync-points', methods=['GET'])
@jwt_required()
def sync_points():
    step = 0.05
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    ref_track = Track.query.filter_by(session_id=session.id,
                                      reference=True).first()
    ref_measures = load_measures(current_user.username, session.name,
                                 ref_track.filename, ref_track.gt_measures)
    n_steps_ref = floor(ref_track.length_sec / step)
    ref_positions = prepare_positions(
        [0] + list(np.linspace(step, n_steps_ref * step, n_steps_ref)),
        ref_measures)
    tracks = Track.query.filter_by(session_id=session.id).order_by(
        Track.filename.asc())

    sync_points = []
    lin_axes = []
    for i, track in enumerate(tracks):
        lin_axis = []
        measures = load_measures(current_user.username, session.name,
                                 track.filename, track.gt_measures)
        n_steps = floor(track.length_sec / step)
        positions = prepare_positions(
            [0] + list(np.linspace(step, n_steps * step, n_steps)), measures)
        lin_axis.append(positions)
        wp = np.load(
            f'./user_uploads/{current_user.username}/{current_user.selected_session}/{track.filename}/features/wp.npy'
        )
        target_positions = scipy.interpolate.interp1d(
            wp[0] / 50, wp[1] / 50, kind='linear')(ref_positions)
        target_positions = list(np.clip(target_positions, 0.,
                                        track.length_sec))
        target_positions_backref = scipy.interpolate.interp1d(
            wp[1] / 50, wp[0] / 50, kind='linear')(positions)
        target_positions_backref = list(
            np.clip(target_positions_backref, 0., track.length_sec))
        lin_axis.append(target_positions_backref)
        lin_axes.append(lin_axis)
        if track.reference: target_positions = ref_positions.copy()
        sync_points.append(target_positions)

    return jsonify({'syncPoints': sync_points, 'linAxes': lin_axes})
