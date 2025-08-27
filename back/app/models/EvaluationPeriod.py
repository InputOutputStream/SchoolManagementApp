# app/models/evaluation_period.py
from app import db
from datetime import datetime, date

class EvaluationPeriod(db.Model):
    __tablename__ = 'evaluation_periods'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    academic_year = db.Column(db.String(10), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    grades = db.relationship('Grade', backref='evaluation_period', lazy=True)
    report_cards = db.relationship('ReportCard', backref='evaluation_period', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'academic_year': self.academic_year,
            'is_active': self.is_active
        }

