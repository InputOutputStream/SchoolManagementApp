# app/services/AuthService.py
from app.models.User import User
from app.models.Teacher import Teacher
from app.models.Student import Student
from app import db
from werkzeug.security import generate_password_hash
import secrets
import string
from datetime import datetime, date

class AuthService:
    @staticmethod
    def create_teacher(admin_user, data):
        """Create a new teacher user and profile"""
        if admin_user.role != 'admin':
            raise ValueError("Only admins can create teachers")
        
        # Check if email already exists
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            raise ValueError("Email already exists")
        
        # Check if employee number already exists
        existing_teacher = Teacher.query.filter_by(employee_number=data['employee_number']).first()
        if existing_teacher:
            raise ValueError("Employee number already exists")
        
        try:
            # Create user
            user = User(
                email=data['email'].lower().strip(),
                first_name=data['first_name'].strip(),
                last_name=data['last_name'].strip(),
                role='teacher'  # String instead of enum
            )
            
            # Set password
            password = data.get('password', AuthService._generate_password())
            user.set_password(password)
            
            db.session.add(user)
            db.session.flush()  # Get user ID
            
            # Create teacher profile
            teacher = Teacher(
                user_id=user.id,
                employee_number=data['employee_number'].strip(),
                specialization=data.get('specialization', '').strip() or None,
                is_head_teacher=bool(data.get('is_head_teacher', False)),
                created_by=admin_user.id
            )
            
            db.session.add(teacher)
            db.session.commit()
            
            return user, teacher
            
        except Exception as e:
            db.session.rollback()
            raise e
    
    @staticmethod
    def create_student(creator_user, data):
        """Create a new student user and profile"""
        if creator_user.role not in ['admin', 'teacher']:
            raise ValueError("Only admins and teachers can create students")
        
        # Check if email already exists
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            raise ValueError("Email already exists")
        
        try:
            # Generate student number
            student_number = AuthService._generate_student_number()
            
            # Create user
            user = User(
                email=data['email'].lower().strip(),
                first_name=data['first_name'].strip(),
                last_name=data['last_name'].strip(),
                role='student'  # String instead of enum
            )
            
            # Set password
            password = data.get('password', AuthService._generate_password())
            user.set_password(password)
            
            db.session.add(user)
            db.session.flush()  # Get user ID
            
            # Create student profile
            student = Student(
                user_id=user.id,
                student_number=student_number,
                classroom_id=data.get('classroom_id'),
                date_of_birth=datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date() if data.get('date_of_birth') else None,
                address=data.get('address'),
                phone=data.get('phone_number'),
                parent_name=data.get('parent_name'),
                parent_email=data.get('parent_email'),
                parent_phone=data.get('parent_phone')
            )
            
            db.session.add(student)
            db.session.commit()
            
            return user, student
            
        except Exception as e:
            db.session.rollback()
            raise e
    
    @staticmethod
    def _generate_password(length=12):
        """Generate a secure random password"""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    @staticmethod
    def _generate_student_number():
        """Generate a unique student number"""
        while True:
            number = 'STU' + ''.join(secrets.choice(string.digits) for _ in range(6))
            if not Student.query.filter_by(student_number=number).first():
                return number