# School Management System

A comprehensive web-based school management platform built with Flask (Python) backend and vanilla JavaScript frontend. This system provides complete academic administration capabilities with role-based access control for administrators, teachers, and students.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Installation & Setup](#installation--setup)
- [User Roles & Permissions](#user-roles--permissions)
- [API Documentation](#api-documentation)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Database Schema](#database-schema)
- [Security Implementation](#security-implementation)
- [Deployment](#deployment)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Overview

The School Management System is designed for educational institutions to digitize and streamline their administrative processes. It provides a complete solution for managing students, teachers, attendance, evaluations, grades, and generating comprehensive reports.

### Key Capabilities
- Student enrollment and profile management
- Teacher registration and assignment tracking
- Digital attendance recording for students and staff
- Academic evaluation creation and grade management
- Comprehensive reporting with analytics
- Data import/export via CSV and Excel files
- Role-based access control and audit logging

## Features

### Academic Management
- **Student Registration**: Complete student profiles with parent information
- **Teacher Management**: Professional staff registration and specialization tracking
- **Classroom Organization**: Grade levels, capacity management, and head teacher assignments
- **Subject Configuration**: Curriculum management with coefficient weighting
- **Assignment System**: Teacher-subject-classroom relationship management

### Attendance System
- **Digital Roll Call**: Real-time attendance recording for classrooms
- **Teacher Attendance**: Professional staff attendance tracking
- **Flexible Status Options**: Present, Absent, Late, Excused classifications
- **Historical Analytics**: Attendance trends and rate calculations
- **Bulk Operations**: Efficient classroom-wide attendance management

### Academic Evaluation
- **Multiple Evaluation Types**: Quiz, Test, Assignment, Project, Exam categories
- **Weighted Grading System**: Configurable evaluation weights and coefficients
- **Grade Scale Management**: Letter grades with percentage conversion
- **Academic Periods**: Term and sequence organization
- **Performance Analytics**: Statistical analysis and distribution tracking

### Reporting & Analytics
- **Student Report Cards**: Individual academic performance summaries
- **Classroom Reports**: Class-wide performance analysis
- **Attendance Reports**: Detailed attendance analytics with trends
- **Grade Distribution**: Statistical performance overview with charts
- **Custom Reports**: Flexible reporting with date range selection
- **Export Capabilities**: PDF and Excel report generation

### Data Management
- **Bulk Import**: CSV and Excel file processing with validation
- **Template Generation**: Pre-formatted import templates
- **Data Export**: Complete data extraction capabilities
- **Audit Logging**: Comprehensive system activity tracking
- **Backup Integration**: Database backup and restore functionality

## Technology Stack

### Backend Technologies
- **Python 3.8+**: Core programming language
- **Flask 2.3.3**: Web application framework
- **SQLAlchemy 3.0.5**: Object-relational mapping
- **PostgreSQL**: Primary database system
- **JWT Extended**: Authentication and authorization
- **ReportLab**: PDF report generation
- **Flask-CORS**: Cross-origin resource sharing
- **Flask-Migrate**: Database migration management

### Frontend Technologies
- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Modern styling with Grid, Flexbox, and animations
- **Vanilla JavaScript (ES6+)**: Modular architecture with ES6 modules
- **Chart.js**: Interactive charts and data visualization
- **Font Awesome**: Professional icon library
- **PapaParse**: CSV file processing
- **SheetJS**: Excel file handling

### Development Tools
- **Git**: Version control system
- **PostgreSQL**: Development and production database
- **Python Virtual Environment**: Dependency isolation
- **Flask CLI**: Command-line interface for development
- **Browser DevTools**: Frontend debugging and optimization

## System Architecture

```
┌─────────────────────────────────────────────────┐
│                 Frontend (SPA)                   │
├─────────────────────────────────────────────────┤
│  index.html │ style.css │ JavaScript Modules    │
│             │           │                       │
│  Authentication │ Dashboard │ Student Management │
│  Attendance     │ Grades    │ Reports           │
└─────────────┬───────────────────────────────────┘
              │ HTTP/HTTPS + JWT
              │ REST API Calls
┌─────────────▼───────────────────────────────────┐
│                Flask Backend                    │
├─────────────────────────────────────────────────┤
│  main.py │ Routes │ Models │ Services           │
│          │        │        │                   │
│  Authentication │ Business Logic │ Data Layer   │
└─────────────┬───────────────────────────────────┘
              │ SQLAlchemy ORM
              │ Database Queries
┌─────────────▼───────────────────────────────────┐
│              PostgreSQL Database                │
├─────────────────────────────────────────────────┤
│  Users │ Students │ Teachers │ Classrooms       │
│  Grades │ Attendance │ Reports │ Audit Logs    │
└─────────────────────────────────────────────────┘
```

## Installation & Setup

### Prerequisites
- Python 3.8 or higher
- PostgreSQL 12 or higher
- Git for version control
- Modern web browser (Chrome 80+, Firefox 75+, Safari 13+)

### Quick Start

1. **Clone the Repository**
   ```bash
   git clone https://github.com/InputOutputStream/SchoolManagementApp.git
   cd SchoolManagementApp
   ```

2. **Backend Setup**
   ```bash
   cd backend
   
   # Create virtual environment
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Setup database and run application
   chmod +x setup.sh
   ./setup.sh
   
   # Start backend server
   ./run.sh
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   
   # Update API configuration in config.js
   # Set baseURL to match your backend (default: http://localhost:5000/api)
   
   # Serve frontend files
   python -m http.server 8080
   # or
   npx http-server -p 8080
   ```

4. **Access Application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:5000/api
   - Admin Login: admin@school.cm / secret

### Environment Configuration

Create `.env` file in the backend directory:
```env
# Database Configuration
DATABASE_URL=postgresql://principal:cron@localhost:5432/school

# Security Keys
SECRET_KEY=your-secret-key-change-in-production
JWT_SECRET_KEY=your-jwt-secret-key

# Application Settings
FLASK_ENV=development
FLASK_DEBUG=True

# File Upload Settings
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216  # 16MB
```

## User Roles & Permissions

### Administrator Role
**Full System Access**
- Complete CRUD operations on all entities
- Teacher account creation and role promotion
- System configuration and settings management
- Comprehensive reporting and analytics access
- Database import/export capabilities
- Audit log monitoring and system maintenance

**Specific Capabilities:**
- Create and manage teacher accounts
- Promote teachers to admin status
- Configure classrooms, subjects, and academic periods
- Access all student and attendance data
- Generate system-wide reports
- Manage teacher-subject-classroom assignments

### Teacher Role
**Classroom-Focused Access**
- Student management for assigned classrooms only
- Attendance recording for own classes
- Grade entry and evaluation creation
- Limited reporting scope (assigned students only)
- Profile and assignment viewing

**Specific Capabilities:**
- View and manage students in assigned classrooms
- Record daily attendance for classes
- Create evaluations and enter grades
- Generate reports for assigned students
- Update own profile information
- View teaching assignments and schedules

### Student Role (Limited Implementation)
**Personal Data Access**
- View own academic records and grades
- Access personal profile information
- View attendance history
- Download personal report cards

## API Documentation

### Authentication Endpoints
```
POST /api/auth/login          # User login
POST /api/auth/logout         # User logout
POST /api/auth/refresh        # JWT token refresh
GET  /api/auth/me            # Current user profile
```

### Student Management
```
GET    /api/students                    # List all students (admin) or assigned (teacher)
POST   /api/students                    # Create new student
GET    /api/students/{id}               # Get student details
PUT    /api/students/{id}               # Update student
DELETE /api/students/{id}               # Delete student (admin only)
GET    /api/students/classroom/{id}     # Students by classroom
```

### Teacher Management
```
GET    /api/admin/teachers              # List all teachers (admin only)
POST   /api/admin/teachers              # Create new teacher (admin only)
GET    /api/admin/teachers/{id}         # Get teacher details
PUT    /api/admin/teachers/{id}         # Update teacher
PATCH  /api/admin/teachers/{id}/promote # Promote to admin (admin only)
```

### Attendance System
```
GET    /api/attendance/students         # Get student attendance
POST   /api/attendance/students         # Record student attendance
GET    /api/attendance/teachers         # Get teacher attendance
POST   /api/attendance/teachers         # Record teacher attendance
GET    /api/attendance/classroom/{id}   # Classroom attendance by date
```

### Academic Management
```
GET    /api/classrooms                  # List classrooms
POST   /api/admin/classrooms            # Create classroom (admin only)
GET    /api/subjects                    # List subjects
POST   /api/admin/subjects              # Create subject (admin only)
GET    /api/evaluations                 # List evaluations
POST   /api/evaluations                 # Create evaluation
```

### Grading System
```
GET    /api/grades                      # List grades
POST   /api/grades                      # Add grade
PUT    /api/grades/{id}                 # Update grade
GET    /api/grades/student/{id}         # Student grades
GET    /api/grades/evaluation/{id}      # Evaluation grades
```

### Reporting
```
GET    /api/reports/student/{id}        # Student report card
GET    /api/reports/classroom/{id}      # Classroom report
GET    /api/reports/attendance          # Attendance reports
POST   /api/reports/generate            # Generate custom report
```

## Frontend Architecture

### Project Structure
```
frontend/
├── index.html                 # Single-page application entry
├── style.css                 # Global styles and responsive design
├── app.js                    # Main application controller
├── modules/
│   ├── authManager.js        # Authentication and session management
│   ├── dashboardManager.js   # Dashboard data and UI management
│   ├── studentManager.js     # Student-related operations
│   ├── attendanceManager.js  # Attendance tracking functionality
│   ├── gradesReportsManager.js # Grades and reporting
│   ├── fileImportManager.js  # File upload and import handling
│   ├── uiUtils.js           # UI utilities and helpers
│   └── config.js            # Configuration and API endpoints
└── assets/
    └── templates/           # CSV templates for data import
```

### Module Responsibilities

**authManager.js**
- JWT token management and automatic refresh
- User authentication and session handling
- Role-based access control enforcement
- Login/logout functionality with validation

**dashboardManager.js**
- Real-time statistics calculation and display
- Chart.js integration for data visualization
- Dashboard data aggregation from multiple APIs
- Interactive calendar and notice board management

**studentManager.js**
- Student CRUD operations and form validation
- Advanced search and filtering capabilities
- Profile management with parent information
- Classroom assignment and enrollment tracking

**attendanceManager.js**
- Daily attendance recording interface
- Bulk attendance operations for efficiency
- Status management with flexible options
- Historical attendance data visualization

**gradesReportsManager.js**
- Grade entry with weighted calculations
- Report generation and PDF export
- Academic analytics and trend analysis
- Performance comparison and ranking

### Key Features

**Responsive Design**
- Mobile-first approach with CSS Grid and Flexbox
- Breakpoints optimized for tablets and smartphones
- Touch-friendly interface elements
- Adaptive navigation with collapsible sidebar

**Real-time Updates**
- Dynamic content loading without page refresh
- Live search with debounced input handling
- Automatic data synchronization
- Progress indicators for long-running operations

**Data Validation**
- Client-side form validation with real-time feedback
- Server-side validation error handling
- File format and size validation for imports
- Data integrity checks before submission

## Backend Architecture

### Project Structure
```
backend/
├── main.py                   # Application entry point
├── app/
│   ├── __init__.py          # Flask app factory
│   ├── models/              # SQLAlchemy models
│   │   ├── User.py
│   │   ├── Student.py
│   │   ├── Teacher.py
│   │   ├── Classroom.py
│   │   ├── Subject.py
│   │   ├── Grade.py
│   │   └── Attendance.py
│   ├── routes/              # API route handlers
│   │   ├── auth.py
│   │   ├── students.py
│   │   ├── teachers.py
│   │   ├── attendance.py
│   │   └── reports.py
│   ├── services/            # Business logic layer
│   └── utils/               # Helper functions
├── migrations/              # Database migration files
├── requirements.txt         # Python dependencies
├── setup.sh                # Database setup script
└── run.sh                  # Application runner
```

### Core Models

**User Model**
- Base authentication model for all system users
- Role-based access with string enumeration
- Password hashing with Werkzeug security
- Session management and audit trail

**Student Model**
- Complete academic profile with personal details
- Parent/guardian contact information
- Classroom assignment and enrollment status
- Academic history and performance tracking

**Teacher Model**
- Professional credentials and specialization
- Employment details and hire date
- Head teacher designation capabilities
- Teaching assignment relationships

**Academic Models**
- Classroom: Grade level, capacity, and head teacher
- Subject: Curriculum organization with coefficients
- Evaluation: Assessment types and grading criteria
- Grade: Performance records with weighted calculations

### Business Logic Services

**Authentication Service**
- JWT token generation and validation
- Role-based permission checking
- Session management and security
- Password reset and user activation

**Academic Service**
- Grade calculation with weighted averages
- Report card generation with ranking
- Academic period management
- Performance analytics and trends

**Import/Export Service**
- CSV and Excel file processing
- Data validation and error reporting
- Bulk operation handling
- Template generation for imports

## Database Schema

### Core Tables

**users**
- Primary authentication table
- Stores login credentials and basic profile
- Role assignment (admin, teacher, student)
- Account status and timestamps

**students**
- Extended student information
- Links to user table via foreign key
- Academic and contact details
- Enrollment status and classroom assignment

**teachers**
- Professional staff information
- Employee number and specialization
- Head teacher designation
- Hiring and employment details

**classrooms**
- Academic organization structure
- Grade level and capacity management
- Head teacher assignment
- Academic year association

**subjects**
- Curriculum organization
- Subject codes and coefficients
- Credit hour calculation
- Academic requirements

**evaluations**
- Assessment definitions and criteria
- Evaluation types and weights
- Subject and classroom associations
- Grading rubrics and standards

**grades**
- Individual student performance records
- Points earned and percentage calculations
- Letter grade assignments
- Comments and feedback

**attendances**
- Daily attendance tracking
- Status classifications
- Classroom and date organization
- Historical record maintenance

### Relationships

```sql
users (1) ←→ (1) students
users (1) ←→ (1) teachers
teachers (1) ←→ (*) classrooms (head_teacher)
classrooms (1) ←→ (*) students
teachers (*) ←→ (*) subjects ←→ (*) classrooms
students (*) ←→ (*) evaluations ←→ (*) grades
students (1) ←→ (*) attendances
```

## Security Implementation

### Authentication & Authorization
- **JWT Tokens**: Secure session management with automatic refresh
- **Role-Based Access**: Granular permissions based on user roles
- **Password Security**: Scrypt hashing with salt for password storage
- **Session Management**: Secure token storage with expiration handling

### Data Protection
- **Input Validation**: Comprehensive server-side validation
- **SQL Injection Prevention**: SQLAlchemy ORM protection
- **XSS Protection**: HTML sanitization and CSP headers
- **CSRF Protection**: Token-based request validation

### API Security
- **HTTPS Enforcement**: Secure communication in production
- **CORS Configuration**: Controlled cross-origin requests
- **Rate Limiting**: API endpoint protection
- **Audit Logging**: Complete activity tracking

### File Upload Security
- **File Type Validation**: Whitelist-based file format checking
- **Size Limitations**: Maximum file size enforcement
- **Virus Scanning**: Malware detection integration
- **Secure Storage**: Isolated file storage with access controls

## Deployment

### Production Setup

**Backend Deployment**
```bash
# Production environment setup
pip install gunicorn
export FLASK_ENV=production
export DATABASE_URL=postgresql://user:pass@host:port/db

# Run with Gunicorn
gunicorn --workers 4 --bind 0.0.0.0:5000 main:app
```

**Frontend Deployment**
```bash
# Build optimized assets
npm install -g clean-css-cli terser

# Minify CSS
cleancss -o style.min.css style.css

# Minify JavaScript
terser app.js -o app.min.js

# Configure web server (nginx/apache)
# Enable gzip compression
# Set proper cache headers
# Configure HTTPS
```

### Docker Deployment
```dockerfile
# Backend Dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "main:app"]
```

### Environment Configuration
```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/school
    depends_on:
      - db
  
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
  
  db:
    image: postgres:13
    environment:
      POSTGRES_DB: school
      POSTGRES_USER: principal
      POSTGRES_PASSWORD: cron
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Development Workflow

### Local Development
```bash
# Backend development
cd backend
source .venv/bin/activate
flask run --debug

# Frontend development
cd frontend
python -m http.server 8080
# or use Live Server in VS Code
```

### Database Management
```bash
# Create migration
flask db migrate -m "Description"

# Apply migrations
flask db upgrade

# Seed database
python seed_db.py
```

### Testing Workflow
```bash
# Backend tests
python -m pytest tests/

# Frontend testing
# Manual testing procedures documented
# Browser compatibility testing
# Responsive design validation
```

## Troubleshooting

### Common Issues

**Database Connection Errors**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Verify connection string
psql postgresql://principal:cron@localhost:5432/school

# Reset permissions
sudo -u postgres psql
\c school
GRANT ALL PRIVILEGES ON SCHEMA public TO principal;
```

**Authentication Problems**
- Verify JWT secret key configuration
- Check token expiration settings
- Confirm user role assignments
- Review CORS configuration

**Import/Export Issues**
- Validate file format and encoding
- Check column headers match templates
- Verify data types and constraints
- Review file size limitations

### Debug Mode
Enable comprehensive logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

Frontend debug mode:
```javascript
localStorage.setItem('debug', 'true');
```

## Contributing

### Development Guidelines
- Follow PEP 8 for Python code style
- Use consistent JavaScript formatting (2 spaces)
- Implement comprehensive error handling
- Add detailed docstrings and comments
- Maintain backward compatibility

### Pull Request Process
1. Fork repository and create feature branch
2. Implement changes with appropriate tests
3. Update documentation as needed
4. Submit PR with detailed description
5. Address code review feedback
6. Ensure all tests pass

### Code Review Checklist
- Security considerations addressed
- Performance impact evaluated
- Database migrations included
- Documentation updated
- Error handling implemented
- Tests cover new functionality

## Support & Documentation

### Additional Resources
- **User Manual**: Complete guide for end users
- **Developer Documentation**: Technical implementation details
- **API Reference**: Comprehensive endpoint documentation
- **Deployment Guide**: Production setup instructions

### Getting Help
- **Technical Issues**: Create GitHub issue with details
- **Feature Requests**: Submit via project board
- **Security Concerns**: Email arnold.edu@facsciences-uy1.cm
- **General Questions**: Check FAQ or contact support

---

**Version**: 1.0.0  
**Last Updated**: September 2025  
**License**: MIT License  
**Maintainers**: School Development Team [arnold.edu@facsciences-uy1.cm]