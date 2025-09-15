# app/models/Student.py
from app import db
from datetime import datetime, date

class Student(db.Model):
    __tablename__ = 'students'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    student_number = db.Column(db.String(20), unique=True, nullable=False)
    classroom_id = db.Column(db.Integer, db.ForeignKey('classrooms.id'))
    date_of_birth = db.Column(db.Date)
    address = db.Column(db.Text)
    phone = db.Column(db.String(20))
    parent_name = db.Column(db.String(200))
    parent_email = db.Column(db.String(255))
    parent_phone = db.Column(db.String(20))
    enrollment_date = db.Column(db.Date, default=date.today)
    is_enrolled = db.Column(db.Boolean, default=True)
    
    # Fixed relationships using back_populates
    user = db.relationship('User', foreign_keys=[user_id], back_populates='student_profile')
    classroom = db.relationship('Classroom', backref='students')
    grades = db.relationship('Grade', back_populates='student', lazy=True)
    
    def to_dict(self, include_relationships=True):
        result = {
            'id': self.id,
            'user_id': self.user_id,
            'student_number': self.student_number,
            'classroom_id': self.classroom_id,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'address': self.address,
            'phone': self.phone,
            'parent_name': self.parent_name,
            'parent_email': self.parent_email,
            'parent_phone': self.parent_phone,
            'enrollment_date': self.enrollment_date.isoformat(),
            'is_enrolled': self.is_enrolled,
            'user': self.user.to_dict() if self.user else None
        }
        
        if include_relationships and self.classroom:
            result['classroom'] = {
                'id': self.classroom.id,
                'name': self.classroom.name,
                'level': self.classroom.level
            }
        
        return result