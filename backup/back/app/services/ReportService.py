
# app/services/report_service.py
from app.models.ReportCard import ReportCard
from app.models.Grade import Grade
from app.models.Student import Student
from app.models.Subject import Subject
from app import db
from sqlalchemy import func
import os

class ReportService:
    @staticmethod
    def generate_report_card(student_id, period_id, teacher_id, comments=None):
        # Calculate overall average
        grades = Grade.query.join(Subject).filter(
            Grade.student_id == student_id,
            Grade.evaluation_period_id == period_id
        ).all()
        
        if not grades:
            raise ValueError("No grades found for this period")
        
        # Calculate weighted average
        total_points = 0
        total_coefficients = 0
        
        subjects_grades = {}
        for grade in grades:
            subject_id = grade.subject_id
            if subject_id not in subjects_grades:
                subjects_grades[subject_id] = {
                    'grades': [],
                    'coefficient': grade.subject.coefficient
                }
            subjects_grades[subject_id]['grades'].append(float(grade.grade))
        
        # Calculate average per subject
        for subject_id, data in subjects_grades.items():
            avg = sum(data['grades']) / len(data['grades'])
            total_points += avg * data['coefficient']
            total_coefficients += data['coefficient']
        
        overall_average = total_points / total_coefficients if total_coefficients > 0 else 0
        
        # Calculate class rank (simplified)
        student = Student.query.get(student_id)
        class_students = Student.query.filter_by(
            classroom_id=student.classroom_id,
            is_enrolled=True
        ).count()
        
        # Check if report already exists
        existing_report = ReportCard.query.filter_by(
            student_id=student_id,
            evaluation_period_id=period_id
        ).first()
        
        if existing_report:
            existing_report.overall_average = overall_average
            existing_report.teacher_comments = comments
            existing_report.generated_by = teacher_id
            db.session.commit()
            return existing_report
        
        # Create new report card
        report_card = ReportCard(
            student_id=student_id,
            evaluation_period_id=period_id,
            generated_by=teacher_id,
            overall_average=overall_average,
            class_rank=1,  # Simplified - should calculate actual rank
            total_students=class_students,
            teacher_comments=comments
        )
        
        db.session.add(report_card)
        db.session.commit()
        
        return report_card