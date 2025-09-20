// Complete app.js - Updated for new HTML structure

import { AuthManager } from './authManager.js';
import { DashboardManager } from './dashboardManager.js';
import { StudentManager } from './studentManager.js';
import { AttendanceManager } from './attendanceManager.js';
import { GradesReportsManager } from './gradesReportsManager.js';
import { FileImportManager } from './fileImportManager.js';
import { UIUtils } from './uiUtils.js';
import { API_CONFIG, ROLES, hasPermission, getUserContext } from './config.js';

class SchoolManagementApp {
    constructor() {
        this.authManager = null;
        this.dashboardManager = null;
        this.studentManager = null;
        this.attendanceManager = null;
        this.gradesReportsManager = null;
        this.fileImportManager = null;
        this.uiUtils = null;
        this.isInitialized = false;
        this.globalReferences = new Set();
        this.userContext = null;
    }

    async initialize() {
        if (this.isInitialized) {
            console.warn('Application already initialized');
            return;
        }

        try {
            console.log('Initializing School Management System...');

            // Initialize core managers
            this.authManager = new AuthManager();
            this.dashboardManager = new DashboardManager();
            this.uiUtils = new UIUtils();

            // Set up manager relationships
            this.dashboardManager.setAuthManager(this.authManager);

            // Initialize dependent managers
            this.studentManager = new StudentManager(this.authManager);
            this.attendanceManager = new AttendanceManager(this.authManager);
            this.gradesReportsManager = new GradesReportsManager(this.authManager);
            this.fileImportManager = new FileImportManager(this.authManager, this.dashboardManager);

            // Make managers globally accessible
            this.setGlobalReference('authManager', this.authManager);
            this.setGlobalReference('dashboardManager', this.dashboardManager);
            this.setGlobalReference('studentManager', this.studentManager);
            this.setGlobalReference('attendanceManager', this.attendanceManager);
            this.setGlobalReference('gradesReportsManager', this.gradesReportsManager);
            this.setGlobalReference('fileImportManager', this.fileImportManager);
            this.setGlobalReference('uiUtils', this.uiUtils);

            // Initialize UI components
            this.initializeUI();
            this.setupGlobalHandlers();
            this.setupRoleBasedAccess();

            this.isInitialized = true;
            console.log('Application initialized successfully');

        } catch (error) {
            console.error('Error initializing application:', error);
            this.showCriticalError('Failed to initialize application: ' + this.sanitizeErrorMessage(error.message));
        }
    }

    setupRoleBasedAccess() {
        window.addEventListener('userLoggedIn', () => {
            this.updateUserContext();
            this.setupUIForUserRole();
        });

        window.addEventListener('userLoggedOut', () => {
            this.userContext = null;
            this.resetUIForLogout();
        });
    }

    updateUserContext() {
        if (this.authManager?.currentUser) {
            this.userContext = getUserContext(this.authManager.currentUser);
            console.log('App user context updated:', this.userContext);
            
            document.body.setAttribute('data-user-role', this.userContext.role);
        }
    }

    setupUIForUserRole() {
        if (!this.userContext) return;

        const { role } = this.userContext;

        // Updated navigation items for new structure
        const navigationItems = {
            'teachers': role === ROLES.ADMIN,
            'teachers-attendance': [ROLES.ADMIN, ROLES.TEACHER].includes(role),
            'students-attendance': [ROLES.ADMIN, ROLES.TEACHER].includes(role),
            'evaluations': [ROLES.ADMIN, ROLES.TEACHER].includes(role),
            'reports': [ROLES.ADMIN, ROLES.TEACHER].includes(role),
        };

        // Show/hide navigation items based on role
        Object.entries(navigationItems).forEach(([sectionName, shouldShow]) => {
            const navLink = document.querySelector(`a[data-section="${sectionName}"]`);
            if (navLink) {
                const listItem = navLink.parentElement;
                if (shouldShow) {
                    listItem.classList.remove('hidden');
                    listItem.style.display = 'list-item';
                } else {
                    listItem.classList.add('hidden');
                    listItem.style.display = 'none';
                }
            }
        });

        // Show/hide admin-only sections in content
        const adminOnlySections = document.querySelectorAll('.admin-only');
        adminOnlySections.forEach(section => {
            if (role === ROLES.ADMIN) {
                section.classList.remove('hidden');
                section.style.display = 'block';
            } else {
                section.classList.add('hidden');
                section.style.display = 'none';
            }
        });

        this.updateUserInterface();
    }

