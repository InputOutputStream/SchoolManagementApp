# app/models/teacher_assignment.py
from app import db
from datetime import datetime

class TeacherAssignment(db.Model):
    __tablename__ = 'teacher_subject_classroom'
    
    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    classroom_id = db.Column(db.Integer, db.ForeignKey('classrooms.id'), nullable=False)
    academic_year = db.Column(db.String(10), nullable=False)
    assigned_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    assigned_date = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    assigner = db.relationship('User', foreign_keys=[assigned_by], backref='teacher_assignments')
    
    # Unique constraint
    __table_args__ = (
        db.UniqueConstraint('teacher_id', 'subject_id', 'classroom_id', 'academic_year'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'teacher_id': self.teacher_id,
            'subject_id': self.subject_id,
            'classroom_id': self.classroom_id,
            'academic_year': self.academic_year,
            'assigned_by': self.assigned_by,
            'assigned_date': self.assigned_date.isoformat(),
            'is_active': self.is_active,
            'teacher': self.teacher.user.to_dict() if self.teacher and self.teacher.user else None,
            'subject': self.subject.to_dict() if self.subject else None,
            'classroom': self.classroom.to_dict() if self.classroom else None
        }
