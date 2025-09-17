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
        admin = User.query.filter_by(email='admin@ecole.com').first()
        if not admin:
            admin = User(
                email='admin@ecole.com',
                first_name='Admin',
                last_name='User', 
                role='admin'  # String role
            )
            admin.set_password('admin123')
            db.session.add(admin)
            print("✅ Created admin: admin@ecole.com / admin123")
        else:
            # Update existing admin to use string role
            if hasattr(admin.role, 'value'):
                admin.role = 'admin'
            admin.set_password('admin123')  # Refresh password
            print("✅ Updated admin user")
        
        # Create teacher user
        teacher_user = User.query.filter_by(email='grace.tanjong@school.cm').first()
        if not teacher_user:
            teacher_user = User(
                email='grace.tanjong@school.cm',
                first_name='Grace',
                last_name='Tanjong',
                role='teacher'  # String role
            )
            teacher_user.set_password('secret')
            db.session.add(teacher_user)
            db.session.flush()
            
            # Create teacher profile
            teacher_profile = Teacher(
                user_id=teacher_user.id,
                employee_number='TEA001',
                specialization='Mathematics',
                is_head_teacher=True,
                created_by=admin.id if admin else None
            )
            db.session.add(teacher_profile)
            print("✅ Created teacher: grace.tanjong@school.cm / secret")
        else:
            # Update existing teacher to use string role
            if hasattr(teacher_user.role, 'value'):
                teacher_user.role = 'teacher'
            teacher_user.set_password('secret')  # Refresh password
            print("✅ Updated teacher user")
        
        # Create sample classroom
        classroom = Classroom.query.filter_by(name='Grade 10A').first()
        if not classroom:
            classroom = Classroom(
                name='Grade 10A',
                level='10',
                academic_year='2024-2025',
                max_students=30,
                assigned_by=admin.id if admin else None
            )
            db.session.add(classroom)
            print("✅ Created sample classroom: Grade 10A")
        
        # Create sample subjects
        subjects_data = [
            {'name': 'Mathematics', 'code': 'MATH101', 'coefficient': 2},
            {'name': 'English', 'code': 'ENG101', 'coefficient': 2},
            {'name': 'Science', 'code': 'SCI101', 'coefficient': 1.5}
        ]
        
        for subject_data in subjects_data:
            subject = Subject.query.filter_by(code=subject_data['code']).first()
            if not subject:
                subject = Subject(**subject_data)
                db.session.add(subject)
                print(f"✅ Created subject: {subject_data['name']}")
        
        # Create sample student
        student_user = User.query.filter_by(email='john.doe@student.com').first()
        if not student_user:
            student_user = User(
                email='john.doe@student.com',
                first_name='John',
                last_name='Doe',
                role='student'  # String role
            )
            student_user.set_password('student123')
            db.session.add(student_user)
            db.session.flush()
            
            student_profile = Student(
                user_id=student_user.id,
                student_number='STU000001',
                classroom_id=classroom.id if classroom else None,
                parent_name='Jane Doe',
                parent_email='jane.doe@parent.com'
            )
            db.session.add(student_profile)
            print("✅ Created sample student: john.doe@student.com / student123")
        
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
        print("   Admin: admin@ecole.com / admin123")
        print("   Teacher: grace.tanjong@school.cm / secret")
        print("   Student: john.doe@student.com / student123")

if __name__ == '__main__':
    seed_database()