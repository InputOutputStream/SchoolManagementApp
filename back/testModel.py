# test_models_crud.py
import pytest
from datetime import datetime, date
from decimal import Decimal
import sys
import os

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import (
    User, UserRole, Student, Teacher, Classroom, Subject, 
    Grade, ReportCard, AuditLog, EvaluationPeriod, 
    TeacherAssignment, Attendance, Evaluation, EvaluationType
)

class TestUserModel:
    """Test CRUD operations for User model"""
    
    @pytest.fixture
    def sample_users(self, app, db_session):
        """Create sample users for testing"""
        users = []
        
        # Admin user
        admin = User(
            email="admin@school.com",
            first_name="John",
            last_name="Admin",
            role=UserRole.ADMIN
        )
        admin.set_password("admin123")
        users.append(admin)
        
        # Teacher user
        teacher = User(
            email="teacher@school.com",
            first_name="Jane",
            last_name="Smith",
            role=UserRole.TEACHER
        )
        teacher.set_password("teacher123")
        users.append(teacher)
        
        # Student user
        student = User(
            email="student@school.com",
            first_name="Bob",
            last_name="Johnson",
            role=UserRole.STUDENT
        )
        student.set_password("student123")
        users.append(student)
        
        db_session.add_all(users)
        db_session.commit()
        
        return users
    
    def test_create_user(self, db_session):
        """Test creating a new user"""
        user = User(
            email="newuser@school.com",
            first_name="New",
            last_name="User",
            role=UserRole.TEACHER
        )
        user.set_password("password123")
        
        db_session.add(user)
        db_session.commit()
        
        # Verify user was created
        created_user = db_session.query(User).filter_by(email="newuser@school.com").first()
        assert created_user is not None
        assert created_user.first_name == "New"
        assert created_user.check_password("password123")
        assert created_user.role == UserRole.TEACHER
    
    def test_read_users(self, sample_users, db_session):
        """Test reading users from database"""
        # Get all users
        all_users = db_session.query(User).all()
        assert len(all_users) == 3
        
        # Get user by email
        admin = db_session.query(User).filter_by(email="admin@school.com").first()
        assert admin.role == UserRole.ADMIN
        assert admin.first_name == "John"
        
        # Get users by role
        teachers = db_session.query(User).filter_by(role=UserRole.TEACHER).all()
        assert len(teachers) == 1
        assert teachers[0].email == "teacher@school.com"
    
    def test_update_user(self, sample_users, db_session):
        """Test updating user information"""
        user = db_session.query(User).filter_by(email="student@school.com").first()
        
        # Update user details
        user.first_name = "Robert"
        user.last_name = "Smith"
        user.is_active = False
        
        db_session.commit()
        
        # Verify updates
        updated_user = db_session.query(User).filter_by(email="student@school.com").first()
        assert updated_user.first_name == "Robert"
        assert updated_user.last_name == "Smith"
        assert updated_user.is_active == False
    
    def test_delete_user(self, sample_users, db_session):
        """Test deleting a user"""
        user = db_session.query(User).filter_by(email="student@school.com").first()
        user_id = user.id
        
        db_session.delete(user)
        db_session.commit()
        
        # Verify user was deleted
        deleted_user = db_session.query(User).filter_by(id=user_id).first()
        assert deleted_user is None
        
        # Verify remaining users
        remaining_users = db_session.query(User).all()
        assert len(remaining_users) == 2


