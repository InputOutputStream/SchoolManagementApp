# app/models/teacher.py
from app import db
from datetime import datetime, date

class Teacher(db.Model):
    __tablename__ = 'teachers'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    employee_number = db.Column(db.String(20), unique=True, nullable=False)
    specialization = db.Column(db.String(100))
    hire_date = db.Column(db.Date, default=date.today)
    is_head_teacher = db.Column(db.Boolean, default=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # Relationships with explicit foreign_keys to avoid ambiguity
    head_of_classrooms = db.relationship(
        'Classroom', 
        backref='head_teacher', 
        lazy=True,
        foreign_keys='Classroom.head_teacher_id'
    )
    
    assignments = db.relationship(
        'TeacherAssignment', 
        backref='teacher', 
        lazy=True,
        foreign_keys='TeacherAssignment.teacher_id'
    )
    
    # REMOVED the grades relationship since Grade no longer has teacher_id
    # Teachers will access grades through their evaluations instead:
    # teacher.created_evaluations -> evaluation.grades
    
    creator = db.relationship(
        'User', 
        foreign_keys=[created_by], 
        backref='created_teachers'
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'employee_number': self.employee_number,
            'specialization': self.specialization,
            'hire_date': self.hire_date.isoformat(),
            'is_head_teacher': self.is_head_teacher,
            'created_by': self.created_by,
            'user': self.user.to_dict() if self.user else None,
            'head_of_classrooms': [c.to_dict() for c in self.head_of_classrooms],
            'assignments': [a.to_dict() for a in self.assignments]
        }