# app/models/classroom.py
from app import db
from datetime import datetime

class Classroom(db.Model):
    __tablename__ = 'classrooms'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    level = db.Column(db.String(50), nullable=False)
    academic_year = db.Column(db.String(10), nullable=False)
    head_teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'))
    max_students = db.Column(db.Integer, default=30)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    assigned_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # Relationships
    students = db.relationship('Student', backref='classroom', lazy=True)
    assignments = db.relationship('TeacherAssignment', backref='classroom', lazy=True)
    assigner = db.relationship('User', foreign_keys=[assigned_by], backref='assigned_classrooms')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'level': self.level,
            'academic_year': self.academic_year,
            'head_teacher_id': self.head_teacher_id,
            'max_students': self.max_students,
            'created_at': self.created_at.isoformat(),
            'assigned_by': self.assigned_by,
            'students_count': len(self.students),
            'head_teacher': self.head_teacher.to_dict() if self.head_teacher else None
        }
