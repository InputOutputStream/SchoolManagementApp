// API Configuration
const API_CONFIG = {
    baseUrl: 'http://localhost:5000/api',
    endpoints: {
        auth: {
            login: '/auth/login',
            profile: '/auth/profile'
        },
        admin: {
            teachers: '/admin/teachers',
            classrooms: '/admin/classrooms',
            subjects: '/admin/subjects',
            assignments: '/admin/assignments',
            auditLogs: '/admin/audit-logs',
            stats: '/admin/dashboard/stats'
        },
        teachers: {
            myAssignments: '/teachers/my-assignments',
            myClassrooms: '/teachers/my-classrooms'
        },
        students: {
            register: '/students/register',
            classroom: '/students/classroom',
            update: '/students'
        },
        grades: {
            add: '/grades',
            update: '/grades',
            classroom: '/grades/classroom'
        },
        reports: {
            generate: '/reports/generate',
            classroom: '/reports/classroom'
        }
    }
};

// Authentication System
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.selectedRole = 'teacher';
        this.token = null;
        this.initializeAuth();
    }

    initializeAuth() {
        // Check if user is already logged in
        const savedData = this.getStoredAuth();
        if (savedData) {
            this.currentUser = savedData.user;
            this.token = savedData.token;
            this.showDashboard();
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Role selection
        document.querySelectorAll('.role-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedRole = btn.dataset.role;
            });
        });

        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Teacher form (admin only)
        document.getElementById('teacherForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateTeacher();
        });
    }

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        this.setLoading(true);
        
        try {
            const response = await this.apiCall('POST', API_CONFIG.endpoints.auth.login, {
                email: email,
                password: password
            });
            
            if (response.access_token) {
                this.token = response.access_token;
                this.currentUser = response.user;
                this.storeAuth(response.user, response.access_token);
                this.showMessage('Login successful!', 'success');
                
                setTimeout(() => {
                    this.showDashboard();
                }, 1000);
            } else {
                this.showMessage(response.message || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('Login failed. Please check your credentials.', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async handleCreateTeacher() {
        if (this.currentUser?.role !== 'admin') {
            this.showMessage('Access denied. Admin only.', 'error');
            return;
        }

        const formData = new FormData(document.getElementById('teacherForm'));
        const teacherData = Object.fromEntries(formData.entries());

        try {
            const response = await this.apiCall('POST', API_CONFIG.endpoints.admin.teachers, teacherData);
            
            if (response.message) {
                this.showMessage('Teacher created successfully!', 'success');
                document.getElementById('teacherForm').reset();
                // Refresh teacher list if visible
                if (window.dashboardManager) {
                    window.dashboardManager.loadTeachersList();
                }
            }
        } catch (error) {
            console.error('Create teacher error:', error);
            this.showMessage(error.message || 'Failed to create teacher.', 'error');
        }
    }

    async apiCall(method, endpoint, data = null, requiresAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (requiresAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            method: method,
            headers: headers,
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, config);
        
        if (response.status === 401) {
            this.logout();
            throw new Error('Session expired. Please login again.');
        }

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }
        
        return result;
    }

    showDashboard() {
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('dashboardSection').classList.add('active');
        
        this.updateDashboardUI();
        this.initializeDashboard();
    }

    updateDashboardUI() {
        if (this.currentUser) {
            const initials = (this.currentUser.first_name[0] + this.currentUser.last_name[0]).toUpperCase();
            document.getElementById('userInitials').textContent = initials;
            
            // Show admin-only features
            if (this.currentUser.role === 'admin') {
                document.getElementById('teachersLink').classList.remove('hidden');
            }
        }
    }

    setLoading(isLoading) {
        const loginText = document.getElementById('loginText');
        const loginLoading = document.getElementById('loginLoading');
        const submitBtn = document.querySelector('#loginForm button[type="submit"]');

        if (isLoading) {
            loginText.classList.add('hidden');
            loginLoading.classList.remove('hidden');
            submitBtn.disabled = true;
        } else {
            loginText.classList.remove('hidden');
            loginLoading.classList.add('hidden');
            submitBtn.disabled = false;
        }
    }

    showMessage(message, type) {
        const messageDiv = document.getElementById('authMessage');
        messageDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
        
        setTimeout(() => {
            messageDiv.innerHTML = '';
        }, 5000);
    }

    storeAuth(user, token) {
        const authData = { user: user, token: token };
        localStorage.setItem('school_auth', JSON.stringify(authData));
    }

    getStoredAuth() {
        const stored = localStorage.getItem('school_auth');
        return stored ? JSON.parse(stored) : null;
    }

    logout() {
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('school_auth');
        document.getElementById('authSection').style.display = 'flex';
        document.getElementById('dashboardSection').classList.remove('active');
        document.getElementById('loginForm').reset();
        this.showMessage('Logged out successfully', 'success');
    }

    initializeDashboard() {
        if (window.dashboardManager) {
            window.dashboardManager.loadDashboardData();
        }
        this.initializeCharts();
        this.initializeCalendar();
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
    }

    initializeCharts() {
        const ctx = document.getElementById('attendanceChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
                datasets: [{
                    label: 'Attendance',
                    data: [300, 350, 400, 380, 370, 485],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { 
                        beginAtZero: true, 
                        max: 600,
                        grid: { color: '#334155' },
                        ticks: { color: '#94a3b8' }
                    },
                    x: {
                        grid: { color: '#334155' },
                        ticks: { color: '#94a3b8' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#f8fafc' }
                    }
                }
            }
        });
    }

    initializeCalendar() {
        const calendar = document.getElementById('calendar');
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dates = Array.from({length: 30}, (_, i) => i + 1);
        const highlightedDates = [2, 19, 25, 30];
        
        let calendarHTML = '<div class="calendar-grid">';
        
        days.forEach(day => {
            calendarHTML += `<div class="calendar-day calendar-header">${day}</div>`;
        });
        
        dates.forEach(date => {
            const isHighlighted = highlightedDates.includes(date);
            calendarHTML += `<div class="calendar-day calendar-date ${isHighlighted ? 'highlighted' : ''}">${date}</div>`;
        });
        
        calendarHTML += '</div>';
        calendar.innerHTML = calendarHTML;
    }

    updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour12: true,
            hour: '2-digit',
            minute: '2-digit'
        });
        document.getElementById('currentTime').textContent = timeString;
    }
}

