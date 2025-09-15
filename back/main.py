# main.py
from app import create_app, db
from app.models import *
from flask import Flask
from flask_cors import CORS

app = create_app()



@app.cli.command()
def init_db():
    """Initialize database"""
    db.create_all()
    print("Database initialized!")

@app.cli.command()
def create_admin():
    """Create admin user"""
    from app.models.User import User, UserRole
    
    admin = User(
        email='admin@ecole.com',
        first_name='Admin',
        last_name='System',
        role=UserRole.ADMIN
    )
    admin.set_password('admin123')
    
    db.session.add(admin)
    db.session.commit()
    print("Admin user created! Email: admin@ecole.com, Password: admin123")

if __name__ == '__main__':
    app.run(debug=True)
