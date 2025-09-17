import { API_CONFIG, resolveEndpoint, hasPermission, getUserContext, ROLES } from './config.js';

// Enhanced Dashboard Manager with Full API Integration and Role-Based Access
export class DashboardManager {
    constructor() {
        this.authManager = null;
        this.loadingStates = new Set();
        this.attendanceChartInstance = null;
        this.eventListeners = new Map();
        this.userContext = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Store references to bound event handlers for cleanup
        this.eventListeners.set('dashboardInitialized', () => {
            this.loadDashboardData();
            this.initializeCharts();
            this.initializeCalendar();
        });

        this.eventListeners.set('userLoggedOut', () => {
            this.destroyCharts();
            this.userContext = null;
        });

        this.eventListeners.set('teacherCreated', () => {
            if (this.canAccessTeachers()) {
                this.loadTeachersList();
            }
        });

        this.eventListeners.set('classroomCreated', () => {
            this.loadClassrooms();
        });

        this.eventListeners.set('subjectCreated', () => {
            if (this.canAccessSubjects()) {
                this.loadSubjects();
            }
        });

        // Add event listeners
        this.eventListeners.forEach((handler, event) => {
            window.addEventListener(event, handler);
        });
    }

    setAuthManager(authManager) {
        this.authManager = authManager;
        this.updateUserContext();
    }

    updateUserContext() {
        if (this.authManager?.currentUser) {
            this.userContext = getUserContext(this.authManager.currentUser);
            console.log('User context updated:', this.userContext);
        }
    }

    // Role-based access control helpers
    canAccessTeachers() {
        return this.userContext?.role === ROLES.ADMIN;
    }

    canAccessSubjects() {
        return [ROLES.ADMIN, ROLES.TEACHER].includes(this.userContext?.role);
    }

    canAccessAllStudents() {
        return this.userContext?.role === ROLES.ADMIN;
    }

    canAccessClassroom(classroomId) {
        if (this.userContext?.canAccessAll) return true;
        
        const assignedClassrooms = this.userContext?.assignedClassrooms || [];
        const headOfClassrooms = this.userContext?.headOfClassrooms || [];
        
        return assignedClassrooms.includes(classroomId) || headOfClassrooms.includes(classroomId);
    }

    async loadDashboardData() {
        if (!this.authManager?.currentUser) {
            console.warn('No authenticated user found');
            return;
        }

        this.updateUserContext();

        try {
            // Load role-specific dashboard data
            if (this.userContext.role === ROLES.ADMIN) {
                await this.loadAdminDashboard();
            } else if (this.userContext.role === ROLES.TEACHER) {
                await this.loadTeacherDashboard();
            }

            // Load common data that both roles can access
            await this.loadClassrooms();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showMessage('Failed to load dashboard data: ' + error.message, 'error');
        }
    }

    async loadAdminDashboard() {
        this.setLoadingState('adminDashboard', true);
        
        try {
            // Load admin statistics
            await this.loadAdminStats();
            
            // Load teachers list for admin
            await this.loadTeachersList();
            
        } catch (error) {
            console.error('Error loading admin dashboard:', error);
            this.showMessage('Failed to load admin dashboard data', 'error');
        } finally {
            this.setLoadingState('adminDashboard', false);
        }
    }

    async loadTeacherDashboard() {
        this.setLoadingState('teacherDashboard', true);
        
        try {
            // Load teacher-specific data
            await this.loadTeacherData();
            
            // Load teacher's assigned students
            await this.loadTeacherStudents();
            
        } catch (error) {
            console.error('Error loading teacher dashboard:', error);
            this.showMessage('Failed to load teacher dashboard data', 'error');
        } finally {
            this.setLoadingState('teacherDashboard', false);
        }
    }



    async loadAdminStats() {
        this.setLoadingState('adminStats', true);
        
        try {
            if (!this.authManager?.apiClient) {
                throw new Error('API client not available');
            }

            const endpoint = API_CONFIG.endpoints.admin.dashboard.stats;
            const stats = await this.authManager.apiClient.get(endpoint);
           
            if (!stats || typeof stats !== 'object') {
                console.warn('Invalid stats response, using default values');
                throw new Error('Invalid stats response from API');
            }
            
            this.updateStatElement('totalStudents', stats.total_students || 0);
            this.updateStatElement('totalTeachers', stats.total_teachers || 0);
            
            const presentToday = stats.present_today || 0;
            this.updateStatElement('presentToday', presentToday);
            
            const attendanceRate = stats.total_students > 0 ? 
                Math.round((presentToday / stats.total_students) * 100) : 0;
            this.updateStatElement('attendanceRate', `${attendanceRate}%`);

            // Update admin-specific UI elements
            this.showAdminElements();

        } catch (error) {
            console.error('Error loading admin stats:', error);
            this.updateStatElement('totalStudents', 'N/A');
            this.updateStatElement('totalTeachers', 'N/A');
            this.updateStatElement('presentToday', 'N/A');
            this.updateStatElement('attendanceRate', 'N/A');
        } finally {
            this.setLoadingState('adminStats', false);
        }
    }

    async loadTeacherData() {
        this.setLoadingState('teacherData', true);
        
        try {
            if (!this.authManager?.apiClient) {
                throw new Error('API client not available');
            }

            // Load teacher's assignments and classrooms
            const [assignments, classrooms] = await Promise.all([
                this.authManager.apiClient.get(API_CONFIG.endpoints.teachers.myAssignments),
                this.authManager.apiClient.get(API_CONFIG.endpoints.teachers.myClassrooms)
            ]);
            
            this.updateTeacherStats(assignments, classrooms);
            this.showTeacherElements();

        } catch (error) {
            console.error('Error loading teacher data:', error);
            this.showMessage('Failed to load teacher data: ' + error.message, 'error');
        } finally {
            this.setLoadingState('teacherData', false);
        }
    }

    async loadTeacherStudents() {
        if (this.userContext?.role !== ROLES.TEACHER) return;

        try {
            const students = await this.authManager.apiClient.get(API_CONFIG.endpoints.teachers.myStudents);
            this.updateStatElement('myStudents', Array.isArray(students) ? students.length : 0);
        } catch (error) {
            console.error('Error loading teacher students:', error);
        }
    }

    async loadTeachersList() {
        if (!this.canAccessTeachers()) {
            console.warn('Access denied: Admin privileges required for teachers list');
            return;
        }

        this.setLoadingState('teachersList', true);

        try {
            if (!this.authManager.apiClient) {
                throw new Error('API client not available');
            }

            const endpoint = API_CONFIG.endpoints.admin.teachers.list;
            const teachers = await this.authManager.apiClient.get(endpoint);
            this.displayTeachersList(teachers);
        } catch (error) {
            console.error('Error loading teachers list:', error);
            this.showMessage('Failed to load teachers list: ' + error.message, 'error');
        } finally {
            this.setLoadingState('teachersList', false);
        }
    }

    updateTeacherStats(assignments, classrooms) {
        const totalAssignments = Array.isArray(assignments) ? assignments.length : 0;
        
        let totalClassrooms = 0;
        if (classrooms) {
            totalClassrooms += Array.isArray(classrooms.head_of_classrooms) ? classrooms.head_of_classrooms.length : 0;
            totalClassrooms += Array.isArray(classrooms.assigned_classrooms) ? classrooms.assigned_classrooms.length : 0;
        }
        
        // Update teacher-specific stats if elements exist
        this.updateStatElement('teacherAssignments', totalAssignments);
        this.updateStatElement('teacherClassrooms', totalClassrooms);
        
        console.log('Teacher stats updated:', { assignments: totalAssignments, classrooms: totalClassrooms });
    }

    showAdminElements() {
        // Show admin-only elements
        const adminElements = [
            'teachersLink',
            'classroomsManagement',
            'subjectsManagement',
            'adminDashboardSection'
        ];

        adminElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.remove('hidden');
                element.style.display = 'block';
            }
        });
    }

    showTeacherElements() {
        // Show teacher-specific elements
        const teacherElements = [
            'teacherDashboardSection',
            'myClassroomsSection',
            'myStudentsSection'
        ];

        teacherElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.remove('hidden');
                element.style.display = 'block';
            }
        });

        // Hide admin-only elements for teachers
        const adminOnlyElements = [
            'teachersManagement',
            'systemSettings'
        ];

        adminOnlyElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.add('hidden');
                element.style.display = 'none';
            }
        });
    }

    updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            // Animate the change
            element.style.transition = 'all 0.3s ease';
            element.textContent = value;
        } else {
            console.warn(`Element with ID '${elementId}' not found`);
        }
    }


    sanitizeFormData(formData) {
        const sanitized = {};
        
        for (const [key, value] of Object.entries(formData)) {
            if (typeof value === 'string') {
                // FIX: Trim whitespace and handle empty strings
                sanitized[key] = value.trim() || null;
            } else {
                sanitized[key] = value;
            }
    }
    
    return sanitized;
}

    // Sanitize HTML to prevent XSS
    sanitizeHTML(str) {
        if (typeof str !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    displayTeachersList(teachers) {
        const teachersList = document.getElementById('teachersList');
        if (!teachersList) {
            console.warn('Teachers list element not found');
            return;
        }
        
        if (!Array.isArray(teachers) || teachers.length === 0) {
            teachersList.innerHTML = '<p class="no-data">No teachers found.</p>';
            return;
        }
        
        let html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Employee ID</th>
                        <th>Specialization</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        teachers.forEach(teacher => {
            // Sanitize all data before inserting into HTML
            const firstName = this.sanitizeHTML(teacher.user?.first_name || 'N/A');
            const lastName = this.sanitizeHTML(teacher.user?.last_name || 'N/A');
            const email = this.sanitizeHTML(teacher.user?.email || 'N/A');
            const employeeNumber = this.sanitizeHTML(teacher.employee_number || 'N/A');
            const specialization = this.sanitizeHTML(teacher.specialization || 'N/A');
            const isHeadTeacher = teacher.is_head_teacher || false;
            const isAdmin = teacher.user?.role === 'admin';
            
            html += `
                <tr>
                    <td>${firstName} ${lastName}</td>
                    <td>${email}</td>
                    <td>${employeeNumber}</td>
                    <td>${specialization}</td>
                    <td>
                        <span class="status-badge ${isAdmin ? 'admin' : isHeadTeacher ? 'head-teacher' : 'teacher'}">
                            ${isAdmin ? 'Admin' : isHeadTeacher ? 'Head Teacher' : 'Teacher'}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-small btn-info" onclick="window.dashboardManager.viewTeacherDetails(${teacher.id})">
                                <i class="fas fa-eye"></i> View
                            </button>
                            ${!isAdmin ? `
                                <button class="btn-small btn-warning" onclick="window.dashboardManager.promoteToAdmin(${teacher.id}, '${firstName} ${lastName}')">
                                    <i class="fas fa-user-shield"></i> Make Admin
                                </button>
                            ` : ''}
                            <button class="btn-small btn-secondary" onclick="window.dashboardManager.editTeacher(${teacher.id})">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        teachersList.innerHTML = html;
    }

    async promoteToAdmin(teacherId, teacherName) {
        if (!this.canAccessTeachers()) {
            this.showMessage('Access denied: Admin privileges required', 'error');
            return;
        }

        const confirmed = confirm(`Are you sure you want to promote ${teacherName} to Admin? This will give them full system access.`);
        if (!confirmed) return;

        try {
            const endpointFunction = API_CONFIG.endpoints.admin.teachers.promoteToAdmin;
            const endpoint = resolveEndpoint(endpointFunction, teacherId);
            
            const result = await this.authManager.apiClient.patch(endpoint, {});
            
            this.showMessage(`${teacherName} has been promoted to Admin successfully!`, 'success');
            
            // Refresh the teachers list
            await this.loadTeachersList();
            
        } catch (error) {
            console.error('Error promoting teacher to admin:', error);
            this.showMessage('Failed to promote teacher: ' + error.message, 'error');
        }
    }

    async viewTeacherDetails(teacherId) {
        // This would show detailed teacher information in a modal
        this.showMessage(`Viewing details for teacher ID: ${teacherId}`, 'info');
        // Implementation would fetch and display teacher details
    }

    async editTeacher(teacherId) {
        // This would open an edit form for the teacher
        this.showMessage(`Editing teacher ID: ${teacherId}`, 'info');
        // Implementation would show edit form
    }

    async loadStudents(classroomId = null) {
        this.setLoadingState('students', true);
        
        try {
            if (!this.authManager?.apiClient) {
                throw new Error('API client not available');
            }

            let endpoint;
            let students = [];

            if (classroomId && classroomId !== 'all') {
                // Check if user can access this classroom
                if (!this.userContext?.canAccessAll && !this.canAccessClassroom(parseInt(classroomId))) {
                    throw new Error('Access denied: You can only view students from your assigned classrooms');
                }

                // Load students for specific classroom
                const endpointFunction = API_CONFIG.endpoints.students.classroomStudents;
                const endpointConfig = resolveEndpoint(endpointFunction, classroomId);
                students = await this.authManager.apiClient.get(endpointConfig);
            } else if (this.userContext?.canAccessAll) {
                // Admin can view all students
                endpoint = API_CONFIG.endpoints.students.list;
                students = await this.authManager.apiClient.get(endpoint);
            } else {
                // Teacher can only view their students
                endpoint = API_CONFIG.endpoints.teachers.myStudents;
                students = await this.authManager.apiClient.get(endpoint);
            }
            
            this.displayStudentsList(students);
            return Array.isArray(students) ? students : [];
            
        } catch (error) {
            console.error('Error loading students:', error);
            this.showMessage('Failed to load students: ' + error.message, 'error');
            this.displayStudentsList([]);
            return [];
            
        } finally {
            this.setLoadingState('students', false);
        }
    }

    displayStudentsList(students) {
        const studentsList = document.getElementById('studentsList');
        if (!studentsList) {
            console.warn('Students list element not found');
            return;
        }
        
        if (!Array.isArray(students) || students.length === 0) {
            studentsList.innerHTML = '<p class="no-data">No students found.</p>';
            return;
        }
        
        let html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Student ID</th>
                        <th>Name</th>
                        <th>Classroom</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        students.forEach(student => {
            // Sanitize all data before inserting into HTML
            const studentNumber = this.sanitizeHTML(student.student_number || 'N/A');
            const firstName = this.sanitizeHTML(student.user?.first_name || 'N/A');
            const lastName = this.sanitizeHTML(student.user?.last_name || 'N/A');
            const classroomName = this.sanitizeHTML(student.classroom?.name || 'N/A');
            
            html += `
                <tr>
                    <td>${studentNumber}</td>
                    <td>${firstName} ${lastName}</td>
                    <td>${classroomName}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-small btn-info" onclick="viewStudentDetails(${student.id})">
                                <i class="fas fa-eye"></i> View
                            </button>
                            ${this.userContext?.canAccessAll || this.canAccessClassroom(student.classroom?.id) ? `
                                <button class="btn-small btn-secondary" onclick="window.dashboardManager.editStudent(${student.id})">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                            ` : ''}
                            ${this.userContext?.canAccessAll ? `
                                <button class="btn-small btn-danger" onclick="window.dashboardManager.deleteStudent(${student.id}, '${firstName} ${lastName}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        studentsList.innerHTML = html;
    }

    async editStudent(studentId) {
        // Implementation for editing student
        this.showMessage(`Editing student ID: ${studentId}`, 'info');
        // Would open edit form
    }

    async deleteStudent(studentId, studentName) {
        if (!this.userContext?.canAccessAll) {
            this.showMessage('Access denied: Admin privileges required', 'error');
            return;
        }

        const confirmed = confirm(`Are you sure you want to delete student ${studentName}? This action cannot be undone.`);
        if (!confirmed) return;

        try {
            const endpointFunction = API_CONFIG.endpoints.students.delete;
            const endpoint = resolveEndpoint(endpointFunction, studentId);
            
            await this.authManager.apiClient.delete(endpoint);
            this.showMessage(`Student ${studentName} has been deleted successfully!`, 'success');
            
            // Refresh the students list
            await this.loadStudents();
            
        } catch (error) {
            console.error('Error deleting student:', error);
            this.showMessage('Failed to delete student: ' + error.message, 'error');
        }
    }

    async loadClassrooms() {
        try {
            if (!this.authManager?.apiClient) {
                throw new Error('API client not available');
            }

            const endpoint = API_CONFIG.endpoints.admin.classrooms.list;
            const classrooms = await this.authManager.apiClient.get(endpoint);
            
            // Filter classrooms based on user role
            let filteredClassrooms = classrooms;
            if (this.userContext?.role === ROLES.TEACHER && !this.userContext?.canAccessAll) {
                // Teachers only see their assigned classrooms
                const teacherClassroomIds = [
                    ...(this.userContext.assignedClassrooms || []),
                    ...(this.userContext.headOfClassrooms || [])
                ];
                
                filteredClassrooms = classrooms.filter(classroom => 
                    teacherClassroomIds.includes(classroom.id)
                );
            }
            
            this.populateClassroomSelects(filteredClassrooms);
            return Array.isArray(filteredClassrooms) ? filteredClassrooms : [];
        } catch (error) {
            console.error('Error loading classrooms:', error);
            this.showMessage('Failed to load classrooms: ' + error.message, 'error');
            this.populateClassroomSelects([]);
            return [];
        }
    }

    populateClassroomSelects(classrooms) {
        const selects = [
            'attendanceClassroom',
            'studentsClassroom', 
            'reportClassroom'
        ];

        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                // Clear existing options except the first one
                const firstOption = select.querySelector('option');
                select.innerHTML = '';
                if (firstOption) {
                    select.appendChild(firstOption);
                }

                // Add classroom options
                if (Array.isArray(classrooms)) {
                    classrooms.forEach(classroom => {
                        const option = document.createElement('option');
                        option.value = classroom.id;
                        option.textContent = this.sanitizeHTML(classroom.name);
                        select.appendChild(option);
                    });
                }
            }
        });
    }

    async loadSubjects() {
        if (!this.canAccessSubjects()) {
            console.warn('Access denied: Teacher or Admin privileges required');
            return [];
        }

        try {
            if (!this.authManager?.apiClient) {
                throw new Error('API client not available');
            }

            const endpoint = API_CONFIG.endpoints.admin.subjects.list;
            const subjects = await this.authManager.apiClient.get(endpoint);
            return Array.isArray(subjects) ? subjects : [];
        } catch (error) {
            console.error('Error loading subjects:', error);
            this.showMessage('Failed to load subjects: ' + error.message, 'error');
            return [];
        }
    }

    setLoadingState(key, isLoading) {
        if (isLoading) {
            this.loadingStates.add(key);
        } else {
            this.loadingStates.delete(key);
        }
        
        // Update UI loading indicators
        this.updateLoadingUI(key, isLoading);
        
        console.log('Loading states:', Array.from(this.loadingStates));
    }

    updateLoadingUI(key, isLoading) {
        const loadingElements = {
            'adminStats': 'adminStatsLoading',
            'teacherData': 'teacherDataLoading',
            'students': 'studentsLoading',
            'teachersList': 'teachersListLoading'
        };

        const loadingElementId = loadingElements[key];
        if (loadingElementId) {
            const loadingElement = document.getElementById(loadingElementId);
            if (loadingElement) {
                loadingElement.style.display = isLoading ? 'block' : 'none';
            }
        }

        // Generic loading for content areas
        const contentElements = {
            'students': 'studentsList',
            'teachersList': 'teachersList'
        };

        const contentElementId = contentElements[key];
        if (contentElementId) {
            const contentElement = document.getElementById(contentElementId);
            if (contentElement && isLoading) {
                contentElement.innerHTML = '<div class="loading-spinner">Loading...</div>';
            }
        }
    }

    destroyCharts() {
        if (this.attendanceChartInstance) {
            this.attendanceChartInstance.destroy();
            this.attendanceChartInstance = null;
        }
    }

    initializeCharts() {
        const chartCanvas = document.getElementById('attendanceChart');
        if (!chartCanvas) {
            console.warn('Attendance chart canvas not found');
            return;
        }

        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded. Please include Chart.js library.');
            const chartContainer = chartCanvas.parentElement;
            if (chartContainer) {
                chartContainer.innerHTML = '<p style="text-align: center; color: #666;">Chart library not loaded. Please refresh the page.</p>';
            }
            return;
        }

        const ctx = chartCanvas.getContext('2d');
        
        // Destroy existing chart if it exists
        this.destroyCharts();
        
        try {
            this.attendanceChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
                    datasets: [{
                        label: 'Attendance Rate',
                        data: [85, 88, 82, 90, 87, 92],
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
                            beginAtZero: false,
                            min: 70,
                            max: 100,
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { 
                                color: '#94a3b8',
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        },
                        x: {
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { color: '#94a3b8' }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: { color: '#f8fafc' }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Attendance: ${context.parsed.y}%`;
                                }
                            }
                        }
                    }
                }
            });

            console.log('Attendance chart initialized successfully');

        } catch (error) {
            console.error('Error initializing chart:', error);
            const chartContainer = chartCanvas.parentElement;
            if (chartContainer) {
                chartContainer.innerHTML = '<p style="text-align: center; color: #dc2626;">Failed to load chart. Please refresh the page.</p>';
            }
        }
    }

    initializeCalendar() {
        const calendarEl = document.getElementById('calendar');
        const monthYearEl = document.getElementById('currentMonthYear');
        
        if (!calendarEl || !monthYearEl) {
            console.warn('Calendar elements not found');
            return;
        }

        const now = new Date();
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        
        monthYearEl.textContent = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
        
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        // Get first day of month and number of days
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const highlightedDates = [2, 19, 25, 30];
        
        let calendarHTML = '<div class="calendar-grid">';
        
        // Add day headers
        days.forEach(day => {
            calendarHTML += `<div class="calendar-day calendar-header">${day}</div>`;
        });
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            calendarHTML += `<div class="calendar-day calendar-date empty"></div>`;
        }
        
        // Add days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            const isToday = i === now.getDate();
            const isHighlighted = highlightedDates.includes(i);
            
            calendarHTML += `<div class="calendar-day calendar-date ${isToday ? 'today' : ''} ${isHighlighted ? 'highlighted' : ''}">${i}</div>`;
        }
        
        calendarHTML += '</div>';
        calendarEl.innerHTML = calendarHTML;
    }

    // Cleanup method to remove event listeners
    destroy() {
        // Remove event listeners
        this.eventListeners.forEach((handler, event) => {
            window.removeEventListener(event, handler);
        });
        this.eventListeners.clear();
        
        // Destroy charts
        this.destroyCharts();
        
        // Clear loading states
        this.loadingStates.clear();
        
        // Clear user context
        this.userContext = null;
        
        console.log('Dashboard manager destroyed');
    }

    // Unified message display method
    showMessage(message, type) {
        // Try to use global uiUtils if available
        if (window.uiUtils && typeof window.uiUtils.showMessage === 'function') {
            window.uiUtils.showMessage(message, type);
        } else if (this.authManager && typeof this.authManager.showMessage === 'function') {
            this.authManager.showMessage(message, type);
        } else {
            // Fallback to console logging
            console[type === 'error' ? 'error' : 'log'](`${type}: ${message}`);
            
            // Basic UI notification fallback
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 15px;
                border-radius: 4px;
                color: white;
                z-index: 10000;
                font-family: sans-serif;
            `;
            
            if (type === 'error') {
                notification.style.backgroundColor = '#dc2626';
            } else {
                notification.style.backgroundColor = '#059669';
            }
            
            notification.textContent = message;
            document.body.appendChild(notification);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 5000);
        }
    }
}