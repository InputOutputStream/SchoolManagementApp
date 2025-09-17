# app/routes/reports.py
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required
from app.models.ReportCard import ReportCard
from app.models.Student import Student
from app.models.Grade import Grade
from app.models.Classroom import Classroom
from app.models.TeacherAssignment import TeacherAssignment
from app.services.ReportService import ReportService
from app.utils.decorators import role_required, log_action
from app import db
import logging

logger = logging.getLogger(__name__)
reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/generate/<int:student_id>/<int:period_id>', methods=['POST'])
@jwt_required()
@role_required(['teacher', 'admin'])
@log_action('GENERATE_REPORT', 'report_cards')
def generate_report(current_user, student_id, period_id):
    student = Student.query.get_or_404(student_id)
    
    if current_user.role == 'teacher':  # Fixed: String comparison
        teacher = current_user.teacher_profile
        if not teacher:
            return jsonify({'message': 'Teacher profile not found'}), 403
        
        if not (teacher.is_head_teacher and student.classroom and 
                student.classroom.head_teacher_id == teacher.id):
            return jsonify({'message': 'Only head teacher can generate reports'}), 403
    
    try:
        data = request.get_json() or {}
        
        report_card = ReportService.generate_report_card(
            student_id, 
            period_id, 
            current_user.teacher_profile.id if current_user.role == 'teacher' else data.get('teacher_id'), 
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
    try:
        # Check permissions
        if current_user.role == "teacher":  # Fixed: String comparison
            teacher = current_user.teacher_profile
            if not teacher or teacher.id != teacher_id:
                logger.warning(f"Teacher {teacher.id if teacher else 'None'} denied access to teacher {teacher_id} reports")
                return jsonify({'message': 'Access denied'}), 403
        
        logger.info(f"Retrieving reports for teacher {teacher_id}, period {period_id}")
        
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
        logger.info(f"Teacher {teacher_id} has access to {len(all_classroom_ids)} classrooms")
        
        if not all_classroom_ids:
            logger.info(f"Teacher {teacher_id} has no assigned classrooms")
            return jsonify([])
        
        reports = ReportCard.query.join(Student).filter(
            Student.classroom_id.in_(all_classroom_ids),
            Student.is_enrolled == True,
            ReportCard.evaluation_period_id == period_id
        ).all()
        
        logger.info(f"Retrieved {len(reports)} reports for teacher {teacher_id}, period {period_id}")
        
        response_data = [report.to_dict() for report in reports]
        logger.debug(f"Teacher reports count: {len(response_data)}")
        
        return jsonify(response_data)
    except Exception as e:
        logger.error(f"Error retrieving teacher reports: {str(e)}")
        return jsonify({'message': str(e)}), 400

@reports_bp.route('/<int:report_id>/download', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def download_report(current_user, report_id):
    try:
        report = ReportCard.query.get_or_404(report_id)
        student = report.student
        
        logger.info(f"Downloading report {report_id} for student {student.id}")
        
        # Check permissions
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
                logger.debug(f"Head teacher {teacher.id} has access to report {report_id}")
            
            # Assignment access
            if not has_access and student.classroom_id:
                assignment = TeacherAssignment.query.filter_by(
                    teacher_id=teacher.id,
                    classroom_id=student.classroom_id,
                    is_active=True
                ).first()
                has_access = bool(assignment)
                if has_access:
                    logger.debug(f"Teacher {teacher.id} has assignment access to report {report_id}")
            
            if not has_access:
                logger.warning(f"Teacher {teacher.id} denied access to report {report_id}")
                return jsonify({'message': 'No access to this report'}), 403
        
        # Generate PDF or other format
        file_path = ReportService.generate_report_pdf(report_id)
        logger.info(f"Report PDF generated at: {file_path}")
        
        return send_file(
            file_path,
            as_attachment=True,
            download_name=f'report_card_{student.student_number}_{report.evaluation_period_id}.pdf'
        )
    except Exception as e:
        logger.error(f"Failed to generate/download report {report_id}: {str(e)}")
        return jsonify({'message': f'Failed to generate report: {str(e)}'}), 500