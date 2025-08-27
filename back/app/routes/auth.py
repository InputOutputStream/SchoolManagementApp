# app/routes/auth.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity
from app.models.User import User, UserRole
from app.models.Student import Student
from app.services.AuthService import AuthService
from app.utils.decorators import log_action
from app import db
import secrets
import string

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
@log_action('LOGIN')
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'message': 'Email and password required'}), 400
    
    user = User.query.filter_by(email=email).first()
    
    if not user or not user.check_password(password) or not user.is_active:
        return jsonify({'message': 'Invalid credentials'}), 401
    
    access_token = create_access_token(identity=user.id)
    
    return jsonify({
        'access_token': access_token,
        'user': user.to_dict()
    })

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    profile_data = user.to_dict()
    
    # Add role-specific data
    if user.role == UserRole.STUDENT and user.student_profile:
        profile_data['student_profile'] = user.student_profile.to_dict()
    elif user.role == UserRole.TEACHER and user.teacher_profile:
        profile_data['teacher_profile'] = user.teacher_profile.to_dict()
    
    return jsonify(profile_data)








