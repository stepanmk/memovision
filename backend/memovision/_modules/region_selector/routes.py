import json

from flask import Blueprint, jsonify, request, send_from_directory
from flask_jwt_extended import current_user, jwt_required
from memovision.db_models import Session, TimeSignature, Track, TrackRegion

from memovision import db

region_selector = Blueprint('region_selector', __name__)


@region_selector.route('/save-region', methods=['POST'])
@jwt_required()
def save_region():
    req = request.json
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    ref_track = Track.query.filter_by(reference=True,
                                      session_id=session.id).first()
    region = TrackRegion(region_name=req['regionName'],
                         start_time=req['startTime'],
                         end_time=req['endTime'],
                         start_measure_idx=req['startMeasureIdx'],
                         end_measure_idx=req['endMeasureIdx'],
                         length_sec=req['lengthSec'],
                         track=ref_track)
    db.session.add(region)
    db.session.commit()
    return jsonify('success')


@region_selector.route('/save-time-signature', methods=['POST'])
@jwt_required()
def save_time_signature():
    req = request.json
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    ref_track = Track.query.filter_by(reference=True,
                                      session_id=session.id).first()
    ts = TimeSignature(start_time=req['startTime'],
                       end_time=req['endTime'],
                       start_measure_idx=req['startMeasureIdx'],
                       end_measure_idx=req['endMeasureIdx'],
                       note_count=req['noteCount'],
                       note_value=req['noteValue'],
                       length_sec=req['lengthSec'],
                       track=ref_track)
    db.session.add(ts)
    db.session.commit()
    return jsonify('success')


@region_selector.route('/delete-all-regions', methods=['DELETE'])
@jwt_required()
def delete_all_regions():
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    ref_track = Track.query.filter_by(reference=True,
                                      session_id=session.id).first()
    for region in ref_track.regions:
        db.session.delete(region)
    db.session.commit()
    return jsonify('success')


@region_selector.route('/get-all-regions', methods=['GET'])
@jwt_required()
def get_all_regions():
    regs = []
    time_sigs = []
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    ref_track = Track.query.filter_by(reference=True,
                                      session_id=session.id).first()
    regions = TrackRegion.query.filter_by(track=ref_track).order_by(
        TrackRegion.id.asc())
    time_signatures = TimeSignature.query.filter_by(track=ref_track)
    for region in regions:
        regs.append({
            'regionName': region.region_name,
            'startTime': region.start_time,
            'endTime': region.end_time,
            'startMeasureIdx': region.start_measure_idx,
            'endMeasureIdx': region.end_measure_idx,
            'id': region.id,
            'lengthSec': region.length_sec,
            'type': 'selectedRegion',
            'color': '#0000ff'
        })
    for ts in time_signatures:
        time_sigs.append({
            'startTime': ts.start_time,
            'endTime': ts.end_time,
            'startMeasureIdx': ts.start_measure_idx,
            'endMeasureIdx': ts.end_measure_idx,
            'id': ts.id,
            'lengthSec': ts.length_sec,
            'noteCount': ts.note_count,
            'noteValue': ts.note_value,
            'type': 'timeSignature',
            'color': '#0000ff'
        })
    return jsonify({'regions': regs, 'timeSignatures': time_sigs})


@region_selector.route('/save-all-regions', methods=['PUT'])
@jwt_required()
def save_all_regions():
    regions = request.json
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    ref_track = Track.query.filter_by(reference=True,
                                      session_id=session.id).first()
    for region in regions:
        region_to_change = TrackRegion.query.filter_by(
            track=ref_track, id=region['id']).first()
        region_to_change.start_time = region['startTime']
        region_to_change.end_time = region['endTime']
    db.session.commit()
    return jsonify('success')


@region_selector.route('/update-region', methods=['PUT'])
@jwt_required()
def update_region():
    region = request.json
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    ref_track = Track.query.filter_by(reference=True,
                                      session_id=session.id).first()
    region_to_change = TrackRegion.query.filter_by(track=ref_track,
                                                   id=region['id']).first()
    region_to_change.start_time = region['startTime']
    region_to_change.end_time = region['endTime']
    db.session.commit()
    return jsonify('success')


@region_selector.route('/delete-region', methods=['PUT'])
@jwt_required()
def delete_region():
    region = request.json
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    ref_track = Track.query.filter_by(reference=True,
                                      session_id=session.id).first()
    region_to_change = TrackRegion.query.filter_by(track=ref_track,
                                                   id=region['id']).first()
    db.session.delete(region_to_change)
    db.session.commit()
    return jsonify('success')


@region_selector.route('/delete-time-signature', methods=['PUT'])
@jwt_required()
def delete_time_signature():
    region = request.json
    session = Session.query.filter_by(name=current_user.selected_session,
                                      user=current_user).first()
    ref_track = Track.query.filter_by(reference=True,
                                      session_id=session.id).first()
    region_to_change = TimeSignature.query.filter_by(track=ref_track,
                                                     id=region['id']).first()
    db.session.delete(region_to_change)
    db.session.commit()
    return jsonify('success')


@region_selector.route('/get-metronome-click', methods=['GET'])
@jwt_required()
def get_metronome_click():
    metronome_path = './resources/'
    filename = 'click.wav'
    return send_from_directory('.' + metronome_path, filename)