class TestStudentModel:
    """Test CRUD operations for Student model"""
    
    @pytest.fixture
    def sample_data(self, app, db_session):
        """Create sample data for student tests"""
        # Create users
        admin = User(email="admin@test.com", first_name="Admin", last_name="User", role=UserRole.ADMIN)
        admin.set_password("admin123")
        
        student_user = User(email="student@test.com", first_name="Alice", last_name="Brown", role=UserRole.STUDENT)
        student_user.set_password("student123")
        
        teacher_user = User(email="teacher@test.com", first_name="Mr", last_name="Wilson", role=UserRole.TEACHER)
        teacher_user.set_password("teacher123")
        
        db_session.add_all([admin, student_user, teacher_user])
        db_session.flush()
        
        # Create teacher
        teacher = Teacher(
            user_id=teacher_user.id,
            employee_number="EMP001",
            specialization="Mathematics"
        )
        db_session.add(teacher)
        db_session.flush()
        
        # Create classroom
        classroom = Classroom(
            name="6th Grade A",
            level="Grade 6",
            academic_year="2024-2025",
            head_teacher_id=teacher.id,
            assigned_by=admin.id
        )
        db_session.add(classroom)
        db_session.commit()
        
        return {
            'admin': admin,
            'student_user': student_user,
            'teacher_user': teacher_user,
            'teacher': teacher,
            'classroom': classroom
        }
    
    def test_create_student(self, sample_data, db_session):
        """Test creating a new student"""
        student = Student(
            user_id=sample_data['student_user'].id,
            student_number="STU2024001",
            classroom_id=sample_data['classroom'].id,
            date_of_birth=date(2010, 5, 15),
            address="123 Main St, City",
            phone="555-0123",
            parent_name="Parent Brown",
            parent_email="parent@example.com",
            parent_phone="555-0124"
        )
        
        db_session.add(student)
        db_session.commit()
        
        # Verify student was created
        created_student = db_session.query(Student).filter_by(student_number="STU2024001").first()
        assert created_student is not None
        assert created_student.parent_name == "Parent Brown"
        assert created_student.classroom_id == sample_data['classroom'].id
    
    def test_read_students_with_relationships(self, sample_data, db_session):
        """Test reading students with related data"""
        student = Student(
            user_id=sample_data['student_user'].id,
            student_number="STU2024002",
            classroom_id=sample_data['classroom'].id
        )
        db_session.add(student)
        db_session.commit()
        
        # Read student with relationships
        student_with_relations = db_session.query(Student)\
            .filter_by(student_number="STU2024002")\
            .first()
        
        assert student_with_relations.user.first_name == "Alice"
        assert student_with_relations.classroom.name == "6th Grade A"
        assert student_with_relations.classroom.head_teacher.specialization == "Mathematics"
    
    def test_update_student(self, sample_data, db_session):
        """Test updating student information"""
        student = Student(
            user_id=sample_data['student_user'].id,
            student_number="STU2024003",
            parent_name="Old Parent"
        )
        db_session.add(student)
        db_session.commit()
        
        # Update student
        student.parent_name = "New Parent Name"
        student.parent_email = "newparent@example.com"
        student.address = "456 New Address"
        
        db_session.commit()
        
        # Verify updates
        updated_student = db_session.query(Student).filter_by(student_number="STU2024003").first()
        assert updated_student.parent_name == "New Parent Name"
        assert updated_student.parent_email == "newparent@example.com"


class TestSubjectAndEvaluationModels:
    """Test CRUD operations for Subject, EvaluationType, and Evaluation models"""
    
    @pytest.fixture
    def evaluation_setup(self, app, db_session):
        """Setup data for evaluation tests"""
        # Create users and teacher
        admin = User(email="admin@eval.com", first_name="Admin", last_name="User", role=UserRole.ADMIN)
        admin.set_password("admin123")
        
        teacher_user = User(email="teacher@eval.com", first_name="Prof", last_name="Math", role=UserRole.TEACHER)
        teacher_user.set_password("teacher123")
        
        db_session.add_all([admin, teacher_user])
        db_session.flush()
        
        teacher = Teacher(
            user_id=teacher_user.id,
            employee_number="EMP002",
            specialization="Mathematics"
        )
        db_session.add(teacher)
        db_session.flush()
        
        # Create classroom
        classroom = Classroom(
            name="Math Class A",
            level="Grade 10",
            academic_year="2024-2025",
            head_teacher_id=teacher.id
        )
        db_session.add(classroom)
        db_session.flush()
        
        # Create subject
        subject = Subject(
            name="Advanced Mathematics",
            code="MATH101",
            coefficient=3
        )
        db_session.add(subject)
        db_session.flush()
        
        # Create evaluation period
        eval_period = EvaluationPeriod(
            name="First Quarter",
            academic_year="2024-2025",
            start_date=date(2024, 9, 1),
            end_date=date(2024, 11, 30)
        )
        db_session.add(eval_period)
        db_session.flush()
        
        # Create evaluation type
        eval_type = EvaluationType(
            name="Quiz",
            description="Short assessment",
            default_weight=0.3
        )
        db_session.add(eval_type)
        db_session.commit()
        
        return {
            'teacher': teacher,
            'classroom': classroom,
            'subject': subject,
            'eval_period': eval_period,
            'eval_type': eval_type
        }
    
    def test_create_evaluation(self, evaluation_setup, db_session):
        """Test creating an evaluation"""
        evaluation = Evaluation(
            name="Math Quiz #1",
            description="Basic algebra quiz",
            evaluation_period_id=evaluation_setup['eval_period'].id,
            evaluation_type_id=evaluation_setup['eval_type'].id,
            subject_id=evaluation_setup['subject'].id,
            classroom_id=evaluation_setup['classroom'].id,
            evaluation_date=date.today(),
            created_by=evaluation_setup['teacher'].id,
            max_points=Decimal('20.00'),
            weight=1.0
        )
        
        db_session.add(evaluation)
        db_session.commit()
        
        # Verify evaluation was created
        created_eval = db_session.query(Evaluation).filter_by(name="Math Quiz #1").first()
        assert created_eval is not None
        assert created_eval.max_points == Decimal('20.00')
        assert created_eval.subject.name == "Advanced Mathematics"
    
    def test_complex_evaluation_query(self, evaluation_setup, db_session):
        """Test complex queries involving evaluations"""
        # Create multiple evaluations
        evaluations = [
            Evaluation(
                name=f"Quiz {i}",
                evaluation_period_id=evaluation_setup['eval_period'].id,
                evaluation_type_id=evaluation_setup['eval_type'].id,
                subject_id=evaluation_setup['subject'].id,
                classroom_id=evaluation_setup['classroom'].id,
                evaluation_date=date.today(),
                created_by=evaluation_setup['teacher'].id,
                max_points=Decimal('20.00')
            ) for i in range(1, 4)
        ]
        
        db_session.add_all(evaluations)
        db_session.commit()
        
        # Query evaluations by period and subject
        period_evals = db_session.query(Evaluation)\
            .join(Subject)\
            .join(EvaluationPeriod)\
            .filter(Subject.code == "MATH101")\
            .filter(EvaluationPeriod.name == "First Quarter")\
            .all()
        
        assert len(period_evals) == 3
        
        # Query evaluations by teacher
        teacher_evals = db_session.query(Evaluation)\
            .join(Teacher, Evaluation.created_by == Teacher.id)\
            .filter(Teacher.specialization == "Mathematics")\
            .all()
        
        assert len(teacher_evals) == 3


