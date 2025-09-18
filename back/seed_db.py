# seed_database.py - Run this to fix all authentication issues
from app import create_app, db
from app.models.User import User
from app.models.Teacher import Teacher
from app.models.Student import Student
from app.models.Classroom import Classroom
from app.models.Subject import Subject

def seed_database():
    app = create_app()
    
    with app.app_context():
        # Create all tables
        db.create_all()
        print("✅ Database tables created")
        
        # Create admin user
        admin = User.query.filter_by(email='admin@school.cm').first()
        if not admin:
            admin = User(
                email='admin@school.cm',
                first_name='Admin',
                last_name='User', 
                role='admin'
            )
            admin.set_password('secret')
            db.session.add(admin)
            print("✅ Created admin: admin@school.cm / secret")
        else:
            # Update existing admin to use string role
            admin.role = 'admin'
            admin.set_password('secret')  # Refresh password
            print("✅ Updated admin user")
        
        # Create teacher user
        teacher_user = User.query.filter_by(email='grace.tanjong@school.cm').first()
        if not teacher_user:
            teacher_user = User(
                email='grace.tanjong@school.cm',
                first_name='Grace',
                last_name='Tanjong',
                role='teacher'
            )
            teacher_user.set_password('secret')
            db.session.add(teacher_user)
            db.session.flush()
            
            # Create teacher profile
            teacher_profile = Teacher(
                user_id=teacher_user.id,
                employee_number='T004',
                specialization='History and Geography',
                is_head_teacher=False,
                created_by=admin.id if admin else None
            )
            db.session.add(teacher_profile)
            print("✅ Created teacher: grace.tanjong@school.cm / secret")
        else:
            # Update existing teacher to use string role
            teacher_user.role = 'teacher'
            teacher_user.set_password('secret')  # Refresh password
            print("✅ Updated teacher user")
        
        # Create sample classroom
        classroom = Classroom.query.filter_by(name='Form 1A').first()
        if not classroom:
            classroom = Classroom(
                name='Form 1A',
                level='Form 1',
                academic_year='2025/2026',
                max_students=45,
                assigned_by=admin.id if admin else None
            )
            db.session.add(classroom)
            print("✅ Created sample classroom: Form 1A")
        
        # Create sample subjects
        subjects_data = [
            {'name': 'Mathematics', 'code': 'MATH', 'coefficient': 3},
            {'name': 'English Language', 'code': 'ENG', 'coefficient': 3},
            {'name': 'French', 'code': 'FREN', 'coefficient': 3}
        ]
        
        for subject_data in subjects_data:
            subject = Subject.query.filter_by(code=subject_data['code']).first()
            if not subject:
                subject = Subject(**subject_data)
                db.session.add(subject)
                print(f"✅ Created subject: {subject_data['name']}")
        
        # Create sample student
        student_user = User.query.filter_by(email='chi.azeh@student.school.cm').first()
        if not student_user:
            student_user = User(
                email='chi.azeh@student.school.cm',
                first_name='Chi',
                last_name='Azeh',
                role='student'
            )
            student_user.set_password('secret')
            db.session.add(student_user)
            db.session.flush()
            
            student_profile = Student(
                user_id=student_user.id,
                student_number='S2025001',
                classroom_id=classroom.id if classroom else None,
                parent_name='Mr. Azeh',
                parent_email='parent1@example.com'
            )
            db.session.add(student_profile)
            print("✅ Created sample student: chi.azeh@student.school.cm / secret")
        
        # Fix any existing enum roles
        all_users = User.query.all()
        enum_fixed = 0
        for user in all_users:
            if hasattr(user.role, 'value'):  # It's still an enum
                if user.role.value == 'ADMIN':
                    user.role = 'admin'
                elif user.role.value == 'TEACHER':
                    user.role = 'teacher'
                elif user.role.value == 'STUDENT':
                    user.role = 'student'
                enum_fixed += 1
        
        if enum_fixed > 0:
            print(f"✅ Fixed {enum_fixed} enum roles to string roles")
        
        db.session.commit()
        print("🎯 Database seeded successfully!")
        
        # Print summary
        print("\n📊 Database Summary:")
        print(f"   Users: {User.query.count()}")
        print(f"   Teachers: {Teacher.query.count()}")
        print(f"   Students: {Student.query.count()}")
        print(f"   Classrooms: {Classroom.query.count()}")
        print(f"   Subjects: {Subject.query.count()}")
        
        print("\n🔑 Login Credentials:")
        print("   Admin: admin@school.cm / secret")
        print("   Teacher: grace.tanjong@school.cm / secret")
        print("   Student: chi.azeh@student.school.cm / secret")

if __name__ == '__main__':
    seed_database()