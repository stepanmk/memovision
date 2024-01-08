from memovision import db


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)
    selected_session = db.Column(db.String(512), unique=False, nullable=True)
    available_space = db.Column(db.Float(), unique=False, default=100)
    occupied_space = db.Column(db.Float(), unique=False, default=0)
    permissions = db.Column(db.Integer, unique=False, default=0)
    # settings
    precise_sync = db.Column(db.Boolean, unique=False, default=True)
    # one-to-many relationship with Sessions
    sessions = db.relationship('Session', backref='user', passive_deletes=True)


class Session(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id',
                                                  ondelete='CASCADE'))
    # information about the session
    name = db.Column(db.String(512), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, unique=False, nullable=False)
    last_modified = db.Column(db.DateTime, unique=False, nullable=False)
    # one-to-many relationship with Tracks
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
    # information about the track
    filename = db.Column(db.String(512), unique=False, nullable=False)
    disk_space = db.Column(db.Float(), unique=False, nullable=False)
    length_sec = db.Column(db.Float(), unique=False, nullable=False)
    path_44 = db.Column(db.String(512), unique=True, nullable=False)
    path_22 = db.Column(db.String(512), unique=True, nullable=False)
    tuning_offset = db.Column(db.Float(), unique=False, nullable=True)
    # optional metadata
    year = db.Column(db.String(16), unique=False, nullable=True)
    performer = db.Column(db.String(512), unique=False, nullable=True)
    # sync
    reference = db.Column(db.Boolean, unique=False, default=False)
    chroma = db.Column(db.Boolean, unique=False, default=False)
    act_func = db.Column(db.Boolean, unique=False, default=False)
    sync = db.Column(db.Boolean, unique=False, default=False)
    diff = db.Column(db.Boolean, unique=False, default=False)
    num_bad_regions = db.Column(db.Integer, unique=False)
    gt_measures = db.Column(db.Boolean, unique=False, default=False)
    tf_measures = db.Column(db.Boolean, unique=False, default=False)
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
            #
            'year': self.year,
            'performer': self.performer,
            #
            'sync': self.sync,
            'reference': self.reference,
            'gt_measures': self.gt_measures,
            'tf_measures': self.tf_measures,
            'diff': self.diff,
            'num_bad_regions': self.num_bad_regions
        }
        return data


class TrackLabel(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    track_id = db.Column(db.Integer,
                         db.ForeignKey('track.id', ondelete='CASCADE'))
    track_count = db.Column(db.Integer, unique=False, nullable=False)
    label_name = db.Column(db.String(512), unique=False, nullable=False)
    label_type = db.Column(db.String(512), unique=False, nullable=False)
    label = db.Column(db.Boolean, unique=False, default=False)


class TrackRegion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    track_id = db.Column(db.Integer,
                         db.ForeignKey('track.id', ondelete='CASCADE'))
    region_name = db.Column(db.String(512), unique=False, nullable=False)
    start_time = db.Column(db.Float(), unique=False, nullable=True)
    end_time = db.Column(db.Float(), unique=False, nullable=True)
    start_measure_idx = db.Column(db.Integer(), unique=False, nullable=True)
    end_measure_idx = db.Column(db.Integer(), unique=False, nullable=True)
    length_sec = db.Column(db.Float(), unique=False, nullable=True)


class TimeSignature(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    track_id = db.Column(db.Integer,
                         db.ForeignKey('track.id', ondelete='CASCADE'))
    start_time = db.Column(db.Float(), unique=False, nullable=False)
    end_time = db.Column(db.Float(), unique=False, nullable=False)
    start_measure_idx = db.Column(db.Integer(), unique=False, nullable=True)
    end_measure_idx = db.Column(db.Integer(), unique=False, nullable=True)
    note_count = db.Column(db.Integer(), unique=False, nullable=False)
    note_value = db.Column(db.Integer(), unique=False, nullable=False)
    length_sec = db.Column(db.Float(), unique=False, nullable=True)


class DiffRegion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    track_id = db.Column(db.Integer,
                         db.ForeignKey('track.id', ondelete='CASCADE'))
    start_time_ref = db.Column(db.Float(), unique=False, nullable=True)
    end_time_ref = db.Column(db.Float(), unique=False, nullable=True)
    start_time = db.Column(db.Float(), unique=False, nullable=True)
    end_time = db.Column(db.Float(), unique=False, nullable=True)
