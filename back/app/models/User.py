# app/models/User.py
from app import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='teacher')  # Fixed: Use string instead of enum
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student_profile = db.relationship(
        'Student', 
        uselist=False, 
        cascade='all, delete-orphan',
        foreign_keys='Student.user_id',
        back_populates='user'
    )
    
    teacher_profile = db.relationship(
        'Teacher', 
        uselist=False, 
        cascade='all, delete-orphan',
        foreign_keys='Teacher.user_id',
        back_populates='user'
    )
    
    def set_password(self, password):
        """Set password with scrypt method"""
        self.password_hash = generate_password_hash(password, method='scrypt')
    
    def check_password(self, password):
        """Check password with fallback for legacy hashes"""
        try:
            return check_password_hash(self.password_hash, password)
        except Exception as e:
            print(f"Password check error: {e}")
            # Handle plain text passwords during development
            if self.password_hash == password:
                self.set_password(password)
                db.session.commit()
                return True
            return False
    
    @property 
    def teacher(self):
        """Convenience property for API compatibility"""
        return self.teacher_profile
        
    @property
    def student(self):
        """Convenience property for API compatibility"""
        return self.student_profile
    
    def to_dict(self):
        result = {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        # Add teacher info if exists
        if self.teacher_profile:
            result['teacher'] = {
                'id': self.teacher_profile.id,
                'employee_number': self.teacher_profile.employee_number,
                'specialization': self.teacher_profile.specialization,
                'is_head_teacher': self.teacher_profile.is_head_teacher,
                'assigned_classrooms': [a.classroom_id for a in self.teacher_profile.assignments],
                'head_of_classrooms': [c.id for c in self.teacher_profile.head_of_classrooms]
            }
            
        return result