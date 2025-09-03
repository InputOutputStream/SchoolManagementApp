# app/services/auth_service.py
from app.models.User import User, UserRole
from app.models.Student import Student
from app.models.Teacher import Teacher
from app import db
import secrets
import string

class AuthService:
    @staticmethod
    def create_teacher(admin_user, teacher_data):
        """Create a new teacher account"""
        # Generate employee number
        employee_number = AuthService._generate_employee_number()
        
        # Create user account
        user = User(
            email=teacher_data['email'],
            first_name=teacher_data['first_name'],
            last_name=teacher_data['last_name'],
            role=UserRole.TEACHER
        )
        user.set_password(teacher_data.get('password', AuthService._generate_password()))
        
        db.session.add(user)
        db.session.flush()
        
        # Create teacher profile
        teacher = Teacher(
            user_id=user.id,
            employee_number=employee_number,
            specialization=teacher_data.get('specialization'),
            created_by=admin_user.id
        )
        
        db.session.add(teacher)
        db.session.commit()
        
        return user, teacher
    
    @staticmethod
    def _generate_employee_number():
        """Generate unique employee number"""
        while True:
            number = 'EMP' + ''.join(secrets.choice(string.digits) for _ in range(6))
            if not Teacher.query.filter_by(employee_number=number).first():
                return number
    
    @staticmethod
    def _generate_password():
        """Generate temporary password"""
        return ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