// Enhanced Dashboard Manager with Full API Integration
class DashboardManager {
    constructor() {
        this.authManager = null;
    }

    setAuthManager(authManager) {
        this.authManager = authManager;
    }

    async loadDashboardData() {
        try {
            // Load dashboard statistics for admin
            if (this.authManager.currentUser?.role === 'admin') {
                await this.loadAdminStats();
            }
            
            // Load teacher-specific data
            if (this.authManager.currentUser?.role === 'teacher') {
                await this.loadTeacherData();
            }

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    async loadAdminStats() {
        try {
            const stats = await this.authManager.apiCall('GET', API_CONFIG.endpoints.admin.stats);
            
            document.getElementById('totalStudents').textContent = stats.total_students || '0';
            document.getElementById('totalTeachers').textContent = stats.total_teachers || '0';
            document.getElementById('presentToday').textContent = stats.total_students || '0'; // Placeholder
            
            // Calculate attendance rate (placeholder logic)
            const attendanceRate = stats.total_students > 0 ? 
                Math.round((parseInt(document.getElementById('presentToday').textContent) / stats.total_students) * 100) : 0;
            document.getElementById('attendanceRate').textContent = `${attendanceRate}%`;

        } catch (error) {
            console.error('Error loading admin stats:', error);
        }
    }

    async loadTeacherData() {
        try {
            // Load teacher assignments
            const assignments = await this.authManager.apiCall('GET', API_CONFIG.endpoints.teachers.myAssignments);
            
            // Load teacher classrooms
            const classrooms = await this.authManager.apiCall('GET', API_CONFIG.endpoints.teachers.myClassrooms);
            
            // Update UI with teacher-specific data
            this.updateTeacherStats(assignments, classrooms);

        } catch (error) {
            console.error('Error loading teacher data:', error);
        }
    }

    updateTeacherStats(assignments, classrooms) {
        // Update stats based on teacher's assignments and classrooms
        const totalAssignments = assignments ? assignments.length : 0;
        const totalClassrooms = classrooms ? 
            (classrooms.head_of_classrooms?.length || 0) + (classrooms.assigned_classrooms?.length || 0) : 0;
        
        // You can update specific elements or create new ones for teacher stats
        console.log('Teacher assignments:', totalAssignments);
        console.log('Teacher classrooms:', totalClassrooms);
    }

    async loadTeachersList() {
        if (this.authManager.currentUser?.role !== 'admin') return;

        try {
            const teachers = await this.authManager.apiCall('GET', API_CONFIG.endpoints.admin.teachers);
            this.displayTeachersList(teachers);
        } catch (error) {
            console.error('Error loading teachers list:', error);
        }
    }

    displayTeachersList(teachers) {
        // This would be used to populate a teachers list in the UI
        console.log('Teachers loaded:', teachers);
    }

    async loadStudents(classroomId = null) {
        try {
            let endpoint = API_CONFIG.endpoints.students.classroom;
            if (classroomId) {
                endpoint += `/${classroomId}`;
            }
            
            const students = await this.authManager.apiCall('GET', endpoint);
            this.displayStudentsList(students);
            return students;
        } catch (error) {
            console.error('Error loading students:', error);
            return [];
        }
    }

    displayStudentsList(students) {
        // Implement students list display logic
        console.log('Students loaded:', students);
    }

    async addGrade(gradeData) {
        try {
            const result = await this.authManager.apiCall('POST', API_CONFIG.endpoints.grades.add, gradeData);
            this.authManager.showMessage('Grade added successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error adding grade:', error);
            this.authManager.showMessage('Failed to add grade: ' + error.message, 'error');
            throw error;
        }
    }

    async updateGrade(gradeId, gradeData) {
        try {
            const result = await this.authManager.apiCall('PUT', `${API_CONFIG.endpoints.grades.update}/${gradeId}`, gradeData);
            this.authManager.showMessage('Grade updated successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error updating grade:', error);
            this.authManager.showMessage('Failed to update grade: ' + error.message, 'error');
            throw error;
        }
    }

    async loadClassroomGrades(classroomId, periodId) {
        try {
            const grades = await this.authManager.apiCall('GET', 
                `${API_CONFIG.endpoints.grades.classroom}/${classroomId}/period/${periodId}`);
            return grades;
        } catch (error) {
            console.error('Error loading classroom grades:', error);
            return [];
        }
    }

    async generateReportCard(studentId, periodId, comments = null) {
        try {
            const result = await this.authManager.apiCall('POST', 
                `${API_CONFIG.endpoints.reports.generate}/${studentId}/${periodId}`,
                { teacher_comments: comments });
            
            this.authManager.showMessage('Report card generated successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error generating report card:', error);
            this.authManager.showMessage('Failed to generate report card: ' + error.message, 'error');
            throw error;
        }
    }

    async loadClassroomReports(classroomId, periodId) {
        try {
            const reports = await this.authManager.apiCall('GET', 
                `${API_CONFIG.endpoints.reports.classroom}/${classroomId}/period/${periodId}`);
            return reports;
        } catch (error) {
            console.error('Error loading classroom reports:', error);
            return [];
        }
    }

    // Admin-specific methods
    async createClassroom(classroomData) {
        if (this.authManager.currentUser?.role !== 'admin') {
            throw new Error('Access denied. Admin only.');
        }

        try {
            const result = await this.authManager.apiCall('POST', API_CONFIG.endpoints.admin.classrooms, classroomData);
            this.authManager.showMessage('Classroom created successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error creating classroom:', error);
            this.authManager.showMessage('Failed to create classroom: ' + error.message, 'error');
            throw error;
        }
    }

    async createSubject(subjectData) {
        if (this.authManager.currentUser?.role !== 'admin') {
            throw new Error('Access denied. Admin only.');
        }

        try {
            const result = await this.authManager.apiCall('POST', API_CONFIG.endpoints.admin.subjects, subjectData);
            this.authManager.showMessage('Subject created successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error creating subject:', error);
            this.authManager.showMessage('Failed to create subject: ' + error.message, 'error');
            throw error;
        }
    }

    async createAssignment(assignmentData) {
        if (this.authManager.currentUser?.role !== 'admin') {
            throw new Error('Access denied. Admin only.');
        }

        try {
            const result = await this.authManager.apiCall('POST', API_CONFIG.endpoints.admin.assignments, assignmentData);
            this.authManager.showMessage('Assignment created successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error creating assignment:', error);
            this.authManager.showMessage('Failed to create assignment: ' + error.message, 'error');
            throw error;
        }
    }

    async loadAuditLogs(page = 1, perPage = 50) {
        if (this.authManager.currentUser?.role !== 'admin') return [];

        try {
            const logs = await this.authManager.apiCall('GET', 
                `${API_CONFIG.endpoints.admin.auditLogs}?page=${page}&per_page=${perPage}`);
            return logs;
        } catch (error) {
            console.error('Error loading audit logs:', error);
            return {};
        }
    }
}

// Student Management Class
class StudentManager {
    constructor(authManager) {
        this.authManager = authManager;
    }

    async registerStudent(studentData) {
        try {
            const result = await this.authManager.apiCall('POST', 
                API_CONFIG.endpoints.students.register, studentData, false);
            this.authManager.showMessage('Student registered successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error registering student:', error);
            this.authManager.showMessage('Failed to register student: ' + error.message, 'error');
            throw error;
        }
    }

    async updateStudent(studentId, studentData) {
        try {
            const result = await this.authManager.apiCall('PUT', 
                `${API_CONFIG.endpoints.students.update}/${studentId}`, studentData);
            this.authManager.showMessage('Student updated successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error updating student:', error);
            this.authManager.showMessage('Failed to update student: ' + error.message, 'error');
            throw error;
        }
    }
}

// Enhanced UI Functions
function showSection(sectionName) {
    // Hide all content sections
    const contents = ['dashboardContent', 'attendanceContent', 'studentsContent', 'reportsContent', 'teachersContent', 'settingsContent'];
    contents.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.classList.add('hidden');
    });

