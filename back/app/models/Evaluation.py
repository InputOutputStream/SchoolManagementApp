# app/models/Evaluation.py
from app import db
from datetime import datetime, date

class EvaluationType(db.Model):
    __tablename__ = 'evaluation_types'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    description = db.Column(db.Text)
    default_weight = db.Column(db.Float, default=1.0)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'default_weight': self.default_weight
        }

class Evaluation(db.Model):
    __tablename__ = 'evaluations'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    
    evaluation_period_id = db.Column(db.Integer, db.ForeignKey('evaluation_periods.id'), nullable=False)
    evaluation_type_id = db.Column(db.Integer, db.ForeignKey('evaluation_types.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    classroom_id = db.Column(db.Integer, db.ForeignKey('classrooms.id'), nullable=False)
    
    evaluation_date = db.Column(db.Date, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=False)
    
    max_points = db.Column(db.Numeric(6, 2), default=20.00)
    weight = db.Column(db.Float, default=1.0)
    
    is_published = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Fixed relationships - removed conflicting backref
    evaluation_type = db.relationship('EvaluationType', backref='evaluations')
    subject = db.relationship('Subject', backref='evaluations')
    classroom = db.relationship('Classroom', backref='evaluations')
    # Remove this line completely - backref defined in Teacher model
    # creator = db.relationship('Teacher', foreign_keys=[created_by], backref='created_evaluations')
    
    def to_dict(self, include_relationships=True):
        result = {
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
            'grades_count': len(self.grades)
        }
        
        if include_relationships:
            result.update({
                'evaluation_period': self.evaluation_period.to_dict() if self.evaluation_period else None,
                'evaluation_type': self.evaluation_type.to_dict() if self.evaluation_type else None,
                'subject': self.subject.to_dict() if self.subject else None,
                'classroom': self.classroom.to_dict(include_relationships=False) if self.classroom else None
            })
        
        return result