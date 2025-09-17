from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity, create_refresh_token
from app.models.User import User
from app.models.Student import Student
from app.services.AuthService import AuthService
from app.utils.decorators import log_action
from app import db
from datetime import datetime, timedelta
import secrets
import string
import logging

logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
@log_action('LOGIN')
def login():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    logger.info(f"Login attempt for email: {email}")
    
    if not email or not password:
        logger.warning(f"Login failed - missing credentials for email: {email}")
        return jsonify({'message': 'Email and password required'}), 400
    
    try:
        user = User.query.filter_by(email=email).first()
        
        if not user:
            logger.warning(f"Login failed - user not found for email: {email}")
            return jsonify({'message': 'Invalid credentials'}), 401
        
        if not user.check_password(password):
            logger.warning(f"Login failed - invalid password for email: {email}")
            return jsonify({'message': 'Invalid credentials'}), 401
        
        if not user.is_active:
            logger.warning(f"Login failed - inactive user for email: {email}")
            return jsonify({'message': 'Account is deactivated'}), 401
        
        access_token = create_access_token(
            identity=user.id,
            additional_claims={'email': user.email, 'role': user.role}
        )
        refresh_token = create_refresh_token(identity=user.id)
        
        user_data = user.to_dict()
        
        response_data = {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user_data
        }
        
        logger.info(f"Login successful for user {user.id} ({email}) - Role: {user.role}")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Login error for email {email}: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        profile_data = user.to_dict()
        
        # Add role-specific data
        if user.role == 'student' and user.student_profile:
            profile_data['student_profile'] = user.student_profile.to_dict()
        elif user.role in ['teacher', 'admin'] and user.teacher_profile:
            profile_data['teacher_profile'] = user.teacher_profile.to_dict()
        
        return jsonify(profile_data)
    except Exception as e:
        logger.error(f"Profile retrieval error: {str(e)}")
        return jsonify({'message': 'Profile retrieval failed'}), 500
