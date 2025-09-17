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
import logging

logger = logging.getLogger(__name__)
grades_bp = Blueprint('grades', __name__)

@grades_bp.route('/', methods=['POST'])
@jwt_required()
@role_required(['teacher', 'admin'])
@log_action('ADD_GRADE', 'grades')
def add_grade(current_user):
    data = request.get_json()
    
    required_fields = ['student_id', 'subject_id', 'evaluation_period_id', 'grade']
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return jsonify({'message': f'Missing required fields: {", ".join(missing_fields)}'}), 400
    
    try:
        if current_user.role == 'teacher':  # Fixed: String comparison
            teacher = current_user.teacher_profile
            if not teacher:
                return jsonify({'message': 'Teacher profile not found'}), 403
            
            student = Student.query.get_or_404(data['student_id'])
            
            assignment = TeacherAssignment.query.filter_by(
                teacher_id=teacher.id,
                subject_id=data['subject_id'],
                classroom_id=student.classroom_id,
                is_active=True
            ).first()
            
            if not assignment:
                return jsonify({'message': 'No assignment found for this subject/classroom'}), 403
        
        student = Student.query.filter_by(
            id=data['student_id'],
            is_enrolled=True
        ).first()
        
        if not student:
            return jsonify({'message': 'Student not found or not enrolled'}), 404
        
        grade = Grade(
            student_id=data['student_id'],
            subject_id=data['subject_id'],
            evaluation_id=data.get('evaluation_id'),  # Fixed: Use evaluation_id instead
            points_earned=float(data['grade']),
            points_possible=float(data.get('max_grade', 20)),
            comments=data.get('comments'),
            created_by=current_user.id
        )
        
        db.session.add(grade)
        db.session.commit()
        
        return jsonify({
            'message': 'Grade added successfully',
            'grade': grade.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400

@grades_bp.route('/student/<int:student_id>', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def get_student_grades(current_user, student_id):
    student = Student.query.get_or_404(student_id)
    
    if current_user.role == 'teacher':  # Fixed: String comparison
        teacher = current_user.teacher_profile
        if not teacher:
            return jsonify({'message': 'Teacher profile not found'}), 403
            
        has_access = False
        
        if teacher.is_head_teacher and student.classroom and student.classroom.head_teacher_id == teacher.id:
            has_access = True
        
        if not has_access and student.classroom_id:
            assignment = TeacherAssignment.query.filter_by(
                teacher_id=teacher.id,
                classroom_id=student.classroom_id,
                is_active=True
            ).first()
            has_access = bool(assignment)
        
        if not has_access:
            return jsonify({'message': 'No access to this student'}), 403
    
    period_id = request.args.get('period_id', type=int)
    subject_id = request.args.get('subject_id', type=int)
    
    query = Grade.query.filter_by(student_id=student_id)
    
    if period_id:
        query = query.join(Grade.evaluation).filter_by(evaluation_period_id=period_id)
    
    if subject_id:
        query = query.filter_by(subject_id=subject_id)
    
    grades = query.all()
    return jsonify([grade.to_dict() for grade in grades])

@grades_bp.route('/<int:grade_id>', methods=['PUT'])
@jwt_required()
@role_required(['teacher', 'admin'])
@log_action('UPDATE_GRADE', 'grades')
def update_grade(current_user, grade_id):
    try:
        grade = Grade.query.get_or_404(grade_id)
        
        old_data = grade.to_dict()
        logger.info(f"Updating grade {grade_id} - Current data: {old_data}")
        
        # Check permissions
        if current_user.role == "teacher":  # Fixed: String comparison
            teacher = current_user.teacher_profile
            if not teacher:
                logger.error(f"Teacher profile not found for user {current_user.id}")
                return jsonify({'message': 'Teacher profile not found'}), 403
                
            # Only the teacher who created the grade can update it
            if grade.teacher_id != teacher.id:
                logger.warning(f"Teacher {teacher.id} denied access to update grade {grade_id} "
                             f"(created by teacher {grade.teacher_id})")
                return jsonify({'message': 'You can only update your own grades'}), 403
        
        data = request.get_json()
        logger.info(f"Updating grade {grade_id} with data: {data}")
        
        # Update grade fields
        for field in ['grade', 'max_grade', 'evaluation_type', 'evaluation_name', 'comments']:
            if field in data:
                setattr(grade, field, data[field])
        
        if 'evaluation_date' in data and data['evaluation_date']:
            grade.evaluation_date = datetime.strptime(data['evaluation_date'], '%Y-%m-%d').date()
        
        grade.updated_at = datetime.utcnow()
        db.session.commit()
        
        new_data = grade.to_dict()
        logger.info(f"Grade {grade_id} updated - Old: {old_data}, New: {new_data}")
        
        response_data = {
            'message': 'Grade updated successfully',
            'grade': new_data
        }
        
        return jsonify(response_data)
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating grade {grade_id}: {str(e)}")
        return jsonify({'message': str(e)}), 400

@grades_bp.route('/<int:grade_id>', methods=['DELETE'])
@jwt_required()
@role_required(['teacher', 'admin'])
@log_action('DELETE_GRADE', 'grades')
def delete_grade(current_user, grade_id):
    try:
        grade = Grade.query.get_or_404(grade_id)
        grade_data = grade.to_dict()
        
        logger.info(f"Attempting to delete grade {grade_id}: {grade_data}")
        
        # Check permissions
        if current_user.role == "teacher":  # Fixed: String comparison:
            teacher = current_user.teacher_profile
            if not teacher:
                logger.error(f"Teacher profile not found for user {current_user.id}")
                return jsonify({'message': 'Teacher profile not found'}), 403
                
            # Only the teacher who created the grade can delete it
            if grade.teacher_id != teacher.id:
                logger.warning(f"Teacher {teacher.id} denied access to delete grade {grade_id} "
                             f"(created by teacher {grade.teacher_id})")
                return jsonify({'message': 'You can only delete your own grades'}), 403
        
        db.session.delete(grade)
        db.session.commit()
        
        logger.info(f"Grade {grade_id} deleted successfully")
        return jsonify({'message': 'Grade deleted successfully'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting grade {grade_id}: {str(e)}")
        return jsonify({'message': str(e)}), 400

@grades_bp.route('/classroom/<int:classroom_id>/period/<int:period_id>', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def get_classroom_grades(current_user, classroom_id, period_id):
    try:
        logger.info(f"Retrieving grades for classroom {classroom_id}, period {period_id}")
        
        # Check access permissions
        if current_user.role == "teacher":  # Fixed: String comparison
            teacher = current_user.teacher_profile
            if not teacher:
                logger.error(f"Teacher profile not found for user {current_user.id}")
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
                logger.warning(f"Teacher {teacher.id} denied access to classroom {classroom_id}")
                return jsonify({'message': 'No access to this classroom'}), 403
        
        grades = Grade.query.join(Student).filter(
            Student.classroom_id == classroom_id,
            Student.is_enrolled == True,
            Grade.evaluation_period_id == period_id
        ).all()
        
        logger.info(f"Retrieved {len(grades)} grades for classroom {classroom_id}, period {period_id}")
        
        response_data = [grade.to_dict() for grade in grades]
        logger.debug(f"Classroom {classroom_id} grades count: {len(response_data)}")
        
        return jsonify(response_data)
    except Exception as e:
        logger.error(f"Error retrieving classroom grades: {str(e)}")
        return jsonify({'message': str(e)}), 400

@grades_bp.route('/teacher/<int:teacher_id>', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def get_teacher_grades(current_user, teacher_id):
    try:
        # Check permissions
        if current_user.role == "teacher":  # Fixed: String comparison
            teacher = current_user.teacher_profile
            if not teacher or teacher.id != teacher_id:
                logger.warning(f"Teacher {teacher.id if teacher else 'None'} denied access to teacher {teacher_id} grades")
                return jsonify({'message': 'Access denied'}), 403
        
        logger.info(f"Retrieving grades for teacher {teacher_id}")
        
        # Get grades with optional filtering
        period_id = request.args.get('period_id', type=int)
        subject_id = request.args.get('subject_id', type=int)
        classroom_id = request.args.get('classroom_id', type=int)
        
        logger.debug(f"Filtering teacher grades - period_id: {period_id}, subject_id: {subject_id}, classroom_id: {classroom_id}")
        
        query = Grade.query.filter_by(teacher_id=teacher_id)
        
        if period_id:
            query = query.filter_by(evaluation_period_id=period_id)
        
        if subject_id:
            query = query.filter_by(subject_id=subject_id)
        
        if classroom_id:
            query = query.join(Student).filter(Student.classroom_id == classroom_id)
        
        grades = query.all()
        logger.info(f"Retrieved {len(grades)} grades for teacher {teacher_id}")
        
        response_data = [grade.to_dict() for grade in grades]
        logger.debug(f"Teacher {teacher_id} grades count: {len(response_data)}")
        
        return jsonify(response_data)
    except Exception as e:
        logger.error(f"Error retrieving teacher grades: {str(e)}")
        return jsonify({'message': str(e)}), 400