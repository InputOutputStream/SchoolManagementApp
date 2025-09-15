# app/routes/auth.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity, create_refresh_token
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
    refresh_token = create_refresh_token(identity=user.id)
    
    # Update last login time
    from datetime import datetime
    user.last_login = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user.to_dict()
    })

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.is_active:
        return jsonify({'message': 'Invalid user'}), 401
    
    new_access_token = create_access_token(identity=current_user_id)
    
    return jsonify({
        'access_token': new_access_token
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
    elif user.role in [UserRole.TEACHER, UserRole.ADMIN] and user.teacher_profile:
        profile_data['teacher_profile'] = user.teacher_profile.to_dict()
    
    return jsonify(profile_data)

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
@log_action('LOGOUT')
def logout(current_user):
    # In a real application, you might want to blacklist the token
    # For now, we'll just return a success message
    return jsonify({'message': 'Successfully logged out'})

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
@log_action('CHANGE_PASSWORD')
def change_password(current_user):
    data = request.get_json()
    
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        return jsonify({'message': 'Current password and new password required'}), 400
    
    if not current_user.check_password(current_password):
        return jsonify({'message': 'Current password is incorrect'}), 400
    
    if len(new_password) < 8:
        return jsonify({'message': 'New password must be at least 8 characters long'}), 400
    
    current_user.set_password(new_password)
    db.session.commit()
    
    return jsonify({'message': 'Password changed successfully'})

@auth_bp.route('/forgot-password', methods=['POST'])
@log_action('FORGOT_PASSWORD')
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({'message': 'Email is required'}), 400
    
    user = User.query.filter_by(email=email).first()
    
    if user and user.is_active:
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        user.reset_token = reset_token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db.session.commit()
        
        # In a real application, you would send an email here
        # For now, we'll just return the token (NOT recommended in production)
        return jsonify({
            'message': 'Password reset token generated',
            'reset_token': reset_token  # Remove this in production
        })
    
    # Always return success to prevent email enumeration
    return jsonify({'message': 'If the email exists, a reset link has been sent'})

@auth_bp.route('/reset-password', methods=['POST'])
@log_action('RESET_PASSWORD')
def reset_password():
    data = request.get_json()
    reset_token = data.get('reset_token')
    new_password = data.get('new_password')
    
    if not reset_token or not new_password:
        return jsonify({'message': 'Reset token and new password required'}), 400
    
    if len(new_password) < 8:
        return jsonify({'message': 'Password must be at least 8 characters long'}), 400
    
    from datetime import datetime
    user = User.query.filter_by(reset_token=reset_token).first()
    
    if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        return jsonify({'message': 'Invalid or expired reset token'}), 400
    
    user.set_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.session.commit()
    
    return jsonify({'message': 'Password reset successfully'})