class TestGradeModel:
    """Test CRUD operations for Grade model"""
    
    @pytest.fixture
    def grade_setup(self, app, db_session):
        """Setup data for grade tests"""
        # Create complete setup for grading
        admin = User(email="admin@grade.com", first_name="Admin", last_name="User", role=UserRole.ADMIN)
        admin.set_password("admin123")
        
        teacher_user = User(email="teacher@grade.com", first_name="Ms", last_name="Science", role=UserRole.TEACHER)
        teacher_user.set_password("teacher123")
        
        student_user = User(email="student@grade.com", first_name="John", last_name="Doe", role=UserRole.STUDENT)
        student_user.set_password("student123")
        
        db_session.add_all([admin, teacher_user, student_user])
        db_session.flush()
        
        teacher = Teacher(user_id=teacher_user.id, employee_number="EMP003")
        db_session.add(teacher)
        db_session.flush()
        
        classroom = Classroom(name="Science A", level="Grade 9", academic_year="2024-2025")
        subject = Subject(name="Biology", code="BIO101", coefficient=2)
        db_session.add_all([classroom, subject])
        db_session.flush()
        
        student = Student(user_id=student_user.id, student_number="STU001", classroom_id=classroom.id)
        db_session.add(student)
        db_session.flush()
        
        eval_period = EvaluationPeriod(
            name="Mid-term",
            academic_year="2024-2025",
            start_date=date(2024, 12, 1),
            end_date=date(2024, 12, 31)
        )
        eval_type = EvaluationType(name="Test", default_weight=0.5)
        db_session.add_all([eval_period, eval_type])
        db_session.flush()
        
        evaluation = Evaluation(
            name="Biology Test 1",
            evaluation_period_id=eval_period.id,
            evaluation_type_id=eval_type.id,
            subject_id=subject.id,
            classroom_id=classroom.id,
            evaluation_date=date.today(),
            created_by=teacher.id,
            max_points=Decimal('100.00')
        )
        db_session.add(evaluation)
        db_session.commit()
        
        return {
            'student': student,
            'evaluation': evaluation,
            'subject': subject,
            'teacher_user': teacher_user
        }
    
    def test_create_grade(self, grade_setup, db_session):
        """Test creating grades with automatic percentage calculation"""
        grade = Grade(
            student_id=grade_setup['student'].id,
            evaluation_id=grade_setup['evaluation'].id,
            subject_id=grade_setup['subject'].id,
            points_earned=Decimal('85.50'),
            points_possible=Decimal('100.00'),
            letter_grade='B+',
            created_by=grade_setup['teacher_user'].id
        )
        
        db_session.add(grade)
        db_session.commit()
        
        # Verify grade was created with correct percentage
        created_grade = db_session.query(Grade)\
            .filter_by(student_id=grade_setup['student'].id)\
            .first()
        
        assert created_grade is not None
        assert created_grade.points_earned == Decimal('85.50')
        assert created_grade.percentage == Decimal('85.50')  # Should be calculated automatically
        assert created_grade.letter_grade == 'B+'
    
    def test_grade_statistics_queries(self, grade_setup, db_session):
        """Test statistical queries on grades"""
        # Create multiple grades for the same evaluation
        grades_data = [
            (Decimal('95.00'), 'A'),
            (Decimal('87.50'), 'B+'),
            (Decimal('76.00'), 'B-'),
            (Decimal('82.25'), 'B'),
        ]
        
        students = []
        for i, (points, letter) in enumerate(grades_data, 2):  # Start from 2 to avoid STU001 conflict
            # Create additional students
            user = User(
                email=f"student{i}@test.com",
                first_name=f"Student{i}",
                last_name="Test",
                role=UserRole.STUDENT
            )
            user.set_password("test123")
            db_session.add(user)
            db_session.flush()
            
            student = Student(
                user_id=user.id,
                student_number=f"STU00{i}",  # Now generates STU002, STU003, STU004, STU005
                classroom_id=grade_setup['evaluation'].classroom_id
            )
            db_session.add(student)
            db_session.flush()
            
            grade = Grade(
                student_id=student.id,
                evaluation_id=grade_setup['evaluation'].id,
                subject_id=grade_setup['subject'].id,
                points_earned=points,
                points_possible=Decimal('100.00'),
                letter_grade=letter
            )
            db_session.add(grade)
            students.append(student)
        
        db_session.commit()
        
        # Query: Get class average for the evaluation
        from sqlalchemy import func
        class_avg = db_session.query(func.avg(Grade.percentage))\
            .filter_by(evaluation_id=grade_setup['evaluation'].id)\
            .scalar()
        
        assert class_avg is not None
        assert float(class_avg) > 80  # Should be around 85
        
        # Query: Get top performers
        top_grades = db_session.query(Grade)\
            .filter_by(evaluation_id=grade_setup['evaluation'].id)\
            .filter(Grade.percentage >= 90)\
            .all()
        
        assert len(top_grades) == 1
        assert top_grades[0].letter_grade == 'A'

