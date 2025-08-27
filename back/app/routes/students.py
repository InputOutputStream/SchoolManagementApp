
# app/routes/students.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models.User import User, UserRole
from app.models.Student import Student
from back.app.models.Teacher import Teacher
from app.services.AuthService import AuthService
from app.utils.decorators import role_required, log_action
from app import db
import secrets
import string

students_bp = Blueprint('students', __name__)

@students_bp.route('/register', methods=['POST'])
@log_action('STUDENT_REGISTRATION', 'students')
def register_student():
    data = request.get_json()
    
    try:
        # Generate student number
        student_number = 'STU' + ''.join(secrets.choice(string.digits) for _ in range(6))
        while Student.query.filter_by(student_number=student_number).first():
            student_number = 'STU' + ''.join(secrets.choice(string.digits) for _ in range(6))
        
        # Create user account
        user = User(
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            role=UserRole.STUDENT
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.flush()
        
        # Create student profile
        student = Student(
            user_id=user.id,
            student_number=student_number,
            date_of_birth=datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date() if data.get('date_of_birth') else None,
            address=data.get('address'),
            phone=data.get('phone'),
            parent_name=data.get('parent_name'),
            parent_email=data.get('parent_email'),
            parent_phone=data.get('parent_phone')
        )
        
        db.session.add(student)
        db.session.commit()
        
        return jsonify({
            'message': 'Student registered successfully',
            'student_number': student_number,
            'student': student.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@students_bp.route('/classroom/<int:classroom_id>', methods=['GET'])
@jwt_required()
@role_required('teacher')
def get_classroom_students(current_user, classroom_id):
    # Check if teacher has access to this classroom
    teacher = current_user.teacher_profile
    
    # Check if head teacher of this classroom
    is_head_teacher = teacher.is_head_teacher and \
                     Classroom.query.filter_by(id=classroom_id, head_teacher_id=teacher.id).first()
    
    # Check if assigned to this classroom
    has_assignment = TeacherAssignment.query.filter_by(
        teacher_id=teacher.id,
        classroom_id=classroom_id,
        is_active=True
    ).first()
    
    if not (is_head_teacher or has_assignment):
        return jsonify({'message': 'No access to this classroom'}), 403
    
    students = Student.query.filter_by(
        classroom_id=classroom_id,
        is_enrolled=True
    ).all()
    
    return jsonify([student.to_dict() for student in students])

@students_bp.route('/<int:student_id>', methods=['PUT'])
@jwt_required()
@role_required('teacher')
@log_action('UPDATE_STUDENT', 'students')
def update_student(current_user, student_id):
    student = Student.query.get_or_404(student_id)
    teacher = current_user.teacher_profile
    
    # Only head teacher of the student's classroom can update
    if not (teacher.is_head_teacher and student.classroom and 
            student.classroom.head_teacher_id == teacher.id):
        return jsonify({'message': 'Only the head teacher can update student information'}), 403
    
    data = request.get_json()
    
    # Update student info
    for field in ['address', 'phone', 'parent_name', 'parent_email', 'parent_phone']:
        if field in data:
            setattr(student, field, data[field])
    
    # Update user info
    user = student.user
    for field in ['first_name', 'last_name', 'email']:
        if field in data:
            setattr(user, field, data[field])
    
    db.session.commit()
    
    return jsonify({
        'message': 'Student updated successfully',
        'student': student.to_dict()
    })
