import secrets

from memovision import bcrypt, create_app, db
from memovision.db_models import User


def register_user(username: str, is_admin: bool):
    generated_password = secrets.token_urlsafe(10)
    hashed_password = bcrypt.generate_password_hash(generated_password).decode("utf-8")
    new_user = User(
        username=username, password=hashed_password, is_admin=is_admin
    )
    db.session.add(new_user)
    db.session.commit()
    print(generated_password)


app = create_app()
with app.app_context():
    register_user("stepan", True)
