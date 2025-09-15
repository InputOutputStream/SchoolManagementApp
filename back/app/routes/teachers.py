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

@teachers_bp.route('/profile', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def get_teacher_profile(current_user):
    if current_user.role == UserRole.ADMIN:
        # Admin might not have teacher profile
        return jsonify(current_user.to_dict())
    
    teacher = current_user.teacher_profile
    if not teacher:
        return jsonify({'message': 'Teacher profile not found'}), 404
    
    return jsonify(teacher.to_dict())

@teachers_bp.route('/profile', methods=['PUT'])
@jwt_required()
@role_required(['teacher', 'admin'])
def update_teacher_profile(current_user):
    data = request.get_json()
    
    # Update user info
    for field in ['first_name', 'last_name', 'email']:
        if field in data:
            setattr(current_user, field, data[field])
    
    # Update teacher profile if exists
    if current_user.teacher_profile:
        teacher = current_user.teacher_profile
        for field in ['specialization', 'employee_number']:
            if field in data:
                setattr(teacher, field, data[field])
    
    db.session.commit()
    
    return jsonify({
        'message': 'Profile updated successfully',
        'user': current_user.to_dict()
    })

@teachers_bp.route('/my-assignments', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def get_my_assignments(current_user):
    if current_user.role == UserRole.ADMIN:
        # Admin can see all assignments
        assignments = TeacherAssignment.query.filter_by(is_active=True).all()
    else:
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
@role_required(['teacher', 'admin'])
def get_my_classrooms(current_user):
    if current_user.role == UserRole.ADMIN:
        # Admin sees all classrooms
        head_classrooms = Classroom.query.all()
        assigned_classrooms = []
    else:
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

@teachers_bp.route('/my-students', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def get_my_students(current_user):
    if current_user.role == UserRole.ADMIN:
        # Admin sees all students
        students = Student.query.filter_by(is_enrolled=True).all()
    else:
        teacher = current_user.teacher_profile
        if not teacher:
            return jsonify({'message': 'Teacher profile not found'}), 404
        
        # Get students from head teacher classrooms
        head_classrooms = Classroom.query.filter_by(head_teacher_id=teacher.id).all()
        head_classroom_ids = [c.id for c in head_classrooms]
        
        # Get students from assigned classrooms
        assigned_classrooms = db.session.query(Classroom.id).join(
            TeacherAssignment,
            Classroom.id == TeacherAssignment.classroom_id
        ).filter(
            TeacherAssignment.teacher_id == teacher.id,
            TeacherAssignment.is_active == True
        ).distinct().all()
        assigned_classroom_ids = [c.id for c in assigned_classrooms]
        
        all_classroom_ids = list(set(head_classroom_ids + assigned_classroom_ids))
        
        students = Student.query.filter(
            Student.classroom_id.in_(all_classroom_ids),
            Student.is_enrolled == True
        ).all() if all_classroom_ids else []
    
    return jsonify([student.to_dict() for student in students])