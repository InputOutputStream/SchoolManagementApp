# app/__init__.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_migrate import Migrate
from datetime import timedelta
import os

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()

class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    WTF_CSRF_ENABLED = False

# app/__init__.py
def create_app(config_name=None):
    app = Flask(__name__)
    
    if config_name == 'testing':
        app.config.from_object(TestConfig)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Updated database URL to match your setup.sh
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
        'DATABASE_URL', 
        'postgresql://principal:cron@localhost:5432/school'
    )
    
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
    
    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    
    # Enhanced CORS configuration
    CORS(app, 
         origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://192.168.232.171:3000"],
         methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
         allow_headers=[
             'Content-Type', 
             'Authorization', 
             'X-Requested-With', 
             'Cache-Control',
             'Accept',
             'Origin'
         ],
         supports_credentials=True,
         max_age=86400)  # Cache preflight for 24 hours
    
    # Handle preflight requests globally
    @app.before_request
    def handle_preflight():
        from flask import request
        if request.method == "OPTIONS":
            response = app.make_default_options_response()
            headers = response.headers
            headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
            headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
            headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With,Cache-Control,Accept,Origin'
            headers['Access-Control-Allow-Credentials'] = 'true'
            headers['Access-Control-Max-Age'] = '86400'
            return response
    
    # Add CORS headers to all responses
    @app.after_request
    def after_request(response):
        from flask import request
        origin = request.headers.get('Origin')
        if origin and origin in ["http://localhost:3000", "http://127.0.0.1:3000", "http://192.168.232.171:3000"]:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.admin import admin_bp
    from app.routes.teachers import teachers_bp
    from app.routes.students import students_bp
    from app.routes.grades import grades_bp
    from app.routes.reports import reports_bp
    from app.routes.attendance import attendance_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(teachers_bp, url_prefix='/api/students')  # Fixed: was pointing to students_bp
    app.register_blueprint(students_bp, url_prefix='/api/students')
    app.register_blueprint(grades_bp, url_prefix='/api/grades')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    app.register_blueprint(attendance_bp, url_prefix='/api/attendance')
    
    return app