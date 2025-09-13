# app/routes/attendance.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.Attendance import Attendance
from app.models.Student import Student
from app.models.Classroom import Classroom
from app.models.TeacherAssignment import TeacherAssignment
from app.utils.decorators import role_required, log_action
from app import db
from datetime import datetime

attendance_bp = Blueprint('attendance', __name__)

@attendance_bp.route('/', methods=['POST'])
@jwt_required()
@role_required('teacher')
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
    teacher = current_user.teacher_profile
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
@role_required('teacher')
def get_classroom_attendance(current_user, classroom_id):
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'message': 'Date parameter is required'}), 400

    try:
        attendance_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400

    attendances = Attendance.query.filter_by(classroom_id=classroom_id, date=attendance_date).all()
    return jsonify([att.to_dict() for att in attendances])

@attendance_bp.route('/<int:attendance_id>', methods=['PUT'])
@jwt_required()
@role_required('teacher')
@log_action('UPDATE_ATTENDANCE', 'attendance')
def update_attendance(current_user, attendance_id):
    attendance = Attendance.query.get_or_404(attendance_id)
    data = request.get_json()

    # Verify teacher has permission
    if attendance.recorded_by != current_user.id:
        # Or check if the user is a head teacher for that classroom
        teacher = current_user.teacher_profile
        is_head_teacher = teacher.is_head_teacher and Classroom.query.filter_by(id=attendance.classroom_id, head_teacher_id=teacher.id).first()
        if not is_head_teacher:
            return jsonify({'message': 'You do not have permission to update this record'}), 403

    new_status = data.get('status')
    if not new_status:
        return jsonify({'message': 'Status is required'}), 400

    attendance.status = new_status
    db.session.commit()

    return jsonify({'message': 'Attendance updated successfully', 'attendance': attendance.to_dict()})
