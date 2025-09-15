#!/usr/bin/env python3
"""
Backend Database Communication Test Suite
Tests all models and their relationships with existing data
"""

import sys
import os
import traceback
from datetime import datetime, date
from decimal import Decimal

# Add app to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app import create_app, db
    from app.models.User import User, UserRole
    from app.models.Teacher import Teacher
    from app.models.Student import Student
    from app.models.Classroom import Classroom
    from app.models.Subject import Subject
    from app.models.TeacherAssignment import TeacherAssignment
    from app.models.Attendance import Attendance
    from app.models.EvaluationPeriod import EvaluationPeriod
    from app.models.Evaluation import Evaluation, EvaluationType
    from app.models.Grade import Grade
    from app.models.ReportCard import ReportCard
    from app.models.AuditLog import AuditLog
except ImportError as e:
    print(f"❌ Import Error: {e}")
    sys.exit(1)

class BackendTester:
    def __init__(self):
        self.app = create_app()
        self.passed = 0
        self.failed = 0
    
    def run_all_tests(self):
        print("🧪 Starting Backend Database Communication Tests\n")
        
        with self.app.app_context():
            try:
                self.test_db_connection()
                self.test_model_queries()
                self.test_relationships()
                self.test_to_dict_methods()
                self.test_data_integrity()
            except Exception as e:
                print(f"❌ Fatal error: {e}")
                traceback.print_exc()
                self.failed += 1
            
        self.print_summary()
    
    def test_db_connection(self):
        print("📡 Testing database connection...")
        try:
            result = db.session.execute(db.text('SELECT COUNT(*) FROM users')).scalar()
            print(f"✅ Database connected - {result} users found")
            self.passed += 1
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            self.failed += 1
            raise
    
    def test_model_queries(self):
        print("\n🔍 Testing model queries...")
        
        # Test User model
        try:
            users = User.query.all()
            admin_users = User.query.filter_by(role=UserRole.ADMIN).all()
            teacher_users = User.query.filter_by(role=UserRole.TEACHER).all()
            student_users = User.query.filter_by(role=UserRole.STUDENT).all()
            
            print(f"✅ Users: {len(users)} total ({len(admin_users)} admin, {len(teacher_users)} teachers, {len(student_users)} students)")
            self.passed += 1
        except Exception as e:
            print(f"❌ User query failed: {e}")
            self.failed += 1
        
        # Test Teacher model
        try:
            teachers = Teacher.query.all()
            head_teachers = Teacher.query.filter_by(is_head_teacher=True).all()
            print(f"✅ Teachers: {len(teachers)} total ({len(head_teachers)} head teachers)")
            self.passed += 1
        except Exception as e:
            print(f"❌ Teacher query failed: {e}")
            self.failed += 1
        
        # Test Student model
        try:
            students = Student.query.all()
            enrolled_students = Student.query.filter_by(is_enrolled=True).all()
            print(f"✅ Students: {len(students)} total ({len(enrolled_students)} enrolled)")
            self.passed += 1
        except Exception as e:
            print(f"❌ Student query failed: {e}")
            self.failed += 1
        
        # Test Classroom model
        try:
            classrooms = Classroom.query.all()
            print(f"✅ Classrooms: {len(classrooms)} total")
            self.passed += 1
        except Exception as e:
            print(f"❌ Classroom query failed: {e}")
            self.failed += 1
        
        # Test Subject model
        try:
            subjects = Subject.query.all()
            print(f"✅ Subjects: {len(subjects)} total")
            self.passed += 1
        except Exception as e:
            print(f"❌ Subject query failed: {e}")
            self.failed += 1
        
        # Test Evaluation models
        try:
            periods = EvaluationPeriod.query.all()
            types = EvaluationType.query.all()
            evaluations = Evaluation.query.all()
            print(f"✅ Evaluations: {len(periods)} periods, {len(types)} types, {len(evaluations)} evaluations")
            self.passed += 1
        except Exception as e:
            print(f"❌ Evaluation query failed: {e}")
            self.failed += 1
        
        # Test Grade model
        try:
            grades = Grade.query.all()
            print(f"✅ Grades: {len(grades)} total")
            self.passed += 1
        except Exception as e:
            print(f"❌ Grade query failed: {e}")
            self.failed += 1
    
    def test_relationships(self):
        print("\n🔗 Testing model relationships...")
        
        # Test User-Teacher relationship
        try:
            teacher = Teacher.query.first()
            if teacher:
                user = teacher.user
                assert user is not None
                assert user.teacher_profile == teacher
                print("✅ User-Teacher relationship working")
                self.passed += 1
            else:
                print("⚠️  No teachers found to test relationship")
        except Exception as e:
            print(f"❌ User-Teacher relationship failed: {e}")
            self.failed += 1
        
        # Test User-Student relationship
        try:
            student = Student.query.first()
            if student:
                user = student.user
                assert user is not None
                assert user.student_profile == student
                print("✅ User-Student relationship working")
                self.passed += 1
            else:
                print("⚠️  No students found to test relationship")
        except Exception as e:
            print(f"❌ User-Student relationship failed: {e}")
            self.failed += 1
        
        # Test Classroom-Student relationship
        try:
            classroom = Classroom.query.first()
            if classroom:
                students_in_classroom = classroom.students
                print(f"✅ Classroom-Student relationship: {len(students_in_classroom)} students in {classroom.name}")
                self.passed += 1
            else:
                print("⚠️  No classrooms found")
        except Exception as e:
            print(f"❌ Classroom-Student relationship failed: {e}")
            self.failed += 1
        
        # Test Teacher assignments
        try:
            assignments = TeacherAssignment.query.all()
            if assignments:
                assignment = assignments[0]
                teacher = assignment.teacher
                subject = assignment.subject
                classroom = assignment.classroom
                assert teacher is not None
                assert subject is not None
                assert classroom is not None
                print(f"✅ Teacher assignments: {teacher.user.first_name} teaches {subject.name} in {classroom.name}")
                self.passed += 1
            else:
                print("⚠️  No teacher assignments found")
        except Exception as e:
            print(f"❌ Teacher assignment relationship failed: {e}")
            self.failed += 1
        
        # Test Grade relationships
        try:
            grade = Grade.query.first()
            if grade:
                student = grade.student
                evaluation = grade.evaluation
                assert student is not None
                assert evaluation is not None
                print(f"✅ Grade relationships: {student.user.first_name} scored {grade.points_earned}/{grade.points_possible}")
                self.passed += 1
            else:
                print("⚠️  No grades found")
        except Exception as e:
            print(f"❌ Grade relationship failed: {e}")
            self.failed += 1
    
    def test_to_dict_methods(self):
        print("\n📄 Testing to_dict methods...")
        
        models_to_test = [
            (User, 'User'),
            (Teacher, 'Teacher'),
            (Student, 'Student'),
            (Classroom, 'Classroom'),
            (Subject, 'Subject'),
            (TeacherAssignment, 'TeacherAssignment'),
            (EvaluationPeriod, 'EvaluationPeriod'),
            (EvaluationType, 'EvaluationType'),
            (Evaluation, 'Evaluation'),
            (Grade, 'Grade'),
            (Attendance, 'Attendance'),
        ]
        
        for model_class, model_name in models_to_test:
            try:
                instance = model_class.query.first()
                if instance:
                    result = instance.to_dict()
                    assert isinstance(result, dict)
                    assert 'id' in result
                    print(f"✅ {model_name}.to_dict() working")
                    self.passed += 1
                else:
                    print(f"⚠️  No {model_name} found to test to_dict()")
            except Exception as e:
                print(f"❌ {model_name}.to_dict() failed: {e}")
                self.failed += 1
    
    def test_data_integrity(self):
        print("\n🔒 Testing data integrity...")
        
        # Test academic year consistency
        try:
            classrooms = Classroom.query.all()
            academic_years = set(c.academic_year for c in classrooms)
            print(f"✅ Academic years: {', '.join(academic_years)}")
            self.passed += 1
        except Exception as e:
            print(f"❌ Academic year test failed: {e}")
            self.failed += 1
        
        # Test student-classroom assignments
        try:
            students = Student.query.filter_by(is_enrolled=True).all()
            assigned_students = [s for s in students if s.classroom_id is not None]
            print(f"✅ Student assignments: {len(assigned_students)}/{len(students)} students assigned to classrooms")
            self.passed += 1
        except Exception as e:
            print(f"❌ Student assignment test failed: {e}")
            self.failed += 1
        
        # Test grade calculations
        try:
            grades = Grade.query.all()
            valid_grades = []
            for grade in grades:
                if grade.points_earned <= grade.points_possible:
                    valid_grades.append(grade)
                else:
                    print(f"⚠️  Invalid grade: {grade.points_earned}/{grade.points_possible}")
            print(f"✅ Grade validation: {len(valid_grades)}/{len(grades)} grades valid")
            self.passed += 1
        except Exception as e:
            print(f"❌ Grade validation failed: {e}")
            self.failed += 1
        
        # Test evaluation dates
        try:
            periods = EvaluationPeriod.query.all()
            valid_periods = []
            for period in periods:
                if period.start_date <= period.end_date:
                    valid_periods.append(period)
                else:
                    print(f"⚠️  Invalid period: {period.name} ({period.start_date} > {period.end_date})")
            print(f"✅ Period validation: {len(valid_periods)}/{len(periods)} periods valid")
            self.passed += 1
        except Exception as e:
            print(f"❌ Period validation failed: {e}")
            self.failed += 1
    
    def test_specific_queries(self):
        print("\n🎯 Testing specific business logic queries...")
        
        # Test teacher's classrooms
        try:
            teacher = Teacher.query.filter_by(is_head_teacher=True).first()
            if teacher:
                head_classrooms = Classroom.query.filter_by(head_teacher_id=teacher.id).all()
                assigned_classrooms = db.session.query(Classroom).join(
                    TeacherAssignment
                ).filter(TeacherAssignment.teacher_id == teacher.id).all()
                print(f"✅ Teacher access: Head of {len(head_classrooms)}, assigned to {len(assigned_classrooms)} classrooms")
                self.passed += 1
            else:
                print("⚠️  No head teacher found")
        except Exception as e:
            print(f"❌ Teacher classroom query failed: {e}")
            self.failed += 1
        
        # Test student grades by period
        try:
            student = Student.query.first()
            period = EvaluationPeriod.query.first()
            if student and period:
                grades = Grade.query.join(Evaluation).filter(
                    Grade.student_id == student.id,
                    Evaluation.evaluation_period_id == period.id
                ).all()
                print(f"✅ Student grades: {len(grades)} grades for {student.user.first_name} in {period.name}")
                self.passed += 1
            else:
                print("⚠️  No student or period found")
        except Exception as e:
            print(f"❌ Student grades query failed: {e}")
            self.failed += 1
    
    def print_summary(self):
        print(f"\n📊 Test Summary")
        print(f"✅ Passed: {self.passed}")
        print(f"❌ Failed: {self.failed}")
        print(f"Total: {self.passed + self.failed}")
        
        if self.failed == 0:
            print("\n🎉 All tests passed! Backend is correctly communicating with the database.")
        else:
            print(f"\n⚠️  {self.failed} test(s) failed. Check the errors above.")
            return False
        return True

def main():
    tester = BackendTester()
    success = tester.run_all_tests()
    
    if success:
        # Run additional specific queries test
        with tester.app.app_context():
            tester.test_specific_queries()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()