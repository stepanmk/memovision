from memovision import db


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, unique=True)
    email = db.Column(db.String, unique=True)
    password = db.Column(db.String)
    selected_session = db.Column(db.String)
    available_space = db.Column(db.Float, default=128)
    occupied_space = db.Column(db.Float, default=0)
    permissions = db.Column(db.String, default='generic_user')
    precise_sync = db.Column(db.Boolean, default=True)
    sessions = db.relationship('Session', backref='user', passive_deletes=True)


class Session(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id',
                                                  ondelete='CASCADE'))
    name = db.Column(db.String, unique=True)
    created_at = db.Column(db.DateTime)
    last_modified = db.Column(db.DateTime)
    tracks = db.relationship('Track',
                             backref='session',
                             passive_deletes=True,
                             order_by='Track.filename')

    def get_sessions(user_id):
        sessions = Session.query.filter_by(user_id=user_id).all()
        session_list = []
        for ses in sessions:
            session_list.append({
                'name': ses.name,
                'created_at': ses.created_at,
                'last_modified': ses.last_modified
            })
        return session_list


class Track(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer,
                           db.ForeignKey('session.id', ondelete='CASCADE'))
    filename = db.Column(db.String)
    disk_space = db.Column(db.Float)
    length_sec = db.Column(db.Float)
    path_44 = db.Column(db.String, unique=True)
    path_22 = db.Column(db.String, unique=True)
    tuning_offset = db.Column(db.Float)
    year = db.Column(db.String)
    performer = db.Column(db.String)
    reference = db.Column(db.Boolean, default=False)
    chroma = db.Column(db.Boolean, default=False)
    act_func = db.Column(db.Boolean, default=False)
    sync = db.Column(db.Boolean, default=False)
    diff = db.Column(db.Boolean, default=False)
    gt_measures = db.Column(db.Boolean, default=False)
    tf_measures = db.Column(db.Boolean, default=False)
    num_diff_regions = db.Column(db.Integer)
    regions = db.relationship('TrackRegion',
                              backref='track',
                              passive_deletes=True)
    time_signatures = db.relationship('TimeSignature',
                                      backref='track',
                                      passive_deletes=True)
    diff_regions = db.relationship('DiffRegion',
                                   backref='track',
                                   passive_deletes=True)
    labels = db.relationship('TrackLabel',
                             backref='track',
                             passive_deletes=True,
                             order_by='TrackLabel.label_name')

    def get_data(self):
        data = {
            'filename': self.filename,
            'disk_space': self.disk_space,
            'length_sec': self.length_sec,
            'tuning_offset': self.tuning_offset,
            'year': self.year,
            'performer': self.performer,
            'sync': self.sync,
            'reference': self.reference,
            'gt_measures': self.gt_measures,
            'tf_measures': self.tf_measures,
            'diff': self.diff,
            'num_bad_regions': self.num_diff_regions
        }
        return data


class TrackRegion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    track_id = db.Column(db.Integer,
                         db.ForeignKey('track.id', ondelete='CASCADE'))
    region_name = db.Column(db.String)
    start_time = db.Column(db.Float)
    end_time = db.Column(db.Float)
    start_measure_idx = db.Column(db.Integer)
    end_measure_idx = db.Column(db.Integer)
    length_sec = db.Column(db.Float)


class DiffRegion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    track_id = db.Column(db.Integer,
                         db.ForeignKey('track.id', ondelete='CASCADE'))
    start_time_ref = db.Column(db.Float)
    end_time_ref = db.Column(db.Float)
    start_time = db.Column(db.Float)
    end_time = db.Column(db.Float)


class TimeSignature(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    track_id = db.Column(db.Integer,
                         db.ForeignKey('track.id', ondelete='CASCADE'))
    start_time = db.Column(db.Float)
    end_time = db.Column(db.Float)
    start_measure_idx = db.Column(db.Integer)
    end_measure_idx = db.Column(db.Integer)
    note_count = db.Column(db.Integer)
    note_value = db.Column(db.Integer)
    length_sec = db.Column(db.Float)


class TrackLabel(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    track_id = db.Column(db.Integer,
                         db.ForeignKey('track.id', ondelete='CASCADE'))
    track_count = db.Column(db.Integer)
    label_name = db.Column(db.String)
    label_type = db.Column(db.String)
    label = db.Column(db.Boolean)
