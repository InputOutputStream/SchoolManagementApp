# app/routes/admin.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models.User import User
from app.models.Teacher import Teacher
from app.models.Student import Student
from app.models.Classroom import Classroom
from app.models.Subject import Subject
from app.models.TeacherAssignment import TeacherAssignment
from app.models.AuditLog import AuditLog
from app.services.AuthService import AuthService
from app.utils.decorators import role_required, log_action
from app import db
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
admin_bp = Blueprint('admin', __name__)

# TEACHER MANAGEMENT
@admin_bp.route('/teachers', methods=['POST'])
@jwt_required()
@role_required('admin')
@log_action('CREATE_TEACHER', 'teachers')
def create_teacher(current_user):
    data = request.get_json()
    
    try:
        logger.info(f"Admin {current_user.id} attempting to create teacher with data: {data}")
        user, teacher = AuthService.create_teacher(current_user, data)
        return jsonify({
            'message': 'Teacher created successfully',
            'user': user.to_dict(),
            'teacher': teacher.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@admin_bp.route('/teachers', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_teachers(current_user):
    try:
        teachers = db.session.query(Teacher).join(User).filter(User.is_active == True).all()
        logger.info(f"Admin {current_user.id} attempting to list teachers: {teachers}")
        return jsonify([teacher.to_dict() for teacher in teachers])
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@admin_bp.route('/teachers/<int:teacher_id>', methods=['PUT'])
@jwt_required()
@role_required('admin')
@log_action('UPDATE_TEACHER', 'teachers')
def update_teacher(current_user, teacher_id):
    teacher = Teacher.query.get_or_404(teacher_id)
    data = request.get_json()
    
    try:
        for field in ['employee_number', 'specialization', 'hire_date', 'is_head_teacher']:
            if field in data:
                setattr(teacher, field, data[field])
        
        user = teacher.user
        for field in ['first_name', 'last_name', 'email']:
            if field in data:
                setattr(user, field, data[field])
        
        db.session.commit()
        
        return jsonify({
            'message': 'Teacher updated successfully',
            'teacher': teacher.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@admin_bp.route('/teachers/<int:teacher_id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
@log_action('DELETE_TEACHER', 'teachers')
def delete_teacher(current_user, teacher_id):
    try:
        teacher = Teacher.query.get_or_404(teacher_id)
        user = teacher.user
        
        user.is_active = False
        db.session.commit()
    
        return jsonify({'message': 'Teacher deactivated successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@admin_bp.route('/teachers/<int:teacher_id>/promote', methods=['PATCH'])
@jwt_required()
@role_required('admin')
@log_action('PROMOTE_TO_ADMIN', 'teachers')
def promote_to_admin(current_user, teacher_id):
    try:
        teacher = Teacher.query.get_or_404(teacher_id)
        user = teacher.user
        
        if user.role == 'admin':
            return jsonify({'message': 'User is already an admin'}), 400
        
        user.role = 'admin'  # Fixed: Use string instead of enum
        db.session.commit()
        
        return jsonify({
            'message': 'Teacher promoted to admin successfully',
            'user': user.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

# CLASSROOM MANAGEMENT
@admin_bp.route('/classrooms', methods=['POST'])
@jwt_required()
@role_required('admin')
@log_action('CREATE_CLASSROOM', 'classrooms')
def create_classroom(current_user):
    data = request.get_json()
    
    classroom = Classroom(
        name=data['name'],
        level=data.get('grade_level', data.get('level')),  # Fixed field name
        academic_year=data.get('academic_year', '2024-2025'),
        max_students=data.get('max_students', 30),
        assigned_by=current_user.id
    )
    
    db.session.add(classroom)
    db.session.commit()
    
    return jsonify({
        'message': 'Classroom created successfully',
        'classroom': classroom.to_dict()
    }), 201

@admin_bp.route('/classrooms', methods=['GET'])
@jwt_required()
@role_required(['admin', 'teacher'])
def get_classrooms(current_user):
    if current_user.role == 'admin':  # Fixed: Use string comparison
        classrooms = Classroom.query.all()
    else:
        teacher = current_user.teacher_profile
        if teacher:
            head_classrooms = Classroom.query.filter_by(head_teacher_id=teacher.id).all()
            
            assigned_classrooms = db.session.query(Classroom).join(
                TeacherAssignment,
                Classroom.id == TeacherAssignment.classroom_id
            ).filter(
                TeacherAssignment.teacher_id == teacher.id,
                TeacherAssignment.is_active == True
            ).distinct().all()
            
            all_classrooms = {c.id: c for c in head_classrooms + assigned_classrooms}
            classrooms = list(all_classrooms.values())
        else:
            classrooms = []
    
    logger.info(f"User {current_user.id} retrieving {len(classrooms)} classrooms")
    return jsonify([classroom.to_dict() for classroom in classrooms])

@admin_bp.route('/classrooms/<int:classroom_id>', methods=['PUT'])
@jwt_required()
@role_required('admin')
@log_action('UPDATE_CLASSROOM', 'classrooms')
def update_classroom(current_user, classroom_id):
    try:
        classroom = Classroom.query.get_or_404(classroom_id)
        data = request.get_json()
        
        for field in ['name', 'level', 'max_students', 'academic_year']:  # Fixed field name
            if field in data:
                setattr(classroom, field, data[field])
        
        db.session.commit()
        
        return jsonify({
            'message': 'Classroom updated successfully',
            'classroom': classroom.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@admin_bp.route('/classrooms/<int:classroom_id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
@log_action('DELETE_CLASSROOM', 'classrooms')
def delete_classroom(current_user, classroom_id):
    classroom = Classroom.query.get_or_404(classroom_id)
    
    student_count = Student.query.filter_by(classroom_id=classroom_id, is_enrolled=True).count()
    if student_count > 0:
        return jsonify({'message': 'Cannot delete classroom with enrolled students'}), 400
    
    db.session.delete(classroom)
    db.session.commit()
    
    return jsonify({'message': 'Classroom deleted successfully'})

@admin_bp.route('/classrooms/<int:classroom_id>/assign-teacher', methods=['POST'])
@jwt_required()
@role_required('admin')
@log_action('ASSIGN_CLASSROOM_HEAD', 'classrooms')
def assign_classroom_teacher(current_user, classroom_id):
    data = request.get_json()
    teacher_id = data.get('teacher_id')
    
    classroom = Classroom.query.get_or_404(classroom_id)
    teacher = Teacher.query.get_or_404(teacher_id)
    
    classroom.head_teacher_id = teacher_id
    teacher.is_head_teacher = True
    db.session.commit()
    
    return jsonify({
        'message': 'Teacher assigned to classroom successfully',
        'classroom': classroom.to_dict()
    })

# SUBJECT MANAGEMENT
@admin_bp.route('/subjects', methods=['POST'])
@jwt_required()
@role_required('admin')
@log_action('CREATE_SUBJECT', 'subjects')
def create_subject(current_user):
    data = request.get_json()
    
    subject = Subject(
        name=data['name'],
        code=data['code'],
        coefficient=data.get('coefficient', 1)
    )
    
    db.session.add(subject)
    db.session.commit()
    
    return jsonify({
        'message': 'Subject created successfully',
        'subject': subject.to_dict()
    }), 201

@admin_bp.route('/subjects', methods=['GET'])
@jwt_required()
@role_required(['admin', 'teacher'])
def get_subjects(current_user):
    subjects = Subject.query.all()
    return jsonify([subject.to_dict() for subject in subjects])

@admin_bp.route('/subjects/<int:subject_id>', methods=['PUT'])
@jwt_required()
@role_required('admin')
@log_action('UPDATE_SUBJECT', 'subjects')
def update_subject(current_user, subject_id):
    subject = Subject.query.get_or_404(subject_id)
    data = request.get_json()
    
    for field in ['name', 'code', 'coefficient']:
        if field in data:
            setattr(subject, field, data[field])
    
    db.session.commit()
    
    return jsonify({
        'message': 'Subject updated successfully',
        'subject': subject.to_dict()
    })

@admin_bp.route('/subjects/<int:subject_id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
@log_action('DELETE_SUBJECT', 'subjects')
def delete_subject(current_user, subject_id):
    subject = Subject.query.get_or_404(subject_id)
    
    assignment_count = TeacherAssignment.query.filter_by(subject_id=subject_id, is_active=True).count()
    if assignment_count > 0:
        return jsonify({'message': 'Cannot delete subject with active assignments'}), 400
    
    db.session.delete(subject)
    db.session.commit()
    
    return jsonify({'message': 'Subject deleted successfully'})

# STUDENT MANAGEMENT
@admin_bp.route('/students', methods=['GET'])
@jwt_required()
@role_required(['admin', 'teacher'])
def get_all_students(current_user):
    if current_user.role == 'admin':  # Fixed: Use string comparison
        students = Student.query.filter_by(is_enrolled=True).all()
    else:
        teacher = current_user.teacher_profile
        if teacher:
            head_classrooms = Classroom.query.filter_by(head_teacher_id=teacher.id).all()
            head_classroom_ids = [c.id for c in head_classrooms]
            
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
        else:
            students = []
    
    return jsonify([student.to_dict() for student in students])

@admin_bp.route('/students', methods=['POST'])
@jwt_required()
@role_required(['admin', 'teacher'])
@log_action('CREATE_STUDENT', 'students')
def create_student(current_user):
    data = request.get_json()
    
    try:
        user, student = AuthService.create_student(current_user, data)
        return jsonify({
            'message': 'Student created successfully',
            'user': user.to_dict(),
            'student': student.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@admin_bp.route('/students/<int:student_id>', methods=['PUT'])
@jwt_required()
@role_required(['admin', 'teacher'])
@log_action('UPDATE_STUDENT', 'students')
def update_student(current_user, student_id):
    student = Student.query.get_or_404(student_id)
    
    if current_user.role == 'teacher':  # Fixed: Use string comparison
        teacher = current_user.teacher_profile
        if not (teacher and teacher.is_head_teacher and student.classroom and 
                student.classroom.head_teacher_id == teacher.id):
            return jsonify({'message': 'Only head teacher can update student information'}), 403
    
    data = request.get_json()
    
    for field in ['address', 'phone_number', 'parent_name', 'parent_email', 'parent_phone', 'classroom_id']:
        if field in data:
            setattr(student, field, data[field])
    
    user = student.user
    for field in ['first_name', 'last_name', 'email']:
        if field in data:
            setattr(user, field, data[field])
    
    db.session.commit()
    
    return jsonify({
        'message': 'Student updated successfully',
        'student': student.to_dict()
    })

@admin_bp.route('/students/<int:student_id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
@log_action('DELETE_STUDENT', 'students')
def delete_student(current_user, student_id):
    student = Student.query.get_or_404(student_id)
    user = student.user
    
    user.is_active = False
    student.is_enrolled = False
    db.session.commit()
    
    return jsonify({'message': 'Student deactivated successfully'})

# DASHBOARD AND STATISTICS
@admin_bp.route('/dashboard/stats', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_dashboard_stats(current_user):
    from app.models.Attendance import Attendance
    from datetime import date
    
    today = date.today()
    today_attendance = db.session.query(Attendance).filter_by(date=today).all()
    present_today = sum(1 for att in today_attendance if att.status in ['present', 'late'])
    
    stats = {
        'total_teachers': Teacher.query.count(),
        'head_teachers': Teacher.query.filter_by(is_head_teacher=True).count(),
        'total_students': Student.query.filter_by(is_enrolled=True).count(),
        'total_classrooms': Classroom.query.count(),
        'total_subjects': Subject.query.count(),
        'active_assignments': TeacherAssignment.query.filter_by(is_active=True).count(),
        'present_today': present_today
    }
    
    return jsonify(stats)

# ASSIGNMENT MANAGEMENT
@admin_bp.route('/assignments', methods=['POST'])
@jwt_required()
@role_required('admin')
@log_action('CREATE_ASSIGNMENT', 'teacher_assignments')
def create_assignment(current_user):
    data = request.get_json()
    
    assignment = TeacherAssignment(
        teacher_id=data['teacher_id'],
        subject_id=data['subject_id'],
        classroom_id=data['classroom_id'],
        academic_year=data.get('academic_year', '2024-2025'),
        assigned_by=current_user.id
    )
    
    try:
        db.session.add(assignment)
        db.session.commit()
        return jsonify({
            'message': 'Assignment created successfully',
            'assignment': assignment.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Assignment already exists or invalid data'}), 400

@admin_bp.route('/assignments', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_assignments(current_user):
    assignments = TeacherAssignment.query.filter_by(is_active=True).all()
    return jsonify([assignment.to_dict() for assignment in assignments])

@admin_bp.route('/assignments/<int:assignment_id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
@log_action('DELETE_ASSIGNMENT', 'teacher_assignments')
def delete_assignment(current_user, assignment_id):
    assignment = TeacherAssignment.query.get_or_404(assignment_id)
    assignment.is_active = False
    db.session.commit()
    
    return jsonify({'message': 'Assignment removed'})

# USER MANAGEMENT
@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_all_users(current_user):
    users = User.query.filter_by(is_active=True).all()
    return jsonify([user.to_dict() for user in users])

@admin_bp.route('/users/<int:user_id>/deactivate', methods=['POST'])
@jwt_required()
@role_required('admin')
@log_action('DEACTIVATE_USER', 'users')
def deactivate_user(current_user, user_id):
    user = User.query.get_or_404(user_id)
    user.is_active = False
    db.session.commit()
    
    return jsonify({'message': 'User deactivated successfully'})