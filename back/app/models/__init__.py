# app/models/__init__.py
from app.models.user import User
from app.models.student import Student
from back.app.models.Teacher import Teacher
from app.models.classroom import Classroom
from app.models.subject import Subject
from app.models.grade import Grade
from app.models.report_card import ReportCard
from app.models.audit_log import AuditLog
from app.models.evaluation_period import EvaluationPeriod
from app.models.teacher_assignment import TeacherAssignment

__all__ = [
    'User', 'Student', 'Teacher', 'Classroom', 'Subject', 
    'Grade', 'ReportCard', 'AuditLog', 'EvaluationPeriod', 'TeacherAssignment'
]