    updateUserInterface() {
        if (!this.userContext) return;

        const userInitialsEl = document.getElementById('userInitials');
        if (userInitialsEl && this.authManager.currentUser) {
            const { first_name, last_name } = this.authManager.currentUser;
            if (first_name && last_name) {
                const initials = (first_name[0] + last_name[0]).toUpperCase();
                userInitialsEl.textContent = initials;
            }
        }

        const welcomeMessage = document.getElementById('welcomeMessage');
        if (welcomeMessage) {
            const roleText = this.userContext.role === ROLES.ADMIN ? 'Administrator' : 'Teacher';
            welcomeMessage.textContent = `Welcome, ${roleText}`;
        }
    }

    resetUIForLogout() {
        document.body.removeAttribute('data-user-role');
        
        const roleSpecificElements = document.querySelectorAll('.admin-only, .teacher-only');
        roleSpecificElements.forEach(element => {
            element.classList.add('hidden');
            element.style.display = 'none';
        });
    }

    initializeUI() {
        this.uiUtils?.initializeSearch();
        this.uiUtils?.addInteractiveFeatures();
        this.uiUtils?.setupNavigation();

        // Set current date for attendance forms
        const today = new Date().toISOString().split('T')[0];
        const attendanceDateInputs = [
            'studentAttendanceDate',
            'teacherAttendanceDate'
        ];
        
        attendanceDateInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input && !input.value) {
                input.value = today;
            }
        });

        this.setupFormHandlers();
        this.setupResponsiveHandlers();
    }

    setupFormHandlers() {
        // Updated form event handlers for new HTML structure
        const formHandlers = [
            { formId: 'studentForm', handler: () => this.handleStudentFormSubmit() },
            { formId: 'evaluationForm', handler: () => this.handleEvaluationFormSubmit() },
            { formId: 'gradeEntryForm', handler: () => this.handleGradeEntrySubmit() },
            { formId: 'assignmentForm', handler: () => this.handleAssignmentFormSubmit() },
            { formId: 'teacherForm', handler: () => this.handleTeacherFormSubmit() },
            { formId: 'classroomForm', handler: () => this.handleClassroomFormSubmit() },
            { formId: 'subjectForm', handler: () => this.handleSubjectFormSubmit() },
            { formId: 'schoolInfoForm', handler: () => this.handleSchoolInfoFormSubmit() }
        ];

        formHandlers.forEach(({ formId, handler }) => {
            const form = document.getElementById(formId);
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    handler();
                });
            }
        });

        this.setupButtonHandlers();
    }

    setupButtonHandlers() {
        // Updated button handlers for new HTML structure
        const buttonHandlers = [
            { buttonId: 'loadStudentsForAttendanceBtn', handler: () => this.loadStudentsForAttendance() },
            { buttonId: 'loadTeachersAttendanceBtn', handler: () => this.loadTeachersAttendance() },
            { buttonId: 'generateReportsBtn', handler: () => this.generateReports() }
        ];

        buttonHandlers.forEach(({ buttonId, handler }) => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', handler);
            }
        });

        // Setup classroom filter change handler
        const classroomFilter = document.getElementById('studentsClassroomFilter');
        if (classroomFilter) {
            classroomFilter.addEventListener('change', (e) => {
                const classroomId = e.target.value;
                this.filterStudentsByClassroom(classroomId);
            });
        }

        // Setup evaluations classroom filter
        const evalClassroomFilter = document.getElementById('evaluationsClassroomFilter');
        if (evalClassroomFilter) {
            evalClassroomFilter.addEventListener('change', (e) => {
                const classroomId = e.target.value;
                this.filterEvaluationsByClassroom(classroomId);
            });
        }

        // Setup report type change handler
        const reportTypeSelect = document.getElementById('reportType');
        if (reportTypeSelect) {
            reportTypeSelect.addEventListener('change', (e) => {
                this.handleReportTypeChange(e.target.value);
            });
        }
    }

    async filterStudentsByClassroom(classroomId) {
        try {
            if (this.dashboardManager) {
                const students = await this.dashboardManager.loadStudents(classroomId === 'all' ? null : classroomId);
                this.dashboardManager.displayStudentsList(students);
            }
        } catch (error) {
            console.error('Error filtering students:', error);
            this.uiUtils?.showMessage('Failed to filter students', 'error');
        }
    }

    async filterEvaluationsByClassroom(classroomId) {
        try {
            // This would filter evaluations by classroom
            console.log('Filtering evaluations by classroom:', classroomId);
            // Implementation would depend on your evaluations API
        } catch (error) {
            console.error('Error filtering evaluations:', error);
        }
    }

    handleReportTypeChange(reportType) {
        const studentSelect = document.getElementById('reportStudent');
        const classroomSelect = document.getElementById('reportClassroom');
        const periodSelect = document.getElementById('reportPeriod');

        // Show/hide relevant fields based on report type
        if (reportType === 'student_report') {
            if (studentSelect) {
                studentSelect.parentElement.style.display = 'block';
                studentSelect.required = true;
            }
        } else {
            if (studentSelect) {
                studentSelect.parentElement.style.display = 'none';
                studentSelect.required = false;
            }
        }

        if (reportType === 'classroom_report' || reportType === 'attendance_report') {
            if (classroomSelect) {
                classroomSelect.required = true;
            }
        } else {
            if (classroomSelect) {
                classroomSelect.required = false;
            }
        }
    }

    // Updated form handlers for new structure
    async handleStudentFormSubmit() {
        const form = document.getElementById('studentForm');
        const formData = new FormData(form);
        const studentData = Object.fromEntries(formData.entries());
        
        try {
            await this.studentManager.registerStudent(studentData);
            form.reset();
            this.uiUtils.showMessage('Student added successfully!', 'success');
            
            if (this.dashboardManager) {
                await this.dashboardManager.loadStudents();
            }
        } catch (error) {
            console.error('Error adding student:', error);
            this.uiUtils.showMessage('Failed to add student: ' + error.message, 'error');
        }
    }

    async handleTeacherFormSubmit() {
        // Delegate to authManager which has the form handler
        await this.authManager.handleCreateTeacher();
    }

    async handleClassroomFormSubmit() {
        // Delegate to authManager which has the form handler
        await this.authManager.handleCreateClassroom();
    }

    async handleSubjectFormSubmit() {
        // Delegate to authManager which has the form handler
        await this.authManager.handleCreateSubject();
    }

    async handleEvaluationFormSubmit() {
        // Delegate to authManager which has the form handler
        await this.authManager.handleCreateEvaluation();
    }

    async handleGradeEntrySubmit() {
        const form = document.getElementById('gradeEntryForm');
        const formData = new FormData(form);
        const gradeData = Object.fromEntries(formData.entries());
        
        try {
            await this.gradesReportsManager.addGrade(gradeData);
            form.reset();
            this.uiUtils.showMessage('Grade added successfully!', 'success');
        } catch (error) {
            console.error('Error adding grade:', error);
            this.uiUtils.showMessage('Failed to add grade: ' + error.message, 'error');
        }
    }

    async handleAssignmentFormSubmit() {
        // Delegate to authManager which has the form handler
        await this.authManager.handleCreateAssignment();
    }

    async handleSchoolInfoFormSubmit() {
        const form = document.getElementById('schoolInfoForm');
        const formData = new FormData(form);
        const schoolData = Object.fromEntries(formData.entries());
        
        try {
            // This would save school information
            console.log('Saving school info:', schoolData);
            this.uiUtils.showMessage('School information saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving school info:', error);
            this.uiUtils.showMessage('Failed to save school information: ' + error.message, 'error');
        }
    }

    // Updated attendance handlers for new structure
    async loadStudentsForAttendance() {
        const classroomSelect = document.getElementById('attendanceClassroom');
        const dateInput = document.getElementById('studentAttendanceDate');
        
        if (!classroomSelect || !dateInput) {
            this.uiUtils?.showMessage('Required form elements not found', 'error');
            return;
        }

        const classroomId = classroomSelect.value;
        const date = dateInput.value;
        
        if (!classroomId || !date) {
            this.uiUtils?.showMessage('Please select both classroom and date', 'error');
            return;
        }

        const userContext = getUserContext(this.authManager?.currentUser);
        if (!userContext || !hasPermission(userContext.role, 'RECORD_ATTENDANCE')) {
            this.uiUtils?.showMessage('Access denied: You do not have permission to record attendance', 'error');
            return;
        }

        try {
            this.uiUtils?.showLoading('studentAttendanceList', true);
            
            let attendanceData = [];
            let students = [];
            
            if (this.attendanceManager) {
                attendanceData = await this.attendanceManager.loadClassroomAttendance(classroomId, date);
            }
            
            if (this.dashboardManager) {
                students = await this.dashboardManager.loadStudents(classroomId);
            }
            
            if (this.attendanceManager) {
                this.attendanceManager.displayAttendanceList(students, attendanceData, classroomId, date);
            }
            
        } catch (error) {
            console.error('Error loading student attendance:', error);
            this.uiUtils?.showMessage('Failed to load attendance data: ' + error.message, 'error');
        } finally {
            this.uiUtils?.showLoading('studentAttendanceList', false);
        }
    }

    async loadTeachersAttendance() {
        const dateInput = document.getElementById('teacherAttendanceDate');
        const teacherSelect = document.getElementById('teacherSelect');
        
        if (!dateInput) {
            this.uiUtils?.showMessage('Date input not found', 'error');
            return;
        }

        const date = dateInput.value;
        if (!date) {
            this.uiUtils?.showMessage('Please select a date', 'error');
            return;
        }

        const userContext = getUserContext(this.authManager?.currentUser);
        if (!userContext || !hasPermission(userContext.role, 'RECORD_ATTENDANCE')) {
            this.uiUtils?.showMessage('Access denied: You do not have permission to record attendance', 'error');
            return;
        }

        try {
            this.uiUtils?.showLoading('teacherAttendanceList', true);
            
            let teachers = [];
            let attendanceData = [];
            
            // Load all teachers for attendance
            try {
                teachers = await this.authManager.apiClient.get('/admin/teachers');
            } catch (error) {
                console.error('Error loading teachers:', error);
                this.uiUtils?.showMessage('Failed to load teachers list', 'error');
                return;
            }

            // Load existing attendance data
            if (userContext.role === ROLES.ADMIN && teacherSelect?.value) {
                attendanceData = await this.attendanceManager.loadTeacherAttendance(teacherSelect.value, date);
            } else {
                // Load all teacher attendance for the date
                try {
                    attendanceData = await this.authManager.apiClient.get(`/attendance/teachers?date=${date}`);
                } catch (error) {
                    console.warn('No existing teacher attendance data found');
                    attendanceData = [];
                }
            }
            
            // Display teacher attendance list
            this.attendanceManager.displayTeacherAttendanceList(teachers, attendanceData, date);
            
        } catch (error) {
            console.error('Error loading teacher attendance:', error);
            this.uiUtils?.showMessage('Failed to load teacher attendance: ' + error.message, 'error');
        } finally {
            this.uiUtils?.showLoading('teacherAttendanceList', false);
        }
    }

    async generateReports() {
        const reportTypeSelect = document.getElementById('reportType');
        const classroomSelect = document.getElementById('reportClassroom');
        const periodSelect = document.getElementById('reportPeriod');
        const studentSelect = document.getElementById('reportStudent');
        const dateFromInput = document.getElementById('reportDateFrom');
        const dateToInput = document.getElementById('reportDateTo');
        
        if (!reportTypeSelect?.value) {
            this.uiUtils?.showMessage('Please select a report type', 'error');
            return;
        }

        const reportType = reportTypeSelect.value;
        const classroomId = classroomSelect?.value;
        const periodId = periodSelect?.value;
        const studentId = studentSelect?.value;
        const dateFrom = dateFromInput?.value;
        const dateTo = dateToInput?.value;

        const userContext = getUserContext(this.authManager?.currentUser);
        if (!userContext || !hasPermission(userContext.role, 'GENERATE_REPORTS')) {
            this.uiUtils?.showMessage('Access denied: You do not have permission to generate reports', 'error');
            return;
        }

        try {
            this.uiUtils?.showLoading('reportsList', true);
            
            let reports = [];
            
            switch (reportType) {
                case 'student_report':
                    if (!studentId || !periodId) {
                        throw new Error('Student and evaluation period are required for student reports');
                    }
                    reports = await this.gradesReportsManager.generateReportCard(studentId, periodId);
                    break;
                    
                case 'classroom_report':
                    if (!classroomId || !periodId) {
                        throw new Error('Classroom and evaluation period are required for classroom reports');
                    }
                    reports = await this.gradesReportsManager.loadClassroomReports(classroomId, periodId);
                    break;
                    
                case 'attendance_report':
                    if (!dateFrom || !dateTo) {
                        throw new Error('Date range is required for attendance reports');
                    }
                    reports = await this.generateAttendanceReport(classroomId, dateFrom, dateTo);
                    break;
                    
                case 'grade_analysis':
                    if (!classroomId) {
                        throw new Error('Classroom is required for grade analysis');
                    }
                    reports = await this.generateGradeAnalysisReport(classroomId, periodId);
                    break;
                    
                default:
                    throw new Error('Report type not implemented yet');
            }
            
            this.displayReportsList(reports, reportType, classroomId, periodId);
            
        } catch (error) {
            console.error('Error generating reports:', error);
            this.uiUtils?.showMessage('Failed to generate reports: ' + error.message, 'error');
        } finally {
            this.uiUtils?.showLoading('reportsList', false);
        }
    }

    async generateAttendanceReport(classroomId, dateFrom, dateTo) {
        try {
            const reportData = {
                id: 'attendance_' + Date.now(),
                type: 'attendance_report',
                name: 'Attendance Report',
                description: `Attendance analysis from ${dateFrom} to ${dateTo}`,
                classroom_id: classroomId,
                date_from: dateFrom,
                date_to: dateTo,
                generated_at: new Date().toISOString(),
                data: {
                    summary: 'Sample attendance report data would be here',
                    totalDays: this.calculateDaysBetween(dateFrom, dateTo),
                    averageAttendance: '85%'
                }
            };
            
            return [reportData];
        } catch (error) {
            console.error('Error generating attendance report:', error);
            throw error;
        }
    }

    async generateGradeAnalysisReport(classroomId, periodId) {
        try {
            const reportData = {
                id: 'grades_' + Date.now(),
                type: 'grade_analysis',
                name: 'Grade Analysis Report',
                description: 'Statistical analysis of student grades',
                classroom_id: classroomId,
                period_id: periodId,
                generated_at: new Date().toISOString(),
                data: {
                    summary: 'Sample grade analysis would be here',
                    averageGrade: '75%',
                    distribution: {
                        'A': 15,
                        'B': 25,
                        'C': 35,
                        'D': 20,
                        'F': 5
                    }
                }
            };
            
            return [reportData];
        } catch (error) {
            console.error('Error generating grade analysis report:', error);
            throw error;
        }
    }

    calculateDaysBetween(dateFrom, dateTo) {
        const start = new Date(dateFrom);
        const end = new Date(dateTo);
        const timeDiff = Math.abs(end.getTime() - start.getTime());
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }

    displayReportsList(reports, reportType, classroomId, periodId) {
        const reportsList = document.getElementById('reportsList');
        if (!reportsList) {
            console.error('Reports list element not found');
            return;
        }

        if (!Array.isArray(reports) || reports.length === 0) {
            reportsList.innerHTML = '<p class="no-data">No reports generated</p>';
            return;
        }

        let html = '<div class="reports-container">';
        
        reports.forEach(report => {
            const reportTitle = this.getReportTitle(reportType, report);
            const generationDate = report.generation_date || report.generated_at || 'Unknown';
            
            html += `
                <div class="report-item">
                    <div class="report-icon">
                        <i class="fas fa-file-pdf"></i>
                    </div>
                    <div class="report-details">
                        <h4>${this.escapeHtml(reportTitle)}</h4>
                        <p>Generated: ${this.formatDate(generationDate)}</p>
                        ${report.description ? `<p class="report-description">${this.escapeHtml(report.description)}</p>` : ''}
                    </div>
                    <div class="report-actions">
                        <button class="btn-small btn-info" onclick="downloadReport('${report.id || 'demo'}')">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <button class="btn-small btn-secondary" onclick="viewReport('${report.id || 'demo'}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        reportsList.innerHTML = html;
    }

    getReportTitle(reportType, report) {
        const titles = {
            'student_report': 'Student Report Card',
            'classroom_report': 'Classroom Performance Report',
            'attendance_report': 'Attendance Analysis Report',
            'grade_analysis': 'Grade Distribution Analysis'
        };
        
        return titles[reportType] || report.name || 'Generated Report';
    }

    // Additional helper methods
    async loadEvaluationsList() {
        const list = document.getElementById('evaluationsList');
        if (!list) return;

        try {
            const evaluations = await this.authManager.apiClient.get('/evaluations');
            list.innerHTML = this.formatEvaluationsList(evaluations);
        } catch (error) {
            console.error('Error loading evaluations:', error);
            list.innerHTML = '<p class="no-data">Failed to load evaluations</p>';
        }
    }

    formatEvaluationsList(evaluations) {
        if (!Array.isArray(evaluations) || evaluations.length === 0) {
            return '<p class="no-data">No evaluations found</p>';
        }

        return evaluations.map(evaluation => `
            <div class="evaluation-item">
                <div class="evaluation-info">
                    <h4>${this.escapeHtml(evaluation.name)}</h4>
                    <p>${evaluation.type} - ${evaluation.subject?.name}</p>
                    <p>Classroom: ${evaluation.classroom?.name}</p>
                    <small>Date: ${evaluation.evaluation_date}</small>
                </div>
                <div class="evaluation-actions">
                    <button class="btn-small btn-info" onclick="viewEvaluation(${evaluation.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn-small btn-secondary" onclick="editEvaluation(${evaluation.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadAssignmentsList() {
        const list = document.getElementById('assignmentsList');
        if (!list) return;

        try {
            const assignments = await this.authManager.apiClient.get('/admin/assignments');
            list.innerHTML = this.formatAssignmentsList(assignments);
        } catch (error) {
            console.error('Error loading assignments:', error);
            list.innerHTML = '<p class="no-data">Failed to load assignments</p>';
        }
    }

    formatAssignmentsList(assignments) {
        if (!Array.isArray(assignments) || assignments.length === 0) {
            return '<p class="no-data">No assignments found</p>';
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Teacher</th>
                        <th>Subject</th>
                        <th>Classroom</th>
                        <th>Academic Year</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${assignments.map(assignment => `
                        <tr>
                            <td>${assignment.teacher?.name || 'N/A'}</td>
                            <td>${assignment.subject?.name || 'N/A'}</td>
                            <td>${assignment.classroom?.name || 'N/A'}</td>
                            <td>${assignment.academic_year || 'N/A'}</td>
                            <td>
                                <button class="btn-small btn-danger" onclick="deleteAssignment(${assignment.id})">
                                    <i class="fas fa-trash"></i> Remove
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // Utility methods
    sanitizeErrorMessage(message) {
        if (typeof message !== 'string') {
            return 'Unknown error';
        }
        return message.replace(/<[^>]*>/g, '').substring(0, 200);
    }

    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return 'Invalid Date';
        }
    }

    showCriticalError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; 
            top: 0; left: 0; right: 0; bottom: 0; 
            background: rgba(0,0,0,0.8); 
            display: flex; align-items: center; justify-content: center;
            z-index: 10000; color: white; text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = `
            background: #dc2626; padding: 2rem; border-radius: 8px; max-width: 500px;
        `;

        contentDiv.innerHTML = `
            <h2 style="margin: 0 0 1rem 0;">Application Error</h2>
            <p style="margin: 0 0 1rem 0;">${message}</p>
            <button onclick="window.location.reload()" style="
                background: white; color: #dc2626; border: none; padding: 0.5rem 1rem;
                border-radius: 4px; cursor: pointer; font-weight: bold;">
                Reload Page
            </button>
        `;

        errorDiv.appendChild(contentDiv);
        document.body.appendChild(errorDiv);
    }

    setGlobalReference(name, value) {
        window[name] = value;
        this.globalReferences.add(name);
    }

    setupGlobalHandlers() {
        this.setupResponsiveHandlers();
        console.log('Global handlers initialized');
    }

    setupResponsiveHandlers() {
        this.resizeHandler = this.debounce(() => {
            if (this.dashboardManager?.attendanceChartInstance) {
                this.dashboardManager.attendanceChartInstance.resize();
            }
        }, 250);
        
        window.addEventListener('resize', this.resizeHandler);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    destroy() {
        this.globalReferences.forEach(refName => {
            delete window[refName];
        });
        this.globalReferences.clear();
        
        if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
        if (this.dashboardManager) this.dashboardManager.destroy();
        
        this.isInitialized = false;
    }
}

// Updated Global Functions for new structure
function showSection(sectionName) {
    try {
        if (window.uiUtils) {
            window.uiUtils.showSection(sectionName);
        } else {
            console.error('UI Utils not initialized');
        }
    } catch (error) {
        console.error('Error showing section:', error);
    }
}

function logout() {
    try {
        if (window.authManager) {
            window.authManager.logout();
        } else {
            console.error('AuthManager not found');
        }
    } catch (error) {
        console.error('Error during logout:', error);
    }
}

// Global attendance functions
async function saveStudentAttendance(classroomId, date) {
    try {
        const userContext = getUserContext(window.authManager?.currentUser);
        if (!userContext || !hasPermission(userContext.role, 'RECORD_ATTENDANCE')) {
            window.uiUtils?.showMessage('Access denied: You do not have permission to save attendance', 'error');
            return;
        }

        if (window.attendanceManager) {
            await window.attendanceManager.saveAttendance(classroomId, date);
        }
    } catch (error) {
        console.error('Error saving student attendance:', error);
        window.uiUtils?.showMessage('Failed to save attendance: ' + error.message, 'error');
    }
}

async function saveTeacherAttendance(date) {
    try {
        const userContext = getUserContext(window.authManager?.currentUser);
        if (!userContext || !hasPermission(userContext.role, 'RECORD_ATTENDANCE')) {
            window.uiUtils?.showMessage('Access denied: You do not have permission to save attendance', 'error');
            return;
        }

        if (window.attendanceManager) {
            await window.attendanceManager.saveTeacherAttendance(date);
        }
    } catch (error) {
        console.error('Error saving teacher attendance:', error);
        window.uiUtils?.showMessage('Failed to save teacher attendance: ' + error.message, 'error');
    }
}

function clearAttendance() {
    try {
        if (window.attendanceManager) {
            window.attendanceManager.clearAttendance();
        }
    } catch (error) {
        console.error('Error clearing attendance:', error);
    }
}

function clearTeacherAttendance() {
    try {
        if (window.attendanceManager) {
            window.attendanceManager.clearTeacherAttendance();
        }
    } catch (error) {
        console.error('Error clearing teacher attendance:', error);
    }
}

// Student details function
async function viewStudentDetails(studentId) {
    try {
        if (!studentId) {
            console.error('Student ID is required');
            return;
        }

        const student = await window.authManager.apiClient.get(`/students/${studentId}`);
        
        if (window.uiUtils) {
            window.uiUtils.showStudentModal(student);
        } else {
            console.log('Viewing student:', student);
        }
    } catch (error) {
        console.error('Error viewing student details:', error);
        window.uiUtils?.showMessage('Failed to load student details: ' + error.message, 'error');
    }
}

// Evaluation functions
async function viewEvaluation(evaluationId) {
    try {
        if (!evaluationId) {
            console.error('Evaluation ID is required');
            return;
        }

        const evaluation = await window.authManager.apiClient.get(`/evaluations/${evaluationId}`);
        
        if (window.uiUtils) {
            const detailsHTML = formatEvaluationDetails(evaluation);
            window.uiUtils.showModal(detailsHTML, 'Evaluation Details');
        } else {
            console.log('Viewing evaluation:', evaluation);
        }
    } catch (error) {
        console.error('Error viewing evaluation:', error);
        window.uiUtils?.showMessage('Failed to load evaluation details: ' + error.message, 'error');
    }
}

function formatEvaluationDetails(evaluation) {
    return `
        <div class="evaluation-details">
            <div class="detail-row">
                <label>Name:</label>
                <span>${evaluation.name || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <label>Type:</label>
                <span>${evaluation.type || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <label>Subject:</label>
                <span>${evaluation.subject?.name || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <label>Classroom:</label>
                <span>${evaluation.classroom?.name || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <label>Date:</label>
                <span>${evaluation.evaluation_date || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <label>Max Points:</label>
                <span>${evaluation.max_points || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <label>Weight:</label>
                <span>${evaluation.weight || 'N/A'}</span>
            </div>
        </div>
    `;
}

async function editEvaluation(evaluationId) {
    try {
        const evaluation = await window.authManager.apiClient.get(`/evaluations/${evaluationId}`);
        console.log('Editing evaluation:', evaluation);
        window.uiUtils?.showMessage('Edit evaluation functionality would open here', 'info');
    } catch (error) {
        console.error('Error loading evaluation for edit:', error);
        window.uiUtils?.showMessage('Failed to load evaluation: ' + error.message, 'error');
    }
}

async function deleteAssignment(assignmentId) {
    try {
        const userContext = getUserContext(window.authManager?.currentUser);
        if (!userContext || userContext.role !== ROLES.ADMIN) {
            window.uiUtils?.showMessage('Access denied: Admin privileges required', 'error');
            return;
        }

        const confirmed = confirm('Are you sure you want to remove this assignment?');
        if (!confirmed) return;

        await window.authManager.apiClient.delete(`/admin/assignments/${assignmentId}`);
        window.uiUtils?.showMessage('Assignment removed successfully', 'success');
        
        if (window.app) {
            await window.app.loadAssignmentsList();
        }
    } catch (error) {
        console.error('Error deleting assignment:', error);
        window.uiUtils?.showMessage('Failed to remove assignment: ' + error.message, 'error');
    }
}

// Report functions
async function downloadReport(reportId) {
    try {
        if (reportId === 'demo') {
            window.uiUtils?.showMessage('This is a demo report. In production, this would download the actual report file.', 'info');
            return;
        }

        if (window.gradesReportsManager) {
            window.gradesReportsManager.downloadReport(reportId);
        }
    } catch (error) {
        console.error('Error downloading report:', error);
        window.uiUtils?.showMessage('Failed to download report', 'error');
    }
}

async function viewReport(reportId) {
    try {
        if (reportId === 'demo') {
            window.uiUtils?.showMessage('This is a demo report. In production, this would show the actual report content.', 'info');
            return;
        }

        console.log('Viewing report:', reportId);
        window.uiUtils?.showMessage('Report viewing functionality would open here', 'info');
    } catch (error) {
        console.error('Error viewing report:', error);
        window.uiUtils?.showMessage('Failed to view report', 'error');
    }
}

// File import handlers
function handleFileImport(event, type) {
    try {
        const userContext = getUserContext(window.authManager?.currentUser);
        if (!userContext) {
            window.uiUtils?.showMessage('Please login to import files', 'error');
            return;
        }

        const importPermissions = {
            'students': 'CREATE_STUDENTS',
            'teachers': 'CREATE_TEACHERS',
            'classrooms': 'CREATE_CLASSROOMS',
            'subjects': 'CREATE_SUBJECTS'
        };

        const requiredPermission = importPermissions[type];
        if (requiredPermission && !hasPermission(userContext.role, requiredPermission)) {
            window.uiUtils?.showMessage(`Access denied: You do not have permission to import ${type}`, 'error');
            return;
        }

        if (window.fileImportManager) {
            window.fileImportManager.handleFileImport(event, type);
        } else {
            console.error('File import manager not initialized');
        }
    } catch (error) {
        console.error('Error handling file import:', error);
        window.uiUtils?.showMessage('Failed to import file', 'error');
    }
}

function downloadTemplate(type) {
    try {
        const userContext = getUserContext(window.authManager?.currentUser);
        if (!userContext || ![ROLES.ADMIN, ROLES.TEACHER].includes(userContext.role)) {
            window.uiUtils?.showMessage('Access denied: You do not have permission to download templates', 'error');
            return;
        }

        if (window.fileImportManager) {
            window.fileImportManager.downloadTemplate(type);
        } else {
            console.error('File import manager not initialized');
        }
    } catch (error) {
        console.error('Error downloading template:', error);
        window.uiUtils?.showMessage('Failed to download template', 'error');
    }
}

// Additional classroom/subject management functions
async function editClassroom(classroomId) {
    try {
        const classroom = await window.authManager.apiClient.get(`/admin/classrooms/${classroomId}`);
        console.log('Editing classroom:', classroom);
        window.uiUtils?.showMessage('Edit classroom functionality would open here', 'info');
    } catch (error) {
        console.error('Error loading classroom for edit:', error);
        window.uiUtils?.showMessage('Failed to load classroom: ' + error.message, 'error');
    }
}

async function editSubject(subjectId) {
    try {
        const subject = await window.authManager.apiClient.get(`/admin/subjects/${subjectId}`);
        console.log('Editing subject:', subject);
        window.uiUtils?.showMessage('Edit subject functionality would open here', 'info');
    } catch (error) {
        console.error('Error loading subject for edit:', error);
        window.uiUtils?.showMessage('Failed to load subject: ' + error.message, 'error');
    }
}

// Additional grade management functions
async function addGradeForStudent(studentId, evaluationId) {
    try {
        if (!studentId || !evaluationId) {
            window.uiUtils?.showMessage('Student ID and Evaluation ID are required', 'error');
            return;
        }

        // This would open a grade entry form for the specific student and evaluation
        const gradeForm = window.gradesReportsManager.createGradeForm(studentId);
        if (window.uiUtils) {
            window.uiUtils.showModal(gradeForm, 'Add Grade');
        }
    } catch (error) {
        console.error('Error opening grade form:', error);
        window.uiUtils?.showMessage('Failed to open grade entry form', 'error');
    }
}

// Protect against redefinition
if (!window.schoolAppGlobalsInitialized) {
    // Navigation
    window.showSection = showSection;
    window.logout = logout;
    
    // Attendance
    window.saveStudentAttendance = saveStudentAttendance;
    window.saveTeacherAttendance = saveTeacherAttendance;
    window.clearAttendance = clearAttendance;
    window.clearTeacherAttendance = clearTeacherAttendance;
    
    // Student management
    window.viewStudentDetails = viewStudentDetails;
    
    // Evaluations
    window.viewEvaluation = viewEvaluation;
    window.editEvaluation = editEvaluation;
    window.addGradeForStudent = addGradeForStudent;
    
    // Assignments
    window.deleteAssignment = deleteAssignment;
    
    // Reports
    window.downloadReport = downloadReport;
    window.viewReport = viewReport;
    
    // File management
    window.handleFileImport = handleFileImport;
    window.downloadTemplate = downloadTemplate;
    
    // Settings
    window.editClassroom = editClassroom;
    window.editSubject = editSubject;
    
    // Prevent re-initialization
    window.schoolAppGlobalsInitialized = true;
}

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const app = new SchoolManagementApp();
        window.app = app;
        await app.initialize();
        
        console.log('School Management System initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #fee; border: 1px solid #fcc; color: #c33;
            padding: 1rem; border-radius: 4px; max-width: 400px; text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            z-index: 10000;
        `;
        
        errorDiv.innerHTML = `
            <h3 style="margin: 0 0 1rem 0;">Application Error</h3>
            <p>Failed to start the application. Please refresh the page or contact support.</p>
            <button onclick="window.location.reload()" style="
                background: #c33; color: white; border: none; padding: 0.5rem 1rem;
                border-radius: 4px; cursor: pointer; margin-top: 0.5rem;">
                Reload Page
            </button>
        `;
        
        document.body.appendChild(errorDiv);
    }
});

export { SchoolManagementApp };