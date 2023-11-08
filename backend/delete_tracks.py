import os
import shutil

from memovision.db_models import Track, User

from memovision import create_app, db

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
