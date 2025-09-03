# app/routes/teachers.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models.User import User, UserRole
from app.models.Teacher import Teacher
from app.models.Classroom import Classroom
from app.models.TeacherAssignment import TeacherAssignment
from app.models.Student import Student
from app.utils.decorators import role_required
from app import db

teachers_bp = Blueprint('teachers', __name__)

@teachers_bp.route('/my-assignments', methods=['GET'])
@jwt_required()
@role_required('teacher')
def get_my_assignments(current_user):
    teacher = current_user.teacher_profile
    if not teacher:
        return jsonify({'message': 'Teacher profile not found'}), 404
    
    assignments = TeacherAssignment.query.filter_by(
        teacher_id=teacher.id,
        is_active=True
    ).all()
    
    return jsonify([assignment.to_dict() for assignment in assignments])

@teachers_bp.route('/my-classrooms', methods=['GET'])
@jwt_required()
@role_required('teacher')
def get_my_classrooms(current_user):
    teacher = current_user.teacher_profile
    if not teacher:
        return jsonify({'message': 'Teacher profile not found'}), 404
    
    # Get classrooms where teacher is head teacher
    head_classrooms = []
    if teacher.is_head_teacher:
        head_classrooms = Classroom.query.filter_by(head_teacher_id=teacher.id).all()
    
    # Get classrooms from assignments
    assigned_classrooms = db.session.query(Classroom).join(
        TeacherAssignment,
        Classroom.id == TeacherAssignment.classroom_id
    ).filter(
        TeacherAssignment.teacher_id == teacher.id,
        TeacherAssignment.is_active == True
    ).distinct().all()
    
    return jsonify({
        'head_of_classrooms': [c.to_dict() for c in head_classrooms],
        'assigned_classrooms': [c.to_dict() for c in assigned_classrooms]
    })
