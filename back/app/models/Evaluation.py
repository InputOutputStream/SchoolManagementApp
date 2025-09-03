# app/models/evaluation.py
from app import db
from datetime import datetime

class Evaluation(db.Model):
    __tablename__ = 'evaluation'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    academic_year = db.Column(db.String(10), nullable=False)
    max_students = db.Column(db.Integer, default=30)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    grades = db.relationship('Grade', backref='evaluation', lazy=True)
    report_cards = db.relationship('ReportCard', backref='evaluation', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'max_students': self.max_students,
            'academic_year': self.academic_year,
            'is_active': self.is_active
        }

