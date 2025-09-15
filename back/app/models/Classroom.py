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
    assignments = db.relationship('TeacherAssignment', backref='classroom', lazy=True)
    assigner = db.relationship('User', foreign_keys=[assigned_by], backref='assigned_classrooms')
    
    def to_dict(self, include_relationships=True):
        result = {
            'id': self.id,
            'name': self.name,
            'level': self.level,
            'academic_year': self.academic_year,
            'head_teacher_id': self.head_teacher_id,
            'max_students': self.max_students,
            'created_at': self.created_at.isoformat(),
            'assigned_by': self.assigned_by,
            'students_count': len(self.students)
        }
        
        if include_relationships and self.head_teacher:
            result['head_teacher'] = {
                'id': self.head_teacher.id,
                'employee_number': self.head_teacher.employee_number,
                'name': f"{self.head_teacher.user.first_name} {self.head_teacher.user.last_name}" if self.head_teacher.user else None
            }
        
        return result