import { API_CONFIG } from './config.js';
import { ApiClient } from './apiClient.js';

// Authentication System
export class AuthManager {
    constructor() {
        this.currentUser = null;
        this.selectedRole = 'teacher';
        this.token = null;
        this.apiClient = new ApiClient(this);
        this.clockInterval = null;
        this.initializeAuth();
    }

    initializeAuth() {
        // Check if user is already logged in
        const savedData = this.getStoredAuth();
        if (savedData && savedData.token && savedData.user) {
            this.currentUser = savedData.user;
            this.token = savedData.token;
            this.showDashboard();
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupRoleListeners();
                this.setupFormListeners();
                this.setupLogoutListener();
            });
        } else {
            this.setupRoleListeners();
            this.setupFormListeners();
            this.setupLogoutListener();
        }
    }

    setupLogoutListener() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        } else {
            // Use event delegation if button not found immediately
            document.addEventListener('click', (e) => {
                if (e.target.id === 'logoutBtn' || e.target.closest('#logoutBtn')) {
                    e.preventDefault();
                    this.logout();
                }
            });
        }
    }

    setupRoleListeners() {
        const roleButtons = document.querySelectorAll('.role-btn');
        console.log('Role buttons found:', roleButtons.length);
        
        if (roleButtons.length === 0) {
            console.warn('No role buttons found. Will use event delegation.');
            
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('role-btn')) {
                    this.handleRoleSelection(e.target);
                }
            });
        } else {
            roleButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleRoleSelection(btn);
                });
            });
        }
    }

    handleRoleSelection(btn) {
        document.querySelectorAll('.role-btn').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-checked', 'false');
        });
        
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        
        this.selectedRole = btn.dataset.role;
        
        console.log('Role selected:', this.selectedRole);
        
        window.dispatchEvent(new CustomEvent('roleChanged', { 
            detail: { role: this.selectedRole } 
        }));
    }

    setupFormListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Updated form IDs to match new HTML structure
        const teacherForm = document.getElementById('teacherForm');
        if (teacherForm) {
            teacherForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateTeacher();
            });
        }

        const classroomForm = document.getElementById('classroomForm');
        if (classroomForm) {
            classroomForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateClassroom();
            });
        }

        const subjectForm = document.getElementById('subjectForm');
        if (subjectForm) {
            subjectForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateSubject();
            });
        }

        const evaluationForm = document.getElementById('evaluationForm');
        if (evaluationForm) {
            evaluationForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateEvaluation();
            });
        }

        const assignmentForm = document.getElementById('assignmentForm');
        if (assignmentForm) {
            assignmentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateAssignment();
            });
        }

        // Updated form handlers for new structure
        const studentForm = document.getElementById('studentForm');
        if (studentForm) {
            studentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateStudent();
            });
        }

        const gradeEntryForm = document.getElementById('gradeEntryForm');
        if (gradeEntryForm) {
            gradeEntryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleGradeEntry();
            });
        }

        this.setupFileUploadListeners();

        // Updated button IDs for new structure
        const loadStudentsBtn = document.getElementById('loadStudentsForAttendanceBtn');
        if (loadStudentsBtn) {
            loadStudentsBtn.addEventListener('click', () => {
                window.app.loadStudentsForAttendance();
            });
        }

        const loadTeachersBtn = document.getElementById('loadTeachersAttendanceBtn');
        if (loadTeachersBtn) {
            loadTeachersBtn.addEventListener('click', () => {
                window.app.loadTeachersAttendance();
            });
        }

        const generateReportsBtn = document.getElementById('generateReportsBtn');
        if (generateReportsBtn) {
            generateReportsBtn.addEventListener('click', () => {
                window.app.generateReports();
            });
        }
    }

    setupFileUploadListeners() {
        // Updated file input IDs to match new HTML structure
        const studentsFileInput = document.getElementById('studentsFileInput');
        if (studentsFileInput) {
            studentsFileInput.addEventListener('change', (e) => {
                window.handleFileImport(e, 'students');
            });
        }

        const teachersFileInput = document.getElementById('teachersFileInput');
        if (teachersFileInput) {
            teachersFileInput.addEventListener('change', (e) => {
                window.handleFileImport(e, 'teachers');
            });
        }

        const classroomsFileInput = document.getElementById('classroomsFileInput');
        if (classroomsFileInput) {
            classroomsFileInput.addEventListener('change', (e) => {
                window.handleFileImport(e, 'classrooms');
            });
        }

        const subjectsFileInput = document.getElementById('subjectsFileInput');
        if (subjectsFileInput) {
            subjectsFileInput.addEventListener('change', (e) => {
                window.handleFileImport(e, 'subjects');
            });
        }

        // Updated template download button IDs
        const downloadButtons = [
            { id: 'downloadStudentsTemplate', type: 'students' },
            { id: 'downloadTeachersTemplate', type: 'teachers' },
            { id: 'downloadClassroomsTemplate', type: 'classrooms' },
            { id: 'downloadSubjectsTemplate', type: 'subjects' }
        ];

        downloadButtons.forEach(({ id, type }) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    window.downloadTemplate(type);
                });
            }
        });
    }

    async handleLogin() {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        
        if (!emailInput || !passwordInput) {
            this.showMessage('Email and password fields are required.', 'error');
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            this.showMessage('Please enter both email and password.', 'error');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            this.showMessage('Please enter a valid email address.', 'error');
            return;
        }

        this.setLoading(true);
        
        try {
            const loginData = {
                email: email,
                password: password
            };

            const response = await this.apiClient.call(
                'POST', 
                API_CONFIG.endpoints.auth.login,
                loginData,
                false
            );
            
            if (response && response.access_token && response.user) {
                this.token = response.access_token;
                this.currentUser = response.user;
                this.storeAuth(response.user, response.access_token);
                this.showMessage('Login successful!', 'success');
                
                window.dispatchEvent(new CustomEvent('userLoggedIn', { 
                    detail: { user: this.currentUser } 
                }));
                
                setTimeout(() => {
                    this.showDashboard();
                }, 500);
            } else {
                throw new Error(response?.message || 'Invalid response from server');
            }
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Login failed. Please try again.';
            
            if (error.message.includes('422')) {
                errorMessage = 'Invalid email or password format. Please check your credentials.';
            } else if (error.message.includes('401')) {
                errorMessage = 'Invalid email or password. Please try again.';
            } else if (error.message.includes('Network error')) {
                errorMessage = 'Network error. Please check your connection and try again.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            this.showMessage(errorMessage, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async handleCreateTeacher() {
        if (!this.currentUser || this.currentUser.role !== 'admin') {
            this.showMessage('Access denied. Admin privileges required.', 'error');
            return;
        }

        const teacherForm = document.getElementById('teacherForm');
        if (!teacherForm) {
            this.showMessage('Teacher form not found.', 'error');
            return;
        }

        const formData = new FormData(teacherForm);
        const teacherData = Object.fromEntries(formData.entries());

        // Updated field names to match new HTML structure
        const sanitizedData = {
            first_name: teacherData.first_name?.toString().trim() || null,
            last_name: teacherData.last_name?.toString().trim() || null,
            email: teacherData.email?.toString().trim() || null,
            employee_number: teacherData.employee_number?.toString().trim() || null,
            specialization: teacherData.specialization?.toString().trim() || null,
            phone_number: teacherData.phone_number?.toString().trim() || null,
            is_head_teacher: Boolean(formData.has('is_head_teacher')),
            password: teacherData.password?.toString().trim() || null
        };

        const requiredFields = ['first_name', 'last_name', 'email', 'employee_number'];
        const missingFields = requiredFields.filter(field => !sanitizedData[field]);
        
        if (missingFields.length > 0) {
            this.showMessage(`Missing required fields: ${missingFields.join(', ')}`, 'error');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedData.email)) {
            this.showMessage('Please enter a valid email address.', 'error');
            return;
        }

        if (sanitizedData.employee_number.length > 20) {
            this.showMessage('Employee number must be 20 characters or less.', 'error');
            return;
        }

        try {
            const response = await this.apiClient.call(
                'POST', 
                API_CONFIG.endpoints.admin.teachers.create, 
                sanitizedData
            );
            
            if (response && (response.message || response.id)) {
                this.showMessage('Teacher created successfully!', 'success');
                teacherForm.reset();
                
                window.dispatchEvent(new CustomEvent('teacherCreated', { detail: response }));
            } else {
                this.showMessage('Teacher creation failed - invalid response', 'error');
            }
        } catch (error) {
            console.error('Create teacher error:', error);
            let errorMessage = 'Failed to create teacher.';
            
            if (error.message.includes('422')) {
                errorMessage = 'Invalid data format. Please check all fields.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            this.showMessage(errorMessage, 'error');
        }
    }

    async handleCreateStudent() {
        const studentForm = document.getElementById('studentForm');
        if (!studentForm) {
            this.showMessage('Student form not found.', 'error');
            return;
        }

        const formData = new FormData(studentForm);
        const studentData = Object.fromEntries(formData.entries());

        try {
            if (window.studentManager) {
                await window.studentManager.registerStudent(studentData);
                studentForm.reset();
                this.showMessage('Student created successfully!', 'success');
                
                // Refresh students list
                if (window.dashboardManager) {
                    await window.dashboardManager.loadStudents();
                }
            } else {
                throw new Error('Student manager not initialized');
            }
        } catch (error) {
            console.error('Error creating student:', error);
            this.showMessage('Failed to create student: ' + error.message, 'error');
        }
    }

    async handleCreateClassroom() {
        if (!this.currentUser || this.currentUser.role !== 'admin') {
            this.showMessage('Access denied. Admin privileges required.', 'error');
            return;
        }

        const classroomForm = document.getElementById('classroomForm');
        if (!classroomForm) {
            this.showMessage('Classroom form not found.', 'error');
            return;
        }

        const formData = new FormData(classroomForm);
        const classroomData = Object.fromEntries(formData.entries());

        const sanitizedData = {
            name: classroomData.name?.toString().trim() || null,
            level: classroomData.grade_level?.toString().trim() || null,
            description: classroomData.description?.toString().trim() || null,
            max_students: classroomData.capacity ? parseInt(classroomData.capacity) : null,
            head_teacher_email: classroomData.head_teacher_email?.toString().trim() || null,
            academic_year: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)
        };

        const requiredFields = ['name', 'level'];
        const missingFields = requiredFields.filter(field => !sanitizedData[field]);
        
        if (missingFields.length > 0) {
            this.showMessage(`Missing required fields: ${missingFields.join(', ')}`, 'error');
            return;
        }

        if (sanitizedData.name.length > 50) {
            this.showMessage('Classroom name must be 50 characters or less.', 'error');
            return;
        }

        if (sanitizedData.level.length > 50) {
            this.showMessage('Grade level must be 50 characters or less.', 'error');
            return;
        }

        if (sanitizedData.max_students && sanitizedData.max_students <= 0) {
            this.showMessage('Capacity must be a positive number.', 'error');
            return;
        }

        try {
            const response = await this.apiClient.call('POST', API_CONFIG.endpoints.admin.classrooms.create, sanitizedData);
            
            if (response && (response.message || response.id)) {
                this.showMessage('Classroom created successfully!', 'success');
                classroomForm.reset();
                
                window.dispatchEvent(new CustomEvent('classroomCreated', { detail: response }));
            } else {
                this.showMessage('Classroom creation failed - invalid response', 'error');
            }
        } catch (error) {
            console.error('Create classroom error:', error);
            let errorMessage = 'Failed to create classroom.';
            
            if (error.message.includes('422')) {
                errorMessage = 'Invalid data format. Please check all fields.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            this.showMessage(errorMessage, 'error');
        }
    }

    async handleCreateSubject() {
        if (!this.currentUser || this.currentUser.role !== 'admin') {
            this.showMessage('Access denied. Admin privileges required.', 'error');
            return;
        }

        const subjectForm = document.getElementById('subjectForm');
        if (!subjectForm) {
            this.showMessage('Subject form not found.', 'error');
            return;
        }

        const formData = new FormData(subjectForm);
        const subjectData = Object.fromEntries(formData.entries());

        const sanitizedData = {
            name: subjectData.name?.toString().trim() || null,
            code: subjectData.code?.toString().trim() || null,
            description: subjectData.description?.toString().trim() || null,
            coefficient: subjectData.coefficient ? parseInt(subjectData.coefficient) : 1
        };

        const requiredFields = ['name', 'code'];
        const missingFields = requiredFields.filter(field => !sanitizedData[field]);
        
        if (missingFields.length > 0) {
            this.showMessage(`Missing required fields: ${missingFields.join(', ')}`, 'error');
            return;
        }

        if (sanitizedData.name.length > 100) {
            this.showMessage('Subject name must be 100 characters or less.', 'error');
            return;
        }

        if (sanitizedData.code.length > 20) {
            this.showMessage('Subject code must be 20 characters or less.', 'error');
            return;
        }

        if (sanitizedData.coefficient && sanitizedData.coefficient <= 0) {
            this.showMessage('Coefficient must be a positive integer.', 'error');
            return;
        }

        try {
            const response = await this.apiClient.call('POST', API_CONFIG.endpoints.admin.subjects.create, sanitizedData);
            
            if (response && (response.message || response.id)) {
                this.showMessage('Subject created successfully!', 'success');
                subjectForm.reset();
                
                window.dispatchEvent(new CustomEvent('subjectCreated', { detail: response }));
            } else {
                this.showMessage('Subject creation failed - invalid response', 'error');
            }
        } catch (error) {
            console.error('Create subject error:', error);
            let errorMessage = 'Failed to create subject.';
            
            if (error.message.includes('422')) {
                errorMessage = 'Invalid data format. Please check all fields.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            this.showMessage(errorMessage, 'error');
        }
    }

    async handleCreateEvaluation() {
        const evaluationForm = document.getElementById('evaluationForm');
        if (!evaluationForm) {
            this.showMessage('Evaluation form not found.', 'error');
            return;
        }

        const formData = new FormData(evaluationForm);
        const evaluationData = Object.fromEntries(formData.entries());

        const sanitizedData = {
            name: evaluationData.name?.toString().trim() || null,
            type: evaluationData.type?.toString().trim() || null,
            subject_id: evaluationData.subject_id ? parseInt(evaluationData.subject_id) : null,
            classroom_id: evaluationData.classroom_id ? parseInt(evaluationData.classroom_id) : null,
            evaluation_date: evaluationData.evaluation_date || new Date().toISOString().split('T')[0],
            max_points: evaluationData.max_points ? parseFloat(evaluationData.max_points) : 20,
            weight: evaluationData.weight ? parseFloat(evaluationData.weight) : 1.0,
            description: evaluationData.description?.toString().trim() || null
        };

        const requiredFields = ['name', 'type', 'subject_id', 'classroom_id'];
        const missingFields = requiredFields.filter(field => !sanitizedData[field]);
        
        if (missingFields.length > 0) {
            this.showMessage(`Missing required fields: ${missingFields.join(', ')}`, 'error');
            return;
        }

        try {
            const response = await this.apiClient.call('POST', '/evaluations', sanitizedData);
            
            if (response && (response.message || response.id)) {
                this.showMessage('Evaluation created successfully!', 'success');
                evaluationForm.reset();
                
                window.dispatchEvent(new CustomEvent('evaluationCreated', { detail: response }));
            } else {
                this.showMessage('Evaluation creation failed - invalid response', 'error');
            }
        } catch (error) {
            console.error('Create evaluation error:', error);
            this.showMessage('Failed to create evaluation: ' + error.message, 'error');
        }
    }

    async handleCreateAssignment() {
        if (!this.currentUser || this.currentUser.role !== 'admin') {
            this.showMessage('Access denied. Admin privileges required.', 'error');
            return;
        }

        const assignmentForm = document.getElementById('assignmentForm');
        if (!assignmentForm) {
            this.showMessage('Assignment form not found.', 'error');
            return;
        }

        const formData = new FormData(assignmentForm);
        const assignmentData = Object.fromEntries(formData.entries());

        const sanitizedData = {
            teacher_id: assignmentData.teacher_id ? parseInt(assignmentData.teacher_id) : null,
            subject_id: assignmentData.subject_id ? parseInt(assignmentData.subject_id) : null,
            classroom_id: assignmentData.classroom_id ? parseInt(assignmentData.classroom_id) : null,
            academic_year: assignmentData.academic_year?.toString().trim() || null
        };

        const requiredFields = ['teacher_id', 'subject_id', 'classroom_id'];
        const missingFields = requiredFields.filter(field => !sanitizedData[field]);
        
        if (missingFields.length > 0) {
            this.showMessage(`Missing required fields: ${missingFields.join(', ')}`, 'error');
            return;
        }

        try {
            const response = await this.apiClient.call('POST', '/admin/assignments', sanitizedData);
            
            if (response && (response.message || response.id)) {
                this.showMessage('Assignment created successfully!', 'success');
                assignmentForm.reset();
                
                window.dispatchEvent(new CustomEvent('assignmentCreated', { detail: response }));
            } else {
                this.showMessage('Assignment creation failed - invalid response', 'error');
            }
        } catch (error) {
            console.error('Create assignment error:', error);
            this.showMessage('Failed to create assignment: ' + error.message, 'error');
        }
    }

    async handleGradeEntry() {
        const gradeEntryForm = document.getElementById('gradeEntryForm');
        if (!gradeEntryForm) {
            this.showMessage('Grade entry form not found.', 'error');
            return;
        }

        const formData = new FormData(gradeEntryForm);
        const gradeData = Object.fromEntries(formData.entries());

        try {
            if (window.gradesReportsManager) {
                await window.gradesReportsManager.addGrade(gradeData);
                gradeEntryForm.reset();
            } else {
                throw new Error('Grades manager not initialized');
            }
        } catch (error) {
            console.error('Error adding grade:', error);
            this.showMessage('Failed to add grade: ' + error.message, 'error');
        }
    }

    setCurrentDate() {
        const dateInputs = document.querySelectorAll('input[type="date"]');
        const today = new Date();
        const todayStr = today.getFullYear() + '-' + 
                        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(today.getDate()).padStart(2, '0');
        
        dateInputs.forEach(input => {
            if (!input.value) {
                input.value = todayStr;
            }
        });
    }

    showDashboard() {
        const authSection = document.getElementById('authSection');
        const dashboardSection = document.getElementById('dashboardSection');
        
        if (authSection && dashboardSection) {
            authSection.style.display = 'none';
            dashboardSection.classList.add('active');
            
            this.updateDashboardUI();
            this.initializeDashboard();
        } else {
            console.error('Dashboard sections not found');
        }
    }

    updateDashboardUI() {
        if (this.currentUser) {
            const userInitialsEl = document.getElementById('userInitials');
            if (userInitialsEl && this.currentUser.first_name && this.currentUser.last_name) {
                const initials = (this.currentUser.first_name[0] + this.currentUser.last_name[0]).toUpperCase();
                userInitialsEl.textContent = initials;
            }
            
            // Show admin-only features
            if (this.currentUser.role === 'admin') {
                const adminElements = document.querySelectorAll('.admin-only');
                adminElements.forEach(element => {
                    element.classList.remove('hidden');
                    element.style.display = 'block';
                });
            }

            // Update user info displays
            const userNameElements = document.querySelectorAll('.user-name');
            userNameElements.forEach(el => {
                el.textContent = `${this.currentUser.first_name} ${this.currentUser.last_name}`;
            });

            const userRoleElements = document.querySelectorAll('.user-role');
            userRoleElements.forEach(el => {
                el.textContent = this.currentUser.role.charAt(0).toUpperCase() + this.currentUser.role.slice(1);
            });
        }
    }

    setLoading(isLoading) {
        const loginText = document.getElementById('loginText');
        const loginLoading = document.getElementById('loginLoading');
        const submitBtn = document.querySelector('#loginForm button[type="submit"]');

        if (isLoading) {
            if (loginText) loginText.classList.add('hidden');
            if (loginLoading) loginLoading.classList.remove('hidden');
            if (submitBtn) submitBtn.disabled = true;
        } else {
            if (loginText) loginText.classList.remove('hidden');
            if (loginLoading) loginLoading.classList.add('hidden');
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    showMessage(message, type) {
        const messageDiv = document.getElementById('authMessage');
        if (messageDiv) {
            messageDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
            
            setTimeout(() => {
                messageDiv.innerHTML = '';
            }, 5000);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    storeAuth(user, token) {
        try {
            const authData = { user: user, token: token };
            localStorage.setItem('school_auth', JSON.stringify(authData));
        } catch (error) {
            console.error('Error storing auth data:', error);
        }
    }

    getStoredAuth() {
        try {
            const stored = localStorage.getItem('school_auth');
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.error('Error retrieving auth data:', error);
            localStorage.removeItem('school_auth');
            return null;
        }
    }

    logout() {
        console.log('Logout initiated');
        
        this.currentUser = null;
        this.token = null;
        
        try {
            localStorage.removeItem('school_auth');
        } catch (error) {
            console.error('Error clearing auth data:', error);
        }
        
        const authSection = document.getElementById('authSection');
        const dashboardSection = document.getElementById('dashboardSection');
        const loginForm = document.getElementById('loginForm');
        
        if (authSection) {
            authSection.style.display = 'flex';
        }
        if (dashboardSection) {
            dashboardSection.classList.remove('active');
        }
        if (loginForm) {
            loginForm.reset();
        }
        
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
        
        document.querySelectorAll('.role-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-checked', 'false');
        });
        const defaultRoleBtn = document.querySelector('.role-btn[data-role="teacher"]');
        if (defaultRoleBtn) {
            defaultRoleBtn.classList.add('active');
            defaultRoleBtn.setAttribute('aria-checked', 'true');
        }
        this.selectedRole = 'teacher';
        
        this.showMessage('Logged out successfully', 'success');
        
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }

        window.dispatchEvent(new CustomEvent('userLoggedOut'));
        
        console.log('Logout completed');
    }

    initializeDashboard() {
        window.dispatchEvent(new CustomEvent('dashboardInitialized'));
        
        this.updateClock();
        this.setCurrentDate();
        
        if (this.clockInterval) clearInterval(this.clockInterval);
        this.clockInterval = setInterval(() => this.updateClock(), 60000);
    }

    updateClock() {
        const clockEl = document.getElementById('currentTime');
        if (clockEl) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', {
                hour12: true,
                hour: '2-digit',
                minute: '2-digit'
            });
            clockEl.textContent = timeString;
        }
    }
}