from memovision import db, create_app

app = create_app()

with app.app_context():
    db.drop_all()
    db.create_all()
