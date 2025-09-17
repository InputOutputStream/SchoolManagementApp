# app/routes/attendance.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.Attendance import Attendance
from app.models.Student import Student
from app.models.Classroom import Classroom
from app.models.Teacher import Teacher
from app.models.TeacherAssignment import TeacherAssignment
from app.utils.decorators import role_required, log_action
from app import db
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
attendance_bp = Blueprint('attendance', __name__)

@attendance_bp.route('/', methods=['POST'])
@jwt_required()
@role_required(['teacher', 'admin'])
@log_action('RECORD_ATTENDANCE', 'attendance')
def record_attendance(current_user):
    data = request.get_json()
    classroom_id = data.get('classroom_id')
    date_str = data.get('date')
    records = data.get('attendance_records')

    if not all([classroom_id, date_str, records]):
        return jsonify({'message': 'Missing required fields'}), 400

    try:
        attendance_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400

    if current_user.role == 'teacher':  # Fixed: String comparison
        teacher = current_user.teacher_profile
        if not teacher:
            return jsonify({'message': 'Teacher profile not found'}), 403
            
        assignment = TeacherAssignment.query.filter_by(
            teacher_id=teacher.id,
            classroom_id=classroom_id,
            is_active=True
        ).first()
        is_head_teacher = teacher.is_head_teacher and \
                         Classroom.query.filter_by(id=classroom_id, head_teacher_id=teacher.id).first()

        if not assignment and not is_head_teacher:
            return jsonify({'message': 'You do not have access to this classroom'}), 403

    try:
        Attendance.query.filter_by(classroom_id=classroom_id, date=attendance_date).delete()

        new_attendances = []
        for record in records:
            student_id = record.get('student_id')
            status = record.get('status')

            student = Student.query.filter_by(id=student_id, classroom_id=classroom_id).first()
            if not student:
                db.session.rollback()
                return jsonify({'message': f'Student with id {student_id} not found in this classroom'}), 400

            attendance = Attendance(
                student_id=student_id,
                classroom_id=classroom_id,
                date=attendance_date,
                status=status,
                recorded_by=current_user.id
            )
            new_attendances.append(attendance)
        
        db.session.add_all(new_attendances)
        db.session.commit()

        return jsonify({'message': 'Attendance recorded successfully'}), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 400


@attendance_bp.route('/classroom/<int:classroom_id>', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def get_classroom_attendance(current_user, classroom_id):
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'message': 'Date parameter is required'}), 400

    try:
        attendance_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400

    if current_user.role == 'teacher':  # Fixed: String comparison
        teacher = current_user.teacher_profile
        if not teacher:
            return jsonify({'message': 'Teacher profile not found'}), 403
            
        is_head_teacher = teacher.is_head_teacher and \
                         Classroom.query.filter_by(id=classroom_id, head_teacher_id=teacher.id).first()
        
        has_assignment = TeacherAssignment.query.filter_by(
            teacher_id=teacher.id,
            classroom_id=classroom_id,
            is_active=True
        ).first()
        
        if not (is_head_teacher or has_assignment):
            return jsonify({'message': 'No access to this classroom'}), 403

    attendances = Attendance.query.filter_by(classroom_id=classroom_id, date=attendance_date).all()
    return jsonify([att.to_dict() for att in attendances])


