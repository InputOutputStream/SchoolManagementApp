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

        this.setupFileUploadListeners();

        const loadStudentsBtn = document.getElementById('loadStudentsBtn');
        if (loadStudentsBtn) {
            loadStudentsBtn.addEventListener('click', () => {
                window.loadClassroomForAttendance();
            });
        }

        const generateReportsBtn = document.getElementById('generateReportsBtn');
        if (generateReportsBtn) {
            generateReportsBtn.addEventListener('click', () => {
                window.generateReports();
            });
        }
    }

    setupFileUploadListeners() {
        // Students file upload
        const studentsFileInput = document.getElementById('studentsFileInput');
        if (studentsFileInput) {
            studentsFileInput.addEventListener('change', (e) => {
                window.handleFileImport(e, 'students');
            });
        }

        // Teachers file upload
        const teachersFileInput = document.getElementById('teachersFileInput');
        if (teachersFileInput) {
            teachersFileInput.addEventListener('change', (e) => {
                window.handleFileImport(e, 'teachers');
            });
        }

        // Classrooms file upload
        const classroomsFileInput = document.getElementById('classroomsFileInput');
        if (classroomsFileInput) {
            classroomsFileInput.addEventListener('change', (e) => {
                window.handleFileImport(e, 'classrooms');
            });
        }

        // Subjects file upload
        const subjectsFileInput = document.getElementById('subjectsFileInput');
        if (subjectsFileInput) {
            subjectsFileInput.addEventListener('change', (e) => {
                window.handleFileImport(e, 'subjects');
            });
        }

        // Download template buttons
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

        // FIX: Properly format data to match backend schema
        const sanitizedData = {
            // User data (will be handled by backend to create user first)
            first_name: teacherData.first_name?.toString().trim() || null,
            last_name: teacherData.last_name?.toString().trim() || null,
            email: teacherData.email?.toString().trim() || null,
            
            // Teacher-specific data
            employee_number: teacherData.employee_number?.toString().trim() || null,
            specialization: teacherData.specialization?.toString().trim() || null,
            phone_number: teacherData.phone_number?.toString().trim() || null, // Keep as phone_number for API
            
            // FIX: Ensure boolean conversion
            is_head_teacher: Boolean(formData.has('is_head_teacher')),
            
            // FIX: Add password if provided
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

        // FIX: Validate employee_number length (backend expects max 20 chars)
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

    validateClassroomSelection() {
        const classroomSelect = document.getElementById('attendanceClassroom');
        const dateInput = document.getElementById('attendanceDate');
        
        if (!classroomSelect || !dateInput) {
            return { valid: false, message: 'Required form elements not found' };
        }

        const classroomId = classroomSelect.value;
        const date = dateInput.value;

        if (!classroomId || classroomId === '') {
            return { valid: false, message: 'Please select a classroom' };
        }

        if (!/^\d+$/.test(classroomId)) {
            return { valid: false, message: 'Invalid classroom selection' };
        }

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return { valid: false, message: 'Please select a valid date' };
        }

        return { valid: true, classroomId: parseInt(classroomId), date };
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

        // FIX: Map frontend fields to backend schema
        const sanitizedData = {
            name: classroomData.name?.toString().trim() || null,
            level: classroomData.grade_level?.toString().trim() || null, // FIX: grade_level -> level
            description: classroomData.description?.toString().trim() || null,
            max_students: classroomData.capacity ? parseInt(classroomData.capacity) : null, // FIX: capacity -> max_students
            head_teacher_email: classroomData.head_teacher_email?.toString().trim() || null,
            academic_year: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1) // FIX: Add required academic_year
        };

        const requiredFields = ['name', 'level'];
        const missingFields = requiredFields.filter(field => !sanitizedData[field]);
        
        if (missingFields.length > 0) {
            this.showMessage(`Missing required fields: ${missingFields.join(', ')}`, 'error');
            return;
        }

        // FIX: Validate field lengths according to backend schema
        if (sanitizedData.name.length > 50) {
            this.showMessage('Classroom name must be 50 characters or less.', 'error');
            return;
        }

        if (sanitizedData.level.length > 50) {
            this.showMessage('Grade level must be 50 characters or less.', 'error');
            return;
        }

        // FIX: Validate max_students is positive integer
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
            // FIX: Backend expects Integer for coefficient, not Float
            coefficient: subjectData.coefficient ? parseInt(subjectData.coefficient) : 1
        };

        const requiredFields = ['name', 'code'];
        const missingFields = requiredFields.filter(field => !sanitizedData[field]);
        
        if (missingFields.length > 0) {
            this.showMessage(`Missing required fields: ${missingFields.join(', ')}`, 'error');
            return;
        }

        // FIX: Validate field lengths according to backend schema
        if (sanitizedData.name.length > 100) {
            this.showMessage('Subject name must be 100 characters or less.', 'error');
            return;
        }

        if (sanitizedData.code.length > 20) {
            this.showMessage('Subject code must be 20 characters or less.', 'error');
            return;
        }

        // FIX: Validate coefficient is positive integer
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
                const teachersLink = document.getElementById('teachersLink');
                const classroomsManagement = document.getElementById('classroomsManagement');
                const subjectsManagement = document.getElementById('subjectsManagement');
                
                if (teachersLink) teachersLink.classList.remove('hidden');
                if (classroomsManagement) classroomsManagement.style.display = 'block';
                if (subjectsManagement) subjectsManagement.style.display = 'block';
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
        
        // Clear user data
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
        
        // Clear clock interval
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }

        // Dispatch logout event
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