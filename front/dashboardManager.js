import { API_CONFIG } from './config.js';

// Enhanced Dashboard Manager with Full API Integration
export class DashboardManager {
    constructor() {
        this.authManager = null;
        this.loadingStates = new Set();
        this.attendanceChartInstance = null;
        this.eventListeners = new Map();
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
        });

        this.eventListeners.set('teacherCreated', () => {
            this.loadTeachersList();
        });

        this.eventListeners.set('classroomCreated', () => {
            this.loadClassrooms();
        });

        this.eventListeners.set('subjectCreated', () => {
            this.loadSubjects();
        });

        // Add event listeners
        this.eventListeners.forEach((handler, event) => {
            window.addEventListener(event, handler);
        });
    }

    setAuthManager(authManager) {
        this.authManager = authManager;
    }

    // Cleanup method to remove event listeners
    destroy() {
        this.eventListeners.forEach((handler, event) => {
            window.removeEventListener(event, handler);
        });
        this.eventListeners.clear();
        this.destroyCharts();
    }

    async loadDashboardData() {
        if (!this.authManager || !this.authManager.currentUser) {
            console.warn('No authenticated user found');
            return;
        }

        try {
            // Load dashboard statistics for admin
            if (this.authManager.currentUser.role === 'admin') {
                await this.loadAdminStats();
            }
            
            // Load teacher-specific data
            if (this.authManager.currentUser.role === 'teacher') {
                await this.loadTeacherData();
            }

            // Load common data
            await this.loadClassrooms();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showMessage('Failed to load dashboard data', 'error');
        }
    }

    async loadAdminStats() {
        this.setLoadingState('adminStats', true);
        
        try {
            // Validate API client
            if (!this.authManager?.apiClient) {
                throw new Error('API client not available');
            }

            const stats = await this.authManager.apiClient.get(API_CONFIG.endpoints.admin.stats);
            
            // Validate API response
            if (!stats || typeof stats !== 'object') {
                throw new Error('Invalid stats response from API');
            }
            
            this.updateStatElement('totalStudents', stats.total_students || 0);
            this.updateStatElement('totalTeachers', stats.total_teachers || 0);
            
            // Use actual attendance data from API if available
            const presentToday = stats.present_today || 0;
            this.updateStatElement('presentToday', presentToday);
            
            // Calculate attendance rate
            const attendanceRate = stats.total_students > 0 ? 
                Math.round((presentToday / stats.total_students) * 100) : 0;
            this.updateStatElement('attendanceRate', `${attendanceRate}%`);

        } catch (error) {
            console.error('Error loading admin stats:', error);
            // Set neutral values if API call fails
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
            // Validate API client
            if (!this.authManager?.apiClient) {
                throw new Error('API client not available');
            }

            // Load teacher assignments
            const assignments = await this.authManager.apiClient.get(API_CONFIG.endpoints.teachers.myAssignments);
            
            // Load teacher classrooms
            const classrooms = await this.authManager.apiClient.get(API_CONFIG.endpoints.teachers.myClassrooms);
            
            // Update UI with teacher-specific data
            this.updateTeacherStats(assignments, classrooms);

        } catch (error) {
            console.error('Error loading teacher data:', error);
            this.showMessage('Failed to load teacher data', 'error');
        } finally {
            this.setLoadingState('teacherData', false);
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

    updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    setLoadingState(key, isLoading) {
        if (isLoading) {
            this.loadingStates.add(key);
        } else {
            this.loadingStates.delete(key);
        }
        
        console.log('Loading states:', Array.from(this.loadingStates));
    }

    async loadTeachersList() {
        if (!this.authManager?.currentUser || this.authManager.currentUser.role !== 'admin') {
            console.warn('Access denied: Admin privileges required');
            return;
        }

        this.setLoadingState('teachersList', true);

        try {
            // Validate API client
            if (!this.authManager.apiClient) {
                throw new Error('API client not available');
            }

            const teachers = await this.authManager.apiClient.get(API_CONFIG.endpoints.admin.teachers);
            this.displayTeachersList(teachers);
        } catch (error) {
            console.error('Error loading teachers list:', error);
            this.showMessage('Failed to load teachers list', 'error');
        } finally {
            this.setLoadingState('teachersList', false);
        }
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
            teachersList.innerHTML = '<p>No teachers found.</p>';
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
            
            html += `
                <tr>
                    <td>${firstName} ${lastName}</td>
                    <td>${email}</td>
                    <td>${employeeNumber}</td>
                    <td>${specialization}</td>
                    <td><span class="status-badge ${isHeadTeacher ? 'head-teacher' : 'teacher'}">${isHeadTeacher ? 'Head Teacher' : 'Teacher'}</span></td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        teachersList.innerHTML = html;
    }

    async loadStudents(classroomId = null) {
        this.setLoadingState('students', true);
        
        try {
            // Validate API client
            if (!this.authManager?.apiClient) {
                throw new Error('API client not available');
            }

            let endpoint = API_CONFIG.endpoints.students.list;
            if (classroomId && classroomId !== 'all') {
                endpoint += `?classroom_id=${classroomId}`;
            }
            
            const students = await this.authManager.apiClient.get(endpoint);
            this.displayStudentsList(students);
            return Array.isArray(students) ? students : [];
            
        } catch (error) {
            console.error('Error loading students:', error);
            this.showMessage('Failed to load students', 'error');
            
            // Return empty array instead of placeholder data
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
            studentsList.innerHTML = '<p>No students found.</p>';
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
                        <button class="btn-small" onclick="viewStudentDetails(${student.id})">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        studentsList.innerHTML = html;
    }

    async loadClassrooms() {
        try {
            // Validate API client
            if (!this.authManager?.apiClient) {
                throw new Error('API client not available');
            }

            const classrooms = await this.authManager.apiClient.get(API_CONFIG.endpoints.admin.classrooms);
            this.populateClassroomSelects(classrooms);
            return Array.isArray(classrooms) ? classrooms : [];
        } catch (error) {
            console.error('Error loading classrooms:', error);
            // Return empty array instead of fallback data
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
        try {
            // Validate API client
            if (!this.authManager?.apiClient) {
                throw new Error('API client not available');
            }

            const subjects = await this.authManager.apiClient.get(API_CONFIG.endpoints.admin.subjects);
            return Array.isArray(subjects) ? subjects : [];
        } catch (error) {
            console.error('Error loading subjects:', error);
            return [];
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
            console.error('Chart.js is not loaded');
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
        } catch (error) {
            console.error('Error initializing chart:', error);
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

    // Unified message display method
    showMessage(message, type) {
        // Try to use global uiUtils if available
        if (window.uiUtils && typeof window.uiUtils.showMessage === 'function') {
            window.uiUtils.showMessage(message, type);
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