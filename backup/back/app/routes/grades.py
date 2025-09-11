
# app/routes/grades.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models.Grade import Grade
from app.models.TeacherAssignment import TeacherAssignment
from app.models.Student import Student
from app.models.Classroom import Classroom
from app.utils.decorators import role_required, log_action
from app import db
from datetime import datetime

grades_bp = Blueprint('grades', __name__)

@grades_bp.route('/', methods=['POST'])
@jwt_required()
@role_required('teacher')
@log_action('ADD_GRADE', 'grades')
def add_grade(current_user):
    data = request.get_json()
    teacher = current_user.teacher_profile
    
    # Verify teacher has assignment for this subject/classroom
    assignment = TeacherAssignment.query.filter_by(
        teacher_id=teacher.id,
        subject_id=data['subject_id'],
        classroom_id=data['classroom_id'],
        is_active=True
    ).first()
    
    if not assignment:
        return jsonify({'message': 'No assignment found for this subject/classroom'}), 403
    
    # Verify student is in the classroom
    student = Student.query.filter_by(
        id=data['student_id'],
        classroom_id=data['classroom_id'],
        is_enrolled=True
    ).first()
    
    if not student:
        return jsonify({'message': 'Student not found in this classroom'}), 404
    
    grade = Grade(
        student_id=data['student_id'],
        subject_id=data['subject_id'],
        teacher_id=teacher.id,
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
@role_required('teacher')
@log_action('UPDATE_GRADE', 'grades')
def update_grade(current_user, grade_id):
    grade = Grade.query.get_or_404(grade_id)
    teacher = current_user.teacher_profile
    
    # Only the teacher who created the grade can update it
    if grade.teacher_id != teacher.id:
        return jsonify({'message': 'You can only update your own grades'}), 403
    
    data = request.get_json()
    
    # Update grade fields
    for field in ['grade', 'max_grade', 'evaluation_type', 'evaluation_name', 'comments']:
        if field in data:
            if field == 'evaluation_date' and data[field]:
                grade.evaluation_date = datetime.strptime(data[field], '%Y-%m-%d').date()
            else:
                setattr(grade, field, data[field])
    
    db.session.commit()
    
    return jsonify({
        'message': 'Grade updated successfully',
        'grade': grade.to_dict()
    })

@grades_bp.route('/classroom/<int:classroom_id>/period/<int:period_id>', methods=['GET'])
@jwt_required()
@role_required('teacher')
def get_classroom_grades(current_user, classroom_id, period_id):
    teacher = current_user.teacher_profile
    
    # Check access to classroom
    is_head_teacher = teacher.is_head_teacher and \
                     Classroom.query.filter_by(id=classroom_id, head_teacher_id=teacher.id).first()
    
    has_assignment = TeacherAssignment.query.filter_by(
        teacher_id=teacher.id,
        classroom_id=classroom_id,
        is_active=True
    ).first()
    
    if not (is_head_teacher or has_assignment):
        return jsonify({'message': 'No access to this classroom'}), 403
    
    grades = Grade.query.join(Student).filter(
        Student.classroom_id == classroom_id,
        Grade.evaluation_period_id == period_id
    ).all()
    
    return jsonify([grade.to_dict() for grade in grades])
