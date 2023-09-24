from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from memovision.app_config import Config


db = SQLAlchemy()
bcrypt = Bcrypt()
jwt = JWTManager()
cors = CORS()


def create_app():
    app = Flask(__name__, static_folder='./vue/assets', template_folder='./vue')
    app.config.from_object(Config)

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r'/*': {'origins': '*'}}, supports_credentials=True)

    from memovision.auth.routes import auth
    from memovision.session_selector.routes import session_selector

    from memovision._modules.track_manager.upload_routes import upload_routes
    from memovision._modules.track_manager.setting_routes import setting_routes
    from memovision._modules.track_manager.sync_routes import sync_routes
    from memovision._modules.track_manager.fetch_routes import fetch_routes
    from memovision._modules.track_manager.track_routes import track_routes
    from memovision._modules.track_manager.label_routes import label_routes
    
    from memovision._modules.region_selector.routes import region_selector
    from memovision._modules.interp_player.routes import interp_player

    from memovision.features.dynamics import dynamics
    from memovision.features.rhythm import rhythm

    app.register_blueprint(auth)
    app.register_blueprint(session_selector)
    
    app.register_blueprint(upload_routes)
    app.register_blueprint(setting_routes)
    app.register_blueprint(sync_routes)
    app.register_blueprint(fetch_routes)
    app.register_blueprint(track_routes)
    app.register_blueprint(label_routes)
    app.register_blueprint(region_selector)
    app.register_blueprint(interp_player)

    app.register_blueprint(dynamics)
    app.register_blueprint(rhythm)

    return app