class TestAttendanceModel:
    """Test CRUD operations for Attendance model"""
    
    @pytest.fixture
    def attendance_setup(self, app, db_session):
        """Setup data for attendance tests"""
        admin = User(email="admin@attend.com", first_name="Admin", last_name="User", role=UserRole.ADMIN)
        admin.set_password("admin123")
        
        student_user = User(email="student@attend.com", first_name="Alice", last_name="Student", role=UserRole.STUDENT)
        student_user.set_password("student123")
        
        db_session.add_all([admin, student_user])
        db_session.flush()
        
        classroom = Classroom(name="Class B", level="Grade 8", academic_year="2024-2025")
        db_session.add(classroom)
        db_session.flush()
        
        student = Student(user_id=student_user.id, student_number="STU100", classroom_id=classroom.id)
        db_session.add(student)
        db_session.commit()
        
        return {'student': student, 'classroom': classroom, 'admin': admin}
    
    def test_create_attendance_records(self, attendance_setup, db_session):
        """Test creating attendance records"""
        attendance_records = [
            Attendance(
                student_id=attendance_setup['student'].id,
                classroom_id=attendance_setup['classroom'].id,
                date=date(2024, 9, 1),
                status='present',
                recorded_by=attendance_setup['admin'].id
            ),
            Attendance(
                student_id=attendance_setup['student'].id,
                classroom_id=attendance_setup['classroom'].id,
                date=date(2024, 9, 2),
                status='absent',
                recorded_by=attendance_setup['admin'].id
            ),
            Attendance(
                student_id=attendance_setup['student'].id,
                classroom_id=attendance_setup['classroom'].id,
                date=date(2024, 9, 3),
                status='late',
                recorded_by=attendance_setup['admin'].id
            )
        ]
        
        db_session.add_all(attendance_records)
        db_session.commit()
        
        # Verify attendance records
        all_attendance = db_session.query(Attendance)\
            .filter_by(student_id=attendance_setup['student'].id)\
            .all()
        
        assert len(all_attendance) == 3
        
        # Check specific statuses
        present_days = db_session.query(Attendance)\
            .filter_by(student_id=attendance_setup['student'].id, status='present')\
            .count()
        
        absent_days = db_session.query(Attendance)\
            .filter_by(student_id=attendance_setup['student'].id, status='absent')\
            .count()
        
        assert present_days == 1
        assert absent_days == 1
    
    def test_attendance_statistics(self, attendance_setup, db_session):
        """Test attendance statistics queries"""
        from sqlalchemy import func
        
        # Create a month worth of attendance data
        import calendar
        for day in range(1, 21):  # 20 school days
            status = 'present' if day % 5 != 0 else 'absent'  # Absent every 5th day
            attendance = Attendance(
                student_id=attendance_setup['student'].id,
                classroom_id=attendance_setup['classroom'].id,
                date=date(2024, 9, day),
                status=status,
                recorded_by=attendance_setup['admin'].id
            )
            db_session.add(attendance)
        
        db_session.commit()
        
        # Calculate attendance rate
        total_days = db_session.query(Attendance)\
            .filter_by(student_id=attendance_setup['student'].id)\
            .count()
        
        present_days = db_session.query(Attendance)\
            .filter_by(student_id=attendance_setup['student'].id, status='present')\
            .count()
        
        attendance_rate = (present_days / total_days) * 100
        
        assert total_days == 20
        assert present_days == 16  # 4 absent days (every 5th day)
        assert attendance_rate == 80.0


class TestReportCardModel:
    """Test CRUD operations for ReportCard model"""
    
    def test_create_report_card(self, app, db_session):
        """Test creating a complete report card"""
        # Setup users
        admin = User(email="admin@report.com", first_name="Admin", last_name="User", role=UserRole.ADMIN)
        admin.set_password("admin123")
        
        teacher_user = User(email="teacher@report.com", first_name="Mr", last_name="Teacher", role=UserRole.TEACHER)
        teacher_user.set_password("teacher123")
        
        student_user = User(email="student@report.com", first_name="Jane", last_name="Student", role=UserRole.STUDENT)
        student_user.set_password("student123")
        
        db_session.add_all([admin, teacher_user, student_user])
        db_session.flush()
        
        teacher = Teacher(user_id=teacher_user.id, employee_number="EMP004")
        db_session.add(teacher)
        db_session.flush()
        
        classroom = Classroom(name="Report Class", level="Grade 7", academic_year="2024-2025")
        db_session.add(classroom)
        db_session.flush()
        
        student = Student(user_id=student_user.id, student_number="STU200", classroom_id=classroom.id)
        db_session.add(student)
        db_session.flush()
        
        eval_period = EvaluationPeriod(
            name="Final Term",
            academic_year="2024-2025",
            start_date=date(2025, 1, 1),
            end_date=date(2025, 3, 31)
        )
        db_session.add(eval_period)
        db_session.commit()
        
        # Create report card
        report_card = ReportCard(
            student_id=student.id,
            evaluation_period_id=eval_period.id,
            generated_by=teacher.id,
            overall_average=Decimal('87.50'),
            class_rank=5,
            total_students=25,
            teacher_comments="Excellent progress throughout the term.",
            file_path="/reports/student200_final_2025.pdf"
        )
        
        db_session.add(report_card)
        db_session.commit()
        
        # Verify report card
        created_report = db_session.query(ReportCard)\
            .filter_by(student_id=student.id)\
            .first()
        
        assert created_report is not None
        assert created_report.overall_average == Decimal('87.50')
        assert created_report.class_rank == 5
        assert "Excellent progress" in created_report.teacher_comments
        assert created_report.student.user.first_name == "Jane"


# Conftest.py setup for pytest
@pytest.fixture(scope='session')
def app():
    """Create application for testing"""
    from app import create_app
    app = create_app('testing')
    
    app_context = app.app_context()
    app_context.push()
    
    yield app
    
    app_context.pop()


@pytest.fixture(scope='function')
def db_session(app):
    """Create database session for each test"""
    from app import db
    
    # Create all tables
    db.create_all()
    
    yield db.session
    
    # Clean up after each test
    db.session.remove()
    db.drop_all()


# Run the tests
if __name__ == '__main__':
    pytest.main([__file__, '-v'])