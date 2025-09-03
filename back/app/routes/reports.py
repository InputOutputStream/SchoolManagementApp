# app/routes/reports.py
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required
from app.models.ReportCard import ReportCard
from app.models.Student import Student
from app.models.Grade import Grade
from app.models.Classroom import Classroom
from app.services.ReportService import ReportService
from app.utils.decorators import role_required, log_action
from app import db

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/generate/<int:student_id>/<int:period_id>', methods=['POST'])
@jwt_required()
@role_required('teacher')
@log_action('GENERATE_REPORT', 'report_cards')
def generate_report(current_user, student_id, period_id):
    teacher = current_user.teacher_profile
    student = Student.query.get_or_404(student_id)
    
    # Only head teacher of student's classroom can generate report
    if not (teacher.is_head_teacher and student.classroom and 
            student.classroom.head_teacher_id == teacher.id):
        return jsonify({'message': 'Only head teacher can generate reports'}), 403
    
    data = request.get_json()
    
    try:
        report_card = ReportService.generate_report_card(
            student_id, period_id, teacher.id, data.get('teacher_comments')
        )
        
        return jsonify({
            'message': 'Report card generated successfully',
            'report_card': report_card.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@reports_bp.route('/classroom/<int:classroom_id>/period/<int:period_id>', methods=['GET'])
@jwt_required()
@role_required('teacher')
def get_classroom_reports(current_user, classroom_id, period_id):
    teacher = current_user.teacher_profile
    
    # Only head teacher can view all reports
    if not (teacher.is_head_teacher and 
            Classroom.query.filter_by(id=classroom_id, head_teacher_id=teacher.id).first()):
        return jsonify({'message': 'Only head teacher can view classroom reports'}), 403
    
    reports = ReportCard.query.join(Student).filter(
        Student.classroom_id == classroom_id,
        ReportCard.evaluation_period_id == period_id
    ).all()
    
    return jsonify([report.to_dict() for report in reports])
