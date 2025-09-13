# app/models/Attendance.py
from app import db
from datetime import datetime

class Attendance(db.Model):
    __tablename__ = 'attendances'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    classroom_id = db.Column(db.Integer, db.ForeignKey('classrooms.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(50), nullable=False)  # e.g., 'present', 'absent', 'late', 'excused'
    recorded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    student = db.relationship('Student', backref='attendances')
    classroom = db.relationship('Classroom', backref='attendances')
    recorder = db.relationship('User', backref='recorded_attendances')

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'classroom_id': self.classroom_id,
            'date': self.date.isoformat(),
            'status': self.status,
            'recorded_by': self.recorded_by,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
