# app/routes/attendance.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.Attendance import Attendance
from app.models.Student import Student
from app.models.Classroom import Classroom
from app.models.Teacher import Teacher
from app.models.TeacherAssignment import TeacherAssignment
from app.models.User import UserRole
from app.utils.decorators import role_required, log_action
from app import db
from datetime import datetime

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

    # Verify teacher has access to this classroom
    if current_user.role == UserRole.TEACHER:
        teacher = current_user.teacher_profile
        if not teacher:
            return jsonify({'message': 'Teacher profile not found'}), 403
            
        assignment = TeacherAssignment.query.filter_by(
            teacher_id=teacher.id,
            classroom_id=classroom_id,
            is_active=True
        ).first()
        is_head_teacher = teacher.is_head_teacher and Classroom.query.filter_by(id=classroom_id, head_teacher_id=teacher.id).first()

        if not assignment and not is_head_teacher:
            return jsonify({'message': 'You do not have access to this classroom'}), 403

    # Delete existing records for this classroom and date to prevent duplicates
    Attendance.query.filter_by(classroom_id=classroom_id, date=attendance_date).delete()

    new_attendances = []
    for record in records:
        student_id = record.get('student_id')
        status = record.get('status')

        # Verify student belongs to the classroom
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

    attendances = Attendance.query.filter_by(classroom_id=classroom_id, date=attendance_date).all()
    return jsonify([att.to_dict() for att in attendances])

@attendance_bp.route('/student/<int:student_id>', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def get_student_attendance(current_user, student_id):
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
    
    # Get attendance records
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = Attendance.query.filter_by(student_id=student_id)
    
    if start_date:
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(Attendance.date >= start_date)
        except ValueError:
            return jsonify({'message': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
    
    if end_date:
        try:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(Attendance.date <= end_date)
        except ValueError:
            return jsonify({'message': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
    
    attendances = query.order_by(Attendance.date.desc()).all()
    return jsonify([att.to_dict() for att in attendances])

@attendance_bp.route('/teacher/<int:teacher_id>', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def get_teacher_attendance(current_user, teacher_id):
    # Check permissions
    if current_user.role == UserRole.TEACHER:
        # Teachers can only view their own attendance records
        if current_user.teacher_profile.id != teacher_id:
            return jsonify({'message': 'Access denied'}), 403
    
    teacher = Teacher.query.get_or_404(teacher_id)
    
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
    
    if not all_classroom_ids:
        return jsonify([])
    
    query = Attendance.query.filter(Attendance.classroom_id.in_(all_classroom_ids))
    
    if date_str:
        try:
            attendance_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            query = query.filter_by(date=attendance_date)
        except ValueError:
            return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    attendances = query.order_by(Attendance.date.desc()).all()
    return jsonify([att.to_dict() for att in attendances])

@attendance_bp.route('/<int:attendance_id>', methods=['PUT'])
@jwt_required()
@role_required(['teacher', 'admin'])
@log_action('UPDATE_ATTENDANCE', 'attendance')
def update_attendance(current_user, attendance_id):
    attendance = Attendance.query.get_or_404(attendance_id)
    data = request.get_json()

    # Verify teacher has permission
    if current_user.role == UserRole.TEACHER:
        teacher = current_user.teacher_profile
        if not teacher:
            return jsonify({'message': 'Teacher profile not found'}), 403
            
        if attendance.recorded_by != current_user.id:
            # Or check if the user is a head teacher for that classroom
            is_head_teacher = teacher.is_head_teacher and Classroom.query.filter_by(id=attendance.classroom_id, head_teacher_id=teacher.id).first()
            if not is_head_teacher:
                return jsonify({'message': 'You do not have permission to update this record'}), 403

    new_status = data.get('status')
    if not new_status:
        return jsonify({'message': 'Status is required'}), 400

    attendance.status = new_status
    attendance.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({'message': 'Attendance updated successfully', 'attendance': attendance.to_dict()})

@attendance_bp.route('/<int:attendance_id>', methods=['DELETE'])
@jwt_required()
@role_required(['teacher', 'admin'])
@log_action('DELETE_ATTENDANCE', 'attendance')
def delete_attendance(current_user, attendance_id):
    attendance = Attendance.query.get_or_404(attendance_id)

    # Verify teacher has permission
    if current_user.role == UserRole.TEACHER:
        teacher = current_user.teacher_profile
        if not teacher:
            return jsonify({'message': 'Teacher profile not found'}), 403
            
        if attendance.recorded_by != current_user.id:
            # Or check if the user is a head teacher for that classroom
            is_head_teacher = teacher.is_head_teacher and Classroom.query.filter_by(id=attendance.classroom_id, head_teacher_id=teacher.id).first()
            if not is_head_teacher:
                return jsonify({'message': 'You do not have permission to delete this record'}), 403

    db.session.delete(attendance)
    db.session.commit()

    return jsonify({'message': 'Attendance record deleted successfully'})