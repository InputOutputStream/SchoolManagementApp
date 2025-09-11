# app/models/evaluation.py  
from app import db
from datetime import datetime, date

class EvaluationType(db.Model):
    """
    Types of evaluations: Quiz, Test, Exam, Assignment, etc.
    """
    __tablename__ = 'evaluation_types'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)  # "Quiz", "Test", "Exam"
    description = db.Column(db.Text)
    default_weight = db.Column(db.Float, default=1.0)  # For weighted averages
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'default_weight': self.default_weight
        }


class Evaluation(db.Model):
    """
    Specific evaluation instances - the actual tests/assignments given to students
    Examples: "Math Quiz #1", "Physics Final Exam", "Literature Essay"
    """
    __tablename__ = 'evaluations'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)  # "Math Quiz #1"
    description = db.Column(db.Text)
    
    # What evaluation this is
    evaluation_period_id = db.Column(db.Integer, db.ForeignKey('evaluation_periods.id'), nullable=False)
    evaluation_type_id = db.Column(db.Integer, db.ForeignKey('evaluation_types.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    classroom_id = db.Column(db.Integer, db.ForeignKey('classrooms.id'), nullable=False)
    
    # When and who
    evaluation_date = db.Column(db.Date, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=False)
    
    # Grading info
    max_points = db.Column(db.Numeric(6, 2), default=20.00)  # Out of 20 (or 100, etc.)
    weight = db.Column(db.Float, default=1.0)  # For weighted averages
    
    # Status
    is_published = db.Column(db.Boolean, default=False)  # Are results visible to students?
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    evaluation_type = db.relationship('EvaluationType', backref='evaluations')
    subject = db.relationship('Subject', backref='evaluations')
    classroom = db.relationship('Classroom', backref='evaluations')
    creator = db.relationship('Teacher', foreign_keys=[created_by], backref='created_evaluations')
    grades = db.relationship('Grade', backref='evaluation', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'evaluation_period_id': self.evaluation_period_id,
            'evaluation_type_id': self.evaluation_type_id,
            'subject_id': self.subject_id,
            'classroom_id': self.classroom_id,
            'evaluation_date': self.evaluation_date.isoformat(),
            'created_by': self.created_by,
            'max_points': float(self.max_points),
            'weight': self.weight,
            'is_published': self.is_published,
            'created_at': self.created_at.isoformat(),
            'evaluation_period': self.evaluation_period.to_dict() if self.evaluation_period else None,
            'evaluation_type': self.evaluation_type.to_dict() if self.evaluation_type else None,
            'subject': self.subject.to_dict() if self.subject else None,
            'classroom': self.classroom.to_dict() if self.classroom else None,
            'grades_count': len(self.grades)
        }
