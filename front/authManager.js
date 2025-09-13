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
        // Attendre que le DOM soit complètement chargé
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupRoleListeners();
                this.setupFormListeners();
            });
        } else {
            this.setupRoleListeners();
            this.setupFormListeners();
        }
    }

    setupRoleListeners() {
        // Vérifier si les boutons existent
        const roleButtons = document.querySelectorAll('.role-btn');
        console.log('Role buttons found:', roleButtons.length);
        
        if (roleButtons.length === 0) {
            console.warn('No role buttons found. Will use event delegation.');
            
            // Utiliser la délégation d'événements si les boutons n'existent pas encore
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('role-btn')) {
                    this.handleRoleSelection(e.target);
                }
            });
        } else {
            // Les boutons existent, ajouter les listeners directement
            roleButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleRoleSelection(btn);
                });
            });
        }
    }

    handleRoleSelection(btn) {
        // Retirer la classe active de tous les boutons
        document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
        
        // Ajouter la classe active au bouton cliqué
        btn.classList.add('active');
        
        // Mettre à jour le rôle sélectionné
        this.selectedRole = btn.dataset.role;
        
        console.log('Role selected:', this.selectedRole);
        
        // Optionnel : déclencher un événement personnalisé
        window.dispatchEvent(new CustomEvent('roleChanged', { 
            detail: { role: this.selectedRole } 
        }));
    }

    setupFormListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Teacher form (admin only)
        const teacherForm = document.getElementById('teacherForm');
        if (teacherForm) {
            teacherForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateTeacher();
            });
        }

        // Classroom form (admin only)
        const classroomForm = document.getElementById('classroomForm');
        if (classroomForm) {
            classroomForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateClassroom();
            });
        }

        // Subject form (admin only)
        const subjectForm = document.getElementById('subjectForm');
        if (subjectForm) {
            subjectForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateSubject();
            });
        }
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

        this.setLoading(true);
        
        try {
            // Now properly using the structured endpoint config
            const response = await this.apiClient.call(
                'POST', 
                API_CONFIG.endpoints.auth.login, // This will extract the path from the config object
                {
                    email: email,
                    password: password
                }, 
                false // Override requiresAuth since login endpoint has requiresAuth: false
            );
            
            if (response.access_token && response.user) {
                this.token = response.access_token;
                this.currentUser = response.user;
                this.storeAuth(response.user, response.access_token);
                this.showMessage('Login successful!', 'success');
                
                setTimeout(() => {
                    this.showDashboard();
                }, 1000);
            } else {
                this.showMessage(response.message || 'Login failed - invalid response', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage(error.message || 'Login failed. Please check your credentials.', 'error');
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

        const requiredFields = ['first_name', 'last_name', 'email', 'employee_number'];
        const missingFields = requiredFields.filter(field => !teacherData[field]);
        
        if (missingFields.length > 0) {
            this.showMessage(`Missing required fields: ${missingFields.join(', ')}`, 'error');
            return;
        }

        try {
            // Using structured endpoint config - API client will handle role validation
            const response = await this.apiClient.call(
                'POST', 
                API_CONFIG.endpoints.admin.teachers.create, 
                teacherData
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
            this.showMessage(error.message || 'Failed to create teacher.', 'error');
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

        // Validate required fields
        const requiredFields = ['name', 'grade_level'];
        const missingFields = requiredFields.filter(field => !classroomData[field]);
        
        if (missingFields.length > 0) {
            this.showMessage(`Missing required fields: ${missingFields.join(', ')}`, 'error');
            return;
        }

        try {
            const response = await this.apiClient.call('POST', API_CONFIG.endpoints.admin.classrooms, classroomData);
            
            if (response && (response.message || response.id)) {
                this.showMessage('Classroom created successfully!', 'success');
                classroomForm.reset();
                
                // Dispatch event for dashboard to refresh classroom list
                window.dispatchEvent(new CustomEvent('classroomCreated', { detail: response }));
            } else {
                this.showMessage('Classroom creation failed - invalid response', 'error');
            }
        } catch (error) {
            console.error('Create classroom error:', error);
            this.showMessage(error.message || 'Failed to create classroom.', 'error');
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

        // Validate required fields
        const requiredFields = ['name', 'code'];
        const missingFields = requiredFields.filter(field => !subjectData[field]);
        
        if (missingFields.length > 0) {
            this.showMessage(`Missing required fields: ${missingFields.join(', ')}`, 'error');
            return;
        }

        try {
            const response = await this.apiClient.call('POST', API_CONFIG.endpoints.admin.subjects, subjectData);
            
            if (response && (response.message || response.id)) {
                this.showMessage('Subject created successfully!', 'success');
                subjectForm.reset();
                
                // Dispatch event for dashboard to refresh subject list
                window.dispatchEvent(new CustomEvent('subjectCreated', { detail: response }));
            } else {
                this.showMessage('Subject creation failed - invalid response', 'error');
            }
        } catch (error) {
            console.error('Create subject error:', error);
            this.showMessage(error.message || 'Failed to create subject.', 'error');
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
            // Fallback to console if message div not found
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
        
        if (authSection) authSection.style.display = 'flex';
        if (dashboardSection) dashboardSection.classList.remove('active');
        if (loginForm) loginForm.reset();
        
        this.showMessage('Logged out successfully', 'success');
        
        // Clear clock interval
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }

        // Dispatch logout event
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
    }

    initializeDashboard() {
        // Dispatch dashboard initialization event
        window.dispatchEvent(new CustomEvent('dashboardInitialized'));
        
        this.updateClock();
        
        // Update clock every minute for better performance
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