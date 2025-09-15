# app/routes/students.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models.User import User, UserRole
from app.models.Student import Student
from app.models.Teacher import Teacher
from app.models.Classroom import Classroom
from app.models.TeacherAssignment import TeacherAssignment
from app.services.AuthService import AuthService
from app.utils.decorators import role_required, log_action
from app import db
from datetime import datetime
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
            phone_number=data.get('phone'),
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

# Get all students (admin/teacher access)
@students_bp.route('/', methods=['GET'])
@jwt_required()
@role_required(['admin', 'teacher'])
def get_students(current_user):
    print("I recived the querry")
    if current_user.role == UserRole.ADMIN:
        students = Student.query.filter_by(is_enrolled=True).all()
    else:
        # Teacher sees only their students
        teacher = current_user.teacher_profile
        if not teacher:
            return jsonify([])
            
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

# Get specific student details
@students_bp.route('/<int:student_id>', methods=['GET'])
@jwt_required()
@role_required(['admin', 'teacher'])
def get_student_details(current_user, student_id):
    student = Student.query.get_or_404(student_id)
    
    # Check permissions for teachers
    if current_user.role == UserRole.TEACHER:
        teacher = current_user.teacher_profile
        if not teacher:
            return jsonify({'message': 'Teacher profile not found'}), 403
            
        # Check if teacher has access to this student
        has_access = False
        
        # Head teacher access
        if teacher.is_head_teacher and student.classroom and student.classroom.head_teacher_id == teacher.id:
            has_access = True
        
        # Assignment access
        if not has_access and student.classroom_id:
            assignment = TeacherAssignment.query.filter_by(
                teacher_id=teacher.id,
                classroom_id=student.classroom_id,
                is_active=True
            ).first()
            has_access = bool(assignment)
        
        if not has_access:
            return jsonify({'message': 'No access to this student'}), 403
    
    return jsonify(student.to_dict())

# Get students for a specific classroom
@students_bp.route('/classroom/<int:classroom_id>', methods=['GET'])
@jwt_required()
@role_required(['admin', 'teacher'])
def get_classroom_students(current_user, classroom_id):
    # Check permissions for teachers
    if current_user.role == UserRole.TEACHER:
        teacher = current_user.teacher_profile
        if not teacher:
            return jsonify({'message': 'Teacher profile not found'}), 403
        
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

# Update student information
@students_bp.route('/<int:student_id>', methods=['PUT'])
@jwt_required()
@role_required(['admin', 'teacher'])
@log_action('UPDATE_STUDENT', 'students')
def update_student(current_user, student_id):
    student = Student.query.get_or_404(student_id)
    
    # Check permissions for teachers
    if current_user.role == UserRole.TEACHER:
        teacher = current_user.teacher_profile
        if not teacher:
            return jsonify({'message': 'Teacher profile not found'}), 403
            
        # Only head teacher of the student's classroom can update
        if not (teacher.is_head_teacher and student.classroom and 
                student.classroom.head_teacher_id == teacher.id):
            return jsonify({'message': 'Only the head teacher can update student information'}), 403
    
    data = request.get_json()
    
    # Update student info
    for field in ['address', 'phone_number', 'parent_name', 'parent_email', 'parent_phone', 'classroom_id']:
        if field in data:
            setattr(student, field, data[field])
    
    # Handle date of birth
    if 'date_of_birth' in data and data['date_of_birth']:
        student.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
    
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

# Delete/Deactivate student (admin only)
@students_bp.route('/<int:student_id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
@log_action('DELETE_STUDENT', 'students')
def delete_student(current_user, student_id):
    student = Student.query.get_or_404(student_id)
    user = student.user
    
    # Deactivate instead of delete to preserve data integrity
    user.is_active = False
    student.is_enrolled = False
    db.session.commit()
    
    return jsonify({'message': 'Student deactivated successfully'})