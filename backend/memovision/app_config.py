import configparser
import os


class Config:
    config = configparser.ConfigParser()
    config.read(os.path.join(os.path.dirname(__file__), "config.ini"))

    db_user = config.get("database", "user")
    db_pass = config.get("database", "password")
    db_host = config.get("database", "host")
    db_name = config.get("database", "name")

    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{db_user}:{db_pass}@{db_host}/{db_name}"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = config.get("jwt", "secret_key")
    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_COOKIE_SECURE = config.getboolean("jwt", "cookie_secure")
    JWT_COOKIE_CSRF_PROTECT = config.getboolean("jwt", "csrf_protect")
