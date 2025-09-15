# app/routes/reports.py
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required
from app.models.ReportCard import ReportCard
from app.models.Student import Student
from app.models.Grade import Grade
from app.models.Classroom import Classroom
from app.models.TeacherAssignment import TeacherAssignment
from app.models.User import UserRole
from app.services.ReportService import ReportService
from app.utils.decorators import role_required, log_action
from app import db

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/generate/<int:student_id>/<int:period_id>', methods=['POST'])
@jwt_required()
@role_required(['teacher', 'admin'])
@log_action('GENERATE_REPORT', 'report_cards')
def generate_report(current_user, student_id, period_id):
    student = Student.query.get_or_404(student_id)
    
    # Check permissions
    if current_user.role == UserRole.TEACHER:
        teacher = current_user.teacher_profile
        if not teacher:
            return jsonify({'message': 'Teacher profile not found'}), 403
        
        # Only head teacher of student's classroom can generate report
        if not (teacher.is_head_teacher and student.classroom and 
                student.classroom.head_teacher_id == teacher.id):
            return jsonify({'message': 'Only head teacher can generate reports'}), 403
    
    data = request.get_json()
    
    try:
        report_card = ReportService.generate_report_card(
            student_id, 
            period_id, 
            current_user.teacher_profile.id if current_user.role == UserRole.TEACHER else data.get('teacher_id'), 
            data.get('teacher_comments')
        )
        
        return jsonify({
            'message': 'Report card generated successfully',
            'report_card': report_card.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@reports_bp.route('/classroom/<int:classroom_id>/period/<int:period_id>', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def get_classroom_reports(current_user, classroom_id, period_id):
    # Check permissions
    if current_user.role == UserRole.TEACHER:
        teacher = current_user.teacher_profile
        if not teacher:
            return jsonify({'message': 'Teacher profile not found'}), 403
        
        # Check if head teacher of this classroom or has assignment
        is_head_teacher = teacher.is_head_teacher and \
                         Classroom.query.filter_by(id=classroom_id, head_teacher_id=teacher.id).first()
        
        has_assignment = TeacherAssignment.query.filter_by(
            teacher_id=teacher.id,
            classroom_id=classroom_id,
            is_active=True
        ).first()
        
        if not (is_head_teacher or has_assignment):
            return jsonify({'message': 'No access to this classroom'}), 403
    
    reports = ReportCard.query.join(Student).filter(
        Student.classroom_id == classroom_id,
        Student.is_enrolled == True,
        ReportCard.evaluation_period_id == period_id
    ).all()
    
    return jsonify([report.to_dict() for report in reports])

@reports_bp.route('/teacher/<int:teacher_id>/period/<int:period_id>', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def get_teacher_reports(current_user, teacher_id, period_id):
    # Check permissions
    if current_user.role == UserRole.TEACHER:
        teacher = current_user.teacher_profile
        if not teacher or teacher.id != teacher_id:
            return jsonify({'message': 'Access denied'}), 403
    
    # Get reports for students in teacher's classrooms
    teacher_classrooms = Classroom.query.filter_by(head_teacher_id=teacher_id).all()
    assigned_classrooms = db.session.query(Classroom).join(
        TeacherAssignment,
        Classroom.id == TeacherAssignment.classroom_id
    ).filter(
        TeacherAssignment.teacher_id == teacher_id,
        TeacherAssignment.is_active == True
    ).distinct().all()
    
    all_classroom_ids = list(set([c.id for c in teacher_classrooms + assigned_classrooms]))
    
    if not all_classroom_ids:
        return jsonify([])
    
    reports = ReportCard.query.join(Student).filter(
        Student.classroom_id.in_(all_classroom_ids),
        Student.is_enrolled == True,
        ReportCard.evaluation_period_id == period_id
    ).all()
    
    return jsonify([report.to_dict() for report in reports])

@reports_bp.route('/<int:report_id>/download', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def download_report(current_user, report_id):
    report = ReportCard.query.get_or_404(report_id)
    student = report.student
    
    # Check permissions
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
            return jsonify({'message': 'No access to this report'}), 403
    
    try:
        # Generate PDF or other format
        file_path = ReportService.generate_report_pdf(report_id)
        return send_file(
            file_path,
            as_attachment=True,
            download_name=f'report_card_{student.student_number}_{report.evaluation_period_id}.pdf'
        )
    except Exception as e:
        return jsonify({'message': f'Failed to generate report: {str(e)}'}), 500