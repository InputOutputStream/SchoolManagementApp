# app/models/grade.py
from app import db
from datetime import datetime

class Grade(db.Model):
    __tablename__ = 'grades'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    evaluation_id = db.Column(db.Integer, db.ForeignKey('evaluations.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)  # Added foreign key
    
    # Score info
    points_earned = db.Column(db.Numeric(6, 2), nullable=False)
    points_possible = db.Column(db.Numeric(6, 2), nullable=False)
    percentage = db.Column(db.Numeric(5, 2))
    letter_grade = db.Column(db.String(5))
    
    # Additional info
    comments = db.Column(db.Text)
    is_excused = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # Relationships
    student = db.relationship('Student', backref='grades')
    subject = db.relationship('Subject', backref='grades')  # Added relationship
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_grades')
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'evaluation_id': self.evaluation_id,
            'subject_id': self.subject_id,
            'points_earned': float(self.points_earned),
            'points_possible': float(self.points_possible),
            'percentage': float(self.percentage) if self.percentage else None,
            'letter_grade': self.letter_grade,
            'comments': self.comments,
            'is_excused': self.is_excused,
            'created_at': self.created_at.isoformat(),
            'created_by': self.created_by,
            'student': self.student.to_dict() if self.student else None,
            'evaluation': self.evaluation.to_dict() if self.evaluation else None,
            'subject': self.subject.to_dict() if self.subject else None
        }