# app/models/report_card.py
from app import db
from datetime import datetime

class ReportCard(db.Model):
    __tablename__ = 'report_cards'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    evaluation_period_id = db.Column(db.Integer, db.ForeignKey('evaluation_periods.id'), nullable=False)
    generated_by = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=False)
    generation_date = db.Column(db.DateTime, default=datetime.utcnow)
    overall_average = db.Column(db.Numeric(4, 2))
    class_rank = db.Column(db.Integer)
    total_students = db.Column(db.Integer)
    teacher_comments = db.Column(db.Text)
    file_path = db.Column(db.String(500))
    
    # Fixed relationship with explicit foreign_keys
    generator = db.relationship(
        'Teacher',
        foreign_keys=[generated_by],
        backref=db.backref('generated_report_cards', lazy=True)
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'evaluation_period_id': self.evaluation_period_id,
            'generated_by': self.generated_by,
            'generation_date': self.generation_date.isoformat(),
            'overall_average': float(self.overall_average) if self.overall_average else None,
            'class_rank': self.class_rank,
            'total_students': self.total_students,
            'teacher_comments': self.teacher_comments,
            'file_path': self.file_path,
            'student': self.student.to_dict() if self.student else None,
            'evaluation_period': self.evaluation_period.to_dict() if self.evaluation_period else None
        }