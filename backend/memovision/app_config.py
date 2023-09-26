class Config:
    SQLALCHEMY_DATABASE_URI = 'postgresql://postgres:pswd123@localhost/memovision'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = 'jwt_secret_key'
    JWT_TOKEN_LOCATION = 'cookies'
    JWT_COOKIE_SECURE = False