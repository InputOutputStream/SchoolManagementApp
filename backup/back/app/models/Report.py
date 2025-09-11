# app/models/report.py
from app import db
from datetime import datetime

class ReportCard(db.Model):
    __tablename__ = 'report'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    evaluation_id = db.Column(db.Integer, db.ForeignKey('evaluations.id'), nullable=False)
    generated_by = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=False)
    generation_date = db.Column(db.DateTime, default=datetime.utcnow())
    overall_average = db.Column(db.Numeric(4, 2))
    total_students = db.Column(db.Integer)
    appreciation = db.Column(db.Text)
    file_path = db.Column(db.String(500))
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'evaluation_period_id': self.evaluation_id,
            'generated_by': self.generated_by,
            'generation_date': self.generation_date.isoformat(),
            'overall_average': float(self.overall_average) if self.overall_average else None,
            'total_students': self.total_students,
            'appreciation': self.appreciation,
            'file_path': self.file_path,
            'student': self.student.to_dict() if self.student else None,
            'evaluation_period': self.evaluation.to_dict() if self.evaluation else None
        }