@attendance_bp.route('/student/<int:student_id>', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def get_student_attendance(current_user, student_id):
    try:
        student = Student.query.get_or_404(student_id)
        logger.info(f"Retrieving attendance for student {student_id}")
        
        # Check access permissions
        if current_user.role == "teacher":  # Fixed: String comparison
            teacher = current_user.teacher_profile
            if not teacher:
                logger.error(f"Teacher profile not found for user {current_user.id}")
                return jsonify({'message': 'Teacher profile not found'}), 403
                
            # Check if teacher has access to this student
            has_access = False
            
            # Head teacher access
            if teacher.is_head_teacher and student.classroom and student.classroom.head_teacher_id == teacher.id:
                has_access = True
                logger.debug(f"Head teacher {teacher.id} has access to student {student_id}")
            
            # Assignment access
            if not has_access and student.classroom_id:
                assignment = TeacherAssignment.query.filter_by(
                    teacher_id=teacher.id,
                    classroom_id=student.classroom_id,
                    is_active=True
                ).first()
                has_access = bool(assignment)
                if has_access:
                    logger.debug(f"Teacher {teacher.id} has assignment access to student {student_id}")
            
            if not has_access:
                logger.warning(f"Teacher {teacher.id} denied access to student {student_id}")
                return jsonify({'message': 'No access to this student'}), 403
        
        # Get attendance records
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = Attendance.query.filter_by(student_id=student_id)
        
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(Attendance.date >= start_date_obj)
                logger.debug(f"Filtering from start_date: {start_date}")
            except ValueError:
                logger.error(f"Invalid start_date format: {start_date}")
                return jsonify({'message': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(Attendance.date <= end_date_obj)
                logger.debug(f"Filtering to end_date: {end_date}")
            except ValueError:
                logger.error(f"Invalid end_date format: {end_date}")
                return jsonify({'message': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
        
        attendances = query.order_by(Attendance.date.desc()).all()
        logger.info(f"Retrieved {len(attendances)} attendance records for student {student_id}")
        
        response_data = [att.to_dict() for att in attendances]
        logger.debug(f"Student attendance count: {len(response_data)}")
        
        return jsonify(response_data)
    except Exception as e:
        logger.error(f"Error retrieving student attendance: {str(e)}")
        return jsonify({'message': str(e)}), 400

@attendance_bp.route('/teacher/<int:teacher_id>', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def get_teacher_attendance(current_user, teacher_id):
    # Check permissions
    if current_user.role == "teacher":  # Fixed: String comparison
        # Teachers can only view their own attendance records
        if current_user.teacher_profile.id != teacher_id:
            logger.warning(f"Teacher {current_user.teacher_profile.id} denied access to teacher {teacher_id} attendance")
            return jsonify({'message': 'Access denied'}), 403
    
    try:
        teacher = Teacher.query.get_or_404(teacher_id)
        logger.info(f"Retrieving attendance records for teacher {teacher_id}")
        
        # Get all attendance records for classrooms this teacher is responsible for
        date_str = request.args.get('date')
        
        # Get teacher's classrooms
        head_classrooms = Classroom.query.filter_by(head_teacher_id=teacher_id).all()
        assigned_classrooms = db.session.query(Classroom).join(
            TeacherAssignment,
            Classroom.id == TeacherAssignment.classroom_id
        ).filter(
            TeacherAssignment.teacher_id == teacher_id,
            TeacherAssignment.is_active == True
        ).distinct().all()
        
        all_classroom_ids = list(set([c.id for c in head_classrooms + assigned_classrooms]))
        logger.info(f"Teacher {teacher_id} has access to {len(all_classroom_ids)} classrooms")
        
        if not all_classroom_ids:
            logger.info(f"Teacher {teacher_id} has no assigned classrooms")
            return jsonify([])
        
        query = Attendance.query.filter(Attendance.classroom_id.in_(all_classroom_ids))
        
        if date_str:
            try:
                attendance_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                query = query.filter_by(date=attendance_date)
                logger.debug(f"Filtering attendance for date: {attendance_date}")
            except ValueError:
                logger.error(f"Invalid date format: {date_str}")
                return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        attendances = query.order_by(Attendance.date.desc()).all()
        logger.info(f"Retrieved {len(attendances)} attendance records for teacher {teacher_id}")
        
        response_data = [att.to_dict() for att in attendances]
        logger.debug(f"Teacher attendance records count: {len(response_data)}")
        
        return jsonify(response_data)
    except Exception as e:
        logger.error(f"Error retrieving teacher attendance: {str(e)}")
        return jsonify({'message': str(e)}), 400

@attendance_bp.route('/<int:attendance_id>', methods=['PUT'])
@jwt_required()
@role_required(['teacher', 'admin'])
@log_action('UPDATE_ATTENDANCE', 'attendance')
def update_attendance(current_user, attendance_id):
    try:
        attendance = Attendance.query.get_or_404(attendance_id)
        data = request.get_json()
        
        old_status = attendance.status
        logger.info(f"Updating attendance {attendance_id} - Old status: {old_status}")

        # Verify teacher has permission
        if current_user.role == "teacher":  # Fixed: String comparison
            teacher = current_user.teacher_profile
            if not teacher:
                logger.error(f"Teacher profile not found for user {current_user.id}")
                return jsonify({'message': 'Teacher profile not found'}), 403
                
            if attendance.recorded_by != current_user.id:
                # Or check if the user is a head teacher for that classroom
                is_head_teacher = teacher.is_head_teacher and Classroom.query.filter_by(id=attendance.classroom_id, head_teacher_id=teacher.id).first()
                if not is_head_teacher:
                    logger.warning(f"Teacher {teacher.id} denied permission to update attendance {attendance_id}")
                    return jsonify({'message': 'You do not have permission to update this record'}), 403

        new_status = data.get('status')
        if not new_status:
            logger.error("Status field missing in attendance update")
            return jsonify({'message': 'Status is required'}), 400

        attendance.status = new_status
        attendance.updated_at = datetime.utcnow()
        db.session.commit()

        response_data = {
            'message': 'Attendance updated successfully', 
            'attendance': attendance.to_dict()
        }
        
        logger.info(f"Attendance {attendance_id} updated - Old status: {old_status}, New status: {new_status}")
        return jsonify(response_data)
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating attendance {attendance_id}: {str(e)}")
        return jsonify({'message': str(e)}), 400

@attendance_bp.route('/<int:attendance_id>', methods=['DELETE'])
@jwt_required()
@role_required(['teacher', 'admin'])
@log_action('DELETE_ATTENDANCE', 'attendance')
def delete_attendance(current_user, attendance_id):
    try:
        attendance = Attendance.query.get_or_404(attendance_id)
        attendance_data = attendance.to_dict()
        
        logger.info(f"Attempting to delete attendance {attendance_id}: {attendance_data}")

        # Verify teacher has permission
        if current_user.role == "teacher":  # Fixed: String comparison
            teacher = current_user.teacher_profile
            if not teacher:
                logger.error(f"Teacher profile not found for user {current_user.id}")
                return jsonify({'message': 'Teacher profile not found'}), 403
                
            if attendance.recorded_by != current_user.id:
                # Or check if the user is a head teacher for that classroom
                is_head_teacher = teacher.is_head_teacher and Classroom.query.filter_by(id=attendance.classroom_id, head_teacher_id=teacher.id).first()
                if not is_head_teacher:
                    logger.warning(f"Teacher {teacher.id} denied permission to delete attendance {attendance_id}")
                    return jsonify({'message': 'You do not have permission to delete this record'}), 403

        db.session.delete(attendance)
        db.session.commit()

        logger.info(f"Attendance record {attendance_id} deleted successfully")
        return jsonify({'message': 'Attendance record deleted successfully'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting attendance {attendance_id}: {str(e)}")
        return jsonify({'message': str(e)}), 400