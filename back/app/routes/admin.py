# app/routes/admin.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models.User import User, UserRole
from back.app.models.Teacher import Teacher
from app.models.Classroom import Classroom
from app.models.Subject import Subject
from app.models.TeacherAssignment import TeacherAssignment
from app.models.AuditLog import AuditLog
from app.services.AuthService import AuthService
from app.utils.decorators import role_required, log_action
from app import db
from datetime import datetime

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/teachers', methods=['POST'])
@jwt_required()
@role_required('admin')
@log_action('CREATE_TEACHER', 'teachers')
def create_teacher(current_user):
    data = request.get_json()
    
    try:
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
    teachers = db.session.query(Teacher).join(User).filter(User.is_active == True).all()
    return jsonify([teacher.to_dict() for teacher in teachers])

@admin_bp.route('/teachers/<int:teacher_id>/assign-head', methods=['POST'])
@jwt_required()
@role_required('admin')
@log_action('ASSIGN_HEAD_TEACHER', 'teachers')
def assign_head_teacher(current_user, teacher_id):
    teacher = Teacher.query.get_or_404(teacher_id)
    teacher.is_head_teacher = True
    db.session.commit()
    
    return jsonify({'message': 'Teacher assigned as head teacher', 'teacher': teacher.to_dict()})

@admin_bp.route('/teachers/<int:teacher_id>/remove-head', methods=['DELETE'])
@jwt_required()
@role_required('admin')
@log_action('REMOVE_HEAD_TEACHER', 'teachers')
def remove_head_teacher(current_user, teacher_id):
    teacher = Teacher.query.get_or_404(teacher_id)
    teacher.is_head_teacher = False
    
    # Remove from any classroom assignments
    classrooms = Classroom.query.filter_by(head_teacher_id=teacher_id).all()
    for classroom in classrooms:
        classroom.head_teacher_id = None
    
    db.session.commit()
    
    return jsonify({'message': 'Head teacher status removed'})

@admin_bp.route('/classrooms', methods=['POST'])
@jwt_required()
@role_required('admin')
@log_action('CREATE_CLASSROOM', 'classrooms')
def create_classroom(current_user):
    data = request.get_json()
    
    classroom = Classroom(
        name=data['name'],
        level=data['level'],
        academic_year=data['academic_year'],
        max_students=data.get('max_students', 30),
        assigned_by=current_user.id
    )
    
    db.session.add(classroom)
    db.session.commit()
    
    return jsonify({
        'message': 'Classroom created successfully',
        'classroom': classroom.to_dict()
    }), 201

@admin_bp.route('/classrooms/<int:classroom_id>/assign-head/<int:teacher_id>', methods=['POST'])
@jwt_required()
@role_required('admin')
@log_action('ASSIGN_CLASSROOM_HEAD', 'classrooms')
def assign_classroom_head(current_user, classroom_id, teacher_id):
    classroom = Classroom.query.get_or_404(classroom_id)
    teacher = Teacher.query.get_or_404(teacher_id)
    
    if not teacher.is_head_teacher:
        return jsonify({'message': 'Teacher must be designated as head teacher first'}), 400
    
    classroom.head_teacher_id = teacher_id
    classroom.assigned_by = current_user.id
    db.session.commit()
    
    return jsonify({
        'message': 'Head teacher assigned to classroom',
        'classroom': classroom.to_dict()
    })

@admin_bp.route('/classrooms/<int:classroom_id>/remove-head', methods=['DELETE'])
@jwt_required()
@role_required('admin')
@log_action('REMOVE_CLASSROOM_HEAD', 'classrooms')
def remove_classroom_head(current_user, classroom_id):
    classroom = Classroom.query.get_or_404(classroom_id)
    classroom.head_teacher_id = None
    db.session.commit()
    
    return jsonify({'message': 'Head teacher removed from classroom'})

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
@role_required('admin')
def get_subjects(current_user):
    subjects = Subject.query.all()
    return jsonify([subject.to_dict() for subject in subjects])

@admin_bp.route('/assignments', methods=['POST'])
@jwt_required()
@role_required('admin')
@log_action('CREATE_ASSIGNMENT', 'teacher_subject_classroom')
def create_assignment(current_user):
    data = request.get_json()
    
    assignment = TeacherAssignment(
        teacher_id=data['teacher_id'],
        subject_id=data['subject_id'],
        classroom_id=data['classroom_id'],
        academic_year=data['academic_year'],
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
@log_action('DELETE_ASSIGNMENT', 'teacher_subject_classroom')
def delete_assignment(current_user, assignment_id):
    assignment = TeacherAssignment.query.get_or_404(assignment_id)
    assignment.is_active = False
    db.session.commit()
    
    return jsonify({'message': 'Assignment removed'})

@admin_bp.route('/audit-logs', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_audit_logs(current_user):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    logs = AuditLog.query.order_by(AuditLog.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'logs': [log.to_dict() for log in logs.items],
        'total': logs.total,
        'pages': logs.pages,
        'current_page': page
    })

@admin_bp.route('/dashboard/stats', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_dashboard_stats(current_user):
    stats = {
        'total_teachers': Teacher.query.count(),
        'head_teachers': Teacher.query.filter_by(is_head_teacher=True).count(),
        'total_students': Student.query.filter_by(is_enrolled=True).count(),
        'total_classrooms': Classroom.query.count(),
        'total_subjects': Subject.query.count(),
        'active_assignments': TeacherAssignment.query.filter_by(is_active=True).count()
    }
    
    return jsonify(stats)

