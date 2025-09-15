# app/routes/grades.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models.Grade import Grade
from app.models.TeacherAssignment import TeacherAssignment
from app.models.Student import Student
from app.models.Classroom import Classroom
from app.models.User import UserRole
from app.utils.decorators import role_required, log_action
from app import db
from datetime import datetime

grades_bp = Blueprint('grades', __name__)

@grades_bp.route('/', methods=['POST'])
@jwt_required()
@role_required(['teacher', 'admin'])
@log_action('ADD_GRADE', 'grades')
def add_grade(current_user):
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['student_id', 'subject_id', 'evaluation_period_id', 'grade']
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return jsonify({'message': f'Missing required fields: {", ".join(missing_fields)}'}), 400
    
    if current_user.role == UserRole.TEACHER:
        teacher = current_user.teacher_profile
        if not teacher:
            return jsonify({'message': 'Teacher profile not found'}), 403
        
        # Get student to verify classroom access
        student = Student.query.get_or_404(data['student_id'])
        
        # Verify teacher has assignment for this subject/classroom
        assignment = TeacherAssignment.query.filter_by(
            teacher_id=teacher.id,
            subject_id=data['subject_id'],
            classroom_id=student.classroom_id,
            is_active=True
        ).first()
        
        if not assignment:
            return jsonify({'message': 'No assignment found for this subject/classroom'}), 403
    
    # Verify student exists and is enrolled
    student = Student.query.filter_by(
        id=data['student_id'],
        is_enrolled=True
    ).first()
    
    if not student:
        return jsonify({'message': 'Student not found or not enrolled'}), 404
    
    grade = Grade(
        student_id=data['student_id'],
        subject_id=data['subject_id'],
        teacher_id=current_user.teacher_profile.id if current_user.role == UserRole.TEACHER else data.get('teacher_id'),
        evaluation_period_id=data['evaluation_period_id'],
        grade=data['grade'],
        max_grade=data.get('max_grade', 20),
        evaluation_type=data.get('evaluation_type'),
        evaluation_name=data.get('evaluation_name'),
        evaluation_date=datetime.strptime(data['evaluation_date'], '%Y-%m-%d').date() if data.get('evaluation_date') else None,
        comments=data.get('comments'),
        created_by=current_user.id
    )
    
    db.session.add(grade)
    db.session.commit()
    
    return jsonify({
        'message': 'Grade added successfully',
        'grade': grade.to_dict()
    }), 201

@grades_bp.route('/<int:grade_id>', methods=['PUT'])
@jwt_required()
@role_required(['teacher', 'admin'])
@log_action('UPDATE_GRADE', 'grades')
def update_grade(current_user, grade_id):
    grade = Grade.query.get_or_404(grade_id)
    
    # Check permissions
    if current_user.role == UserRole.TEACHER:
        teacher = current_user.teacher_profile
        if not teacher:
            return jsonify({'message': 'Teacher profile not found'}), 403
            
        # Only the teacher who created the grade can update it
        if grade.teacher_id != teacher.id:
            return jsonify({'message': 'You can only update your own grades'}), 403
    
    data = request.get_json()
    
    # Update grade fields
    for field in ['grade', 'max_grade', 'evaluation_type', 'evaluation_name', 'comments']:
        if field in data:
            setattr(grade, field, data[field])
    
    if 'evaluation_date' in data and data['evaluation_date']:
        grade.evaluation_date = datetime.strptime(data['evaluation_date'], '%Y-%m-%d').date()
    
    grade.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': 'Grade updated successfully',
        'grade': grade.to_dict()
    })

@grades_bp.route('/<int:grade_id>', methods=['DELETE'])
@jwt_required()
@role_required(['teacher', 'admin'])
@log_action('DELETE_GRADE', 'grades')
def delete_grade(current_user, grade_id):
    grade = Grade.query.get_or_404(grade_id)
    
    # Check permissions
    if current_user.role == UserRole.TEACHER:
        teacher = current_user.teacher_profile
        if not teacher:
            return jsonify({'message': 'Teacher profile not found'}), 403
            
        # Only the teacher who created the grade can delete it
        if grade.teacher_id != teacher.id:
            return jsonify({'message': 'You can only delete your own grades'}), 403
    
    db.session.delete(grade)
    db.session.commit()
    
    return jsonify({'message': 'Grade deleted successfully'})

@grades_bp.route('/student/<int:student_id>', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def get_student_grades(current_user, student_id):
    student = Student.query.get_or_404(student_id)
    
    # Check access permissions
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
    
    # Get grades with optional filtering
    period_id = request.args.get('period_id', type=int)
    subject_id = request.args.get('subject_id', type=int)
    
    query = Grade.query.filter_by(student_id=student_id)
    
    if period_id:
        query = query.filter_by(evaluation_period_id=period_id)
    
    if subject_id:
        query = query.filter_by(subject_id=subject_id)
    
    grades = query.all()
    return jsonify([grade.to_dict() for grade in grades])

@grades_bp.route('/classroom/<int:classroom_id>/period/<int:period_id>', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def get_classroom_grades(current_user, classroom_id, period_id):
    # Check access permissions
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
    
    grades = Grade.query.join(Student).filter(
        Student.classroom_id == classroom_id,
        Student.is_enrolled == True,
        Grade.evaluation_period_id == period_id
    ).all()
    
    return jsonify([grade.to_dict() for grade in grades])

@grades_bp.route('/teacher/<int:teacher_id>', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def get_teacher_grades(current_user, teacher_id):
    # Check permissions
    if current_user.role == UserRole.TEACHER:
        teacher = current_user.teacher_profile
        if not teacher or teacher.id != teacher_id:
            return jsonify({'message': 'Access denied'}), 403
    
    # Get grades with optional filtering
    period_id = request.args.get('period_id', type=int)
    subject_id = request.args.get('subject_id', type=int)
    classroom_id = request.args.get('classroom_id', type=int)
    
    query = Grade.query.filter_by(teacher_id=teacher_id)
    
    if period_id:
        query = query.filter_by(evaluation_period_id=period_id)
    
    if subject_id:
        query = query.filter_by(subject_id=subject_id)
    
    if classroom_id:
        query = query.join(Student).filter(Student.classroom_id == classroom_id)
    
    grades = query.all()
    return jsonify([grade.to_dict() for grade in grades])