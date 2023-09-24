from memovision import db, create_app
from memovision.db_models import User, Track

import os, shutil

app = create_app
with app.app_context():
    all_tracks = Track.query.all()
    for track in all_tracks:
        db.session.delete(track)
    db.session.commit()

    all_users = User.query.all()
    for user in all_users:
        shutil.rmtree(f'./backend/user_uploads/{user.username}')
        os.mkdir(f'./backend/user_uploads/{user.username}')