    // Show selected section
    const targetContent = document.getElementById(sectionName + 'Content');
    if (targetContent) {
        targetContent.classList.remove('hidden');
        
        // Load section-specific data
        if (window.dashboardManager) {
            switch(sectionName) {
                case 'students':
                    window.dashboardManager.loadStudents();
                    break;
                case 'teachers':
                    if (window.authManager.currentUser?.role === 'admin') {
                        window.dashboardManager.loadTeachersList();
                    }
                    break;
            }
        }
    }

    // Update sidebar active state
    document.querySelectorAll('.sidebar a').forEach(link => {
        link.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

// Search functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length > 2 && window.dashboardManager) {
            try {
                // Search students by ID or name
                const students = await window.dashboardManager.loadStudents();
                const filteredStudents = students.filter(student => 
                    student.student_number?.toLowerCase().includes(query) ||
                    student.user?.first_name?.toLowerCase().includes(query) ||
                    student.user?.last_name?.toLowerCase().includes(query)
                );
                
                // Display filtered results
                window.dashboardManager.displayStudentsList(filteredStudents);
            } catch (error) {
                console.error('Search error:', error);
            }
        }
    });
}

// Logout function
function logout() {
    if (window.authManager) {
        window.authManager.logout();
    }
}

// Utility functions for form handling
function createGradeForm(studentId, subjects, evaluationPeriods) {
    return `
        <form id="gradeForm" onsubmit="handleGradeSubmission(event)">
            <input type="hidden" name="student_id" value="${studentId}">
            
            <div class="form-group">
                <label for="subject_id">Subject:</label>
                <select name="subject_id" required>
                    ${subjects.map(subject => 
                        `<option value="${subject.id}">${subject.name}</option>`
                    ).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label for="evaluation_period_id">Evaluation Period:</label>
                <select name="evaluation_period_id" required>
                    ${evaluationPeriods.map(period => 
                        `<option value="${period.id}">${period.name}</option>`
                    ).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label for="grade">Grade:</label>
                <input type="number" name="grade" min="0" max="20" step="0.01" required>
            </div>
            
            <div class="form-group">
                <label for="evaluation_type">Evaluation Type:</label>
                <input type="text" name="evaluation_type" placeholder="e.g., Quiz, Test, Assignment">
            </div>
            
            <div class="form-group">
                <label for="evaluation_name">Evaluation Name:</label>
                <input type="text" name="evaluation_name" placeholder="e.g., Math Quiz 1">
            </div>
            
            <div class="form-group">
                <label for="evaluation_date">Evaluation Date:</label>
                <input type="date" name="evaluation_date">
            </div>
            
            <div class="form-group">
                <label for="comments">Comments:</label>
                <textarea name="comments" rows="3" placeholder="Optional comments"></textarea>
            </div>
            
            <button type="submit" class="btn">Add Grade</button>
        </form>
    `;
}

async function handleGradeSubmission(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const gradeData = Object.fromEntries(formData.entries());
    
    try {
        await window.dashboardManager.addGrade(gradeData);
        event.target.reset();
    } catch (error) {
        console.error('Grade submission error:', error);
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize authentication system
    window.authManager = new AuthManager();
    
    // Initialize dashboard manager
    window.dashboardManager = new DashboardManager();
    window.dashboardManager.setAuthManager(window.authManager);
    
    // Initialize student manager
    window.studentManager = new StudentManager(window.authManager);
    
    // Initialize search
    initializeSearch();

    // Add interactive features
    addInteractiveFeatures();
});

function addInteractiveFeatures() {
    // Add click animations to cards
    document.querySelectorAll('.stat-card').forEach(card => {
        card.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'translateY(-5px)';
            }, 150);
        });
    });

    // Add notice item interactions
    document.querySelectorAll('.notice-item').forEach(item => {
        item.addEventListener('click', function() {
            const notice = this.textContent.trim();
            alert(`Notice Details:\n${notice}`);
        });
    });
}