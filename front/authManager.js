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
                this.setupLogoutListener(); // FIX: Add logout listener
            });
        } else {
            this.setupRoleListeners();
            this.setupFormListeners();
            this.setupLogoutListener(); // FIX: Add logout listener
        }
    }

    // FIX: Add missing logout button event listener
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

        // FIX: Add file upload listeners  
        this.setupFileUploadListeners();

        // FIX: Add load students button listener
        const loadStudentsBtn = document.getElementById('loadStudentsBtn');
        if (loadStudentsBtn) {
            loadStudentsBtn.addEventListener('click', () => {
                window.loadClassroomForAttendance();
            });
        }

        // FIX: Add generate reports button listener
        const generateReportsBtn = document.getElementById('generateReportsBtn');
        if (generateReportsBtn) {
            generateReportsBtn.addEventListener('click', () => {
                window.generateReports();
            });
        }
    }

    // FIX: Add missing file upload event listeners
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

        // FIX: Better validation
        if (!email || !password) {
            this.showMessage('Please enter both email and password.', 'error');
            return;
        }

        // FIX: Email format validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            this.showMessage('Please enter a valid email address.', 'error');
            return;
        }

        this.setLoading(true);
        
        try {
            // FIX: Don't normalize email to lowercase - send as entered
            const loginData = {
                email: email, // Don't use toLowerCase()
                password: password
            };

            const response = await this.apiClient.call(
                'POST', 
                API_CONFIG.endpoints.auth.login,
                loginData,
                false // requiresAuth = false for login
            );
            
            // FIX: Better response validation
            if (response && response.access_token && response.user) {
                this.token = response.access_token;
                this.currentUser = response.user;
                this.storeAuth(response.user, response.access_token);
                this.showMessage('Login successful!', 'success');
                
                // FIX: Dispatch login event before showing dashboard
                window.dispatchEvent(new CustomEvent('userLoggedIn', { 
                    detail: { user: this.currentUser } 
                }));
                
                setTimeout(() => {
                    this.showDashboard();
                }, 500); // Reduced delay
            } else {
                throw new Error(response?.message || 'Invalid response from server');
            }
        } catch (error) {
            console.error('Login error:', error);
            // FIX: Better error handling for 422 responses
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
        // FIX: Ensure proper YYYY-MM-DD format
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

        // FIX: Better data sanitization and validation
        const sanitizedData = {};
        for (const [key, value] of Object.entries(teacherData)) {
            if (typeof value === 'string') {
                sanitizedData[key] = value.trim() || null;
            } else {
                sanitizedData[key] = value;
            }
        }

        // FIX: Handle checkbox properly
        sanitizedData.is_head_teacher = formData.has('is_head_teacher');

        const requiredFields = ['first_name', 'last_name', 'email', 'employee_number'];
        const missingFields = requiredFields.filter(field => !sanitizedData[field]);
        
        if (missingFields.length > 0) {
            this.showMessage(`Missing required fields: ${missingFields.join(', ')}`, 'error');
            return;
        }

        // FIX: Email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedData.email)) {
            this.showMessage('Please enter a valid email address.', 'error');
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

        // FIX: Validate classroom selection
        if (!classroomId || classroomId === '') {
            return { valid: false, message: 'Please select a classroom' };
        }

        // FIX: Validate classroom ID is numeric
        if (!/^\d+$/.test(classroomId)) {
            return { valid: false, message: 'Invalid classroom selection' };
        }

        // FIX: Validate date format
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

        // FIX: Sanitize data
        const sanitizedData = {};
        for (const [key, value] of Object.entries(classroomData)) {
            if (typeof value === 'string') {
                sanitizedData[key] = value.trim() || null;
            } else {
                sanitizedData[key] = value;
            }
        }

        // Convert capacity to number if provided
        if (sanitizedData.capacity) {
            sanitizedData.capacity = parseInt(sanitizedData.capacity);
        }

        const requiredFields = ['name', 'grade_level'];
        const missingFields = requiredFields.filter(field => !sanitizedData[field]);
        
        if (missingFields.length > 0) {
            this.showMessage(`Missing required fields: ${missingFields.join(', ')}`, 'error');
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

        // FIX: Sanitize data
        const sanitizedData = {};
        for (const [key, value] of Object.entries(subjectData)) {
            if (typeof value === 'string') {
                sanitizedData[key] = value.trim() || null;
            } else {
                sanitizedData[key] = value;
            }
        }

        // Convert coefficient to number if provided
        if (sanitizedData.coefficient) {
            sanitizedData.coefficient = parseFloat(sanitizedData.coefficient);
        }

        const requiredFields = ['name', 'code'];
        const missingFields = requiredFields.filter(field => !sanitizedData[field]);
        
        if (missingFields.length > 0) {
            this.showMessage(`Missing required fields: ${missingFields.join(', ')}`, 'error');
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

    // FIX: Improved logout function
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
        
        // FIX: Properly reset UI
        const authSection = document.getElementById('authSection');
        const dashboardSection = document.getElementById('dashboardSection');
        const loginForm = document.getElementById('loginForm');
        
        if (authSection) {
            authSection.style.display = 'flex'; // FIX: Use flex instead of block
        }
        if (dashboardSection) {
            dashboardSection.classList.remove('active');
        }
        if (loginForm) {
            loginForm.reset();
        }
        
        // FIX: Clear form inputs
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
        
        // FIX: Reset role selector
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
        this.setCurrentDate(); // FIX: Set current date on dashboard init
        
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