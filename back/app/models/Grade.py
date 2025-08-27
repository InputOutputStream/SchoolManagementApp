# app/models/grade.py
from app import db
from datetime import datetime, date

class Grade(db.Model):
    __tablename__ = 'grades'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=False)
    evaluation_period_id = db.Column(db.Integer, db.ForeignKey('evaluation_periods.id'), nullable=False)
    grade = db.Column(db.Numeric(4, 2), nullable=False)
    max_grade = db.Column(db.Numeric(4, 2), default=20)
    evaluation_type = db.Column(db.String(50))
    evaluation_name = db.Column(db.String(200))
    evaluation_date = db.Column(db.Date)
    comments = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_grades')
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'subject_id': self.subject_id,
            'teacher_id': self.teacher_id,
            'evaluation_period_id': self.evaluation_period_id,
            'grade': float(self.grade),
            'max_grade': float(self.max_grade),
            'evaluation_type': self.evaluation_type,
            'evaluation_name': self.evaluation_name,
            'evaluation_date': self.evaluation_date.isoformat() if self.evaluation_date else None,
            'comments': self.comments,
            'created_at': self.created_at.isoformat(),
            'created_by': self.created_by,
            'student': self.student.user.to_dict() if self.student and self.student.user else None,
            'subject': self.subject.to_dict() if self.subject else None,
            'teacher': self.teacher.user.to_dict() if self.teacher and self.teacher.user else None
        }
