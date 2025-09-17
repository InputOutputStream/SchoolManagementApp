# app/models/evaluation_period.py
from app import db
from datetime import datetime, date

class EvaluationPeriod(db.Model):
    """
    Represents academic periods when evaluations happen
    Examples: "First Quarter 2024-2025", "Mid-term 2024-2025", "Final Exams 2024-2025"
    """
    __tablename__ = 'evaluation_periods'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # e.g., "First Quarter", "Mid-term"
    academic_year = db.Column(db.String(10), nullable=False)  # e.g., "2024-2025"
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships - Remove backref conflicts
    evaluations = db.relationship('Evaluation', backref='evaluation_period', lazy=True)
    # Remove the conflicting line: report_cards relationship will be defined in ReportCard
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'academic_year': self.academic_year,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'evaluations_count': len(self.evaluations),
            'report_cards_count': len(self.report_cards) if hasattr(self, 'report_cards') else 0
        }