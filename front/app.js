import { AuthManager } from './authManager.js';
import { DashboardManager } from './dashboardManager.js';
import { StudentManager } from './studentManager.js';
import { AttendanceManager } from './attendanceManager.js';
import { GradesReportsManager } from './gradesReportsManager.js';
import { FileImportManager } from './fileImportManager.js';
import { UIUtils } from './uiUtils.js';
import { API_CONFIG, ROLES, hasPermission, getUserContext } from './config.js';

// Global Application State
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

            // Validate module imports
            if (!AuthManager || !DashboardManager || !UIUtils) {
                throw new Error('Required modules failed to load');
            }

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

            // Make managers globally accessible with cleanup tracking
            this.setGlobalReference('authManager', this.authManager);
            this.setGlobalReference('dashboardManager', this.dashboardManager);
            this.setGlobalReference('studentManager', this.studentManager);
            this.setGlobalReference('attendanceManager', this.attendanceManager);
            this.setGlobalReference('gradesReportsManager', this.gradesReportsManager);
            this.setGlobalReference('fileImportManager', this.fileImportManager);
            this.setGlobalReference('uiUtils', this.uiUtils);

            // Initialize UI components
            this.initializeUI();

            // Setup global event handlers
            this.setupGlobalHandlers();

            // Setup role-based access control
            this.setupRoleBasedAccess();

            this.isInitialized = true;
            console.log('Application initialized successfully');

        } catch (error) {
            console.error('Error initializing application:', error);
            this.showCriticalError('Failed to initialize application: ' + this.sanitizeErrorMessage(error.message));
        }
    }

    setupRoleBasedAccess() {
        // Listen for user context changes
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
        }
    }

    setupUIForUserRole() {
        if (!this.userContext) return;

        const { role } = this.userContext;

        // Hide/show navigation items based on role
        const navigationItems = {
            'teachersLink': role === ROLES.ADMIN,
            'classroomsManagement': role === ROLES.ADMIN,
            'subjectsManagement': role === ROLES.ADMIN,
            'systemSettings': role === ROLES.ADMIN,
            'myClassroomsLink': role === ROLES.TEACHER,
            'myStudentsLink': role === ROLES.TEACHER
        };

        Object.entries(navigationItems).forEach(([elementId, shouldShow]) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.style.display = shouldShow ? 'block' : 'none';
                if (shouldShow) {
                    element.classList.remove('hidden');
                } else {
                    element.classList.add('hidden');
                }
            }
        });

        // Update user interface elements
        this.updateUserInterface();
    }

    updateUserInterface() {
        if (!this.userContext) return;

        // Update user display
        const userInitialsEl = document.getElementById('userInitials');
        if (userInitialsEl && this.authManager.currentUser) {
            const { first_name, last_name } = this.authManager.currentUser;
            if (first_name && last_name) {
                const initials = (first_name[0] + last_name[0]).toUpperCase();
                userInitialsEl.textContent = initials;
            }
        }

        // Update role-specific welcome messages
        const welcomeMessage = document.getElementById('welcomeMessage');
        if (welcomeMessage) {
            const roleText = this.userContext.role === ROLES.ADMIN ? 'Administrator' : 'Teacher';
            welcomeMessage.textContent = `Welcome, ${roleText}`;
        }

        // Update context-specific labels and hints
        this.updateContextualHelp();
    }

    updateContextualHelp() {
        if (!this.userContext) return;

        const helpTexts = {
            studentsHelp: this.userContext.canAccessAll 
                ? 'You can view and manage all students in the system.'
                : 'You can view students from your assigned classrooms.',
            attendanceHelp: this.userContext.canAccessAll
                ? 'You can record attendance for any classroom.'
                : 'You can record attendance for classrooms you teach.',
            reportsHelp: this.userContext.canAccessAll
                ? 'You can generate reports for all students and classrooms.'
                : 'You can generate reports for your assigned students.'
        };

        Object.entries(helpTexts).forEach(([elementId, text]) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = text;
            }
        });
    }

    resetUIForLogout() {
        // Hide all role-specific elements
        const elementsToHide = [
            'teachersLink', 'classroomsManagement', 'subjectsManagement',
            'systemSettings', 'myClassroomsLink', 'myStudentsLink'
        ];

        elementsToHide.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
                element.classList.add('hidden');
            }
        });
    }

    setGlobalReference(name, value) {
        window[name] = value;
        this.globalReferences.add(name);
    }

    destroy() {
        // Remove global references
        this.globalReferences.forEach(refName => {
            delete window[refName];
        });
        this.globalReferences.clear();
        
        // Remove event listeners
        if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
        if (this.errorHandler) window.removeEventListener('error', this.errorHandler);
        if (this.rejectionHandler) window.removeEventListener('unhandledrejection', this.rejectionHandler);
        if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
        if (this.beforeUnloadHandler) window.removeEventListener('beforeunload', this.beforeUnloadHandler);
        
        // Cleanup managers
        if (this.dashboardManager) this.dashboardManager.destroy();
        
        this.isInitialized = false;
    }

    initializeUI() {
        this.uiUtils?.initializeSearch();
        this.uiUtils?.addInteractiveFeatures();
        this.uiUtils?.setupNavigation();

        // Set current date for attendance
        const today = new Date().toISOString().split('T')[0];
        const attendanceDateInput = document.getElementById('attendanceDate');
        if (attendanceDateInput) {
            attendanceDateInput.value = today;
        }

        // Initialize form validation
        this.initializeFormValidation();

        // Setup responsive handlers
        this.setupResponsiveHandlers();
    }

    initializeFormValidation() {
        // Students classroom change handler
        const studentsClassroom = document.getElementById('studentsClassroom');
        if (studentsClassroom) {
            studentsClassroom.addEventListener('change', async () => {
                try {
                    const classroomId = studentsClassroom.value;
                    if (classroomId && this.dashboardManager) {
                        await this.dashboardManager.loadStudents(classroomId);
                    }
                } catch (error) {
                    console.error('Error loading students for classroom:', error);
                    this.uiUtils?.showMessage('Failed to load students: ' + error.message, 'error');
                }
            });
        }

        // Add form validation for role-based restrictions
        this.setupRoleBasedFormValidation();
    }

    setupRoleBasedFormValidation() {
        // Validate forms based on user permissions
        document.addEventListener('submit', (e) => {
            const form = e.target.closest('form');
            if (!form) return;

            const formType = form.id || form.dataset.type;
            if (!formType) return;

            // Check permissions before allowing form submission
            if (!this.validateFormPermissions(formType)) {
                e.preventDefault();
                this.uiUtils?.showMessage('Access denied: Insufficient privileges', 'error');
                return;
            }
        });
    }

    validateFormPermissions(formType) {
        if (!this.userContext) return false;

        const permissionMap = {
            'teacherForm': ROLES.ADMIN,
            'classroomForm': ROLES.ADMIN,
            'subjectForm': ROLES.ADMIN,
            'studentForm': [ROLES.ADMIN, ROLES.TEACHER],
            'attendanceForm': [ROLES.ADMIN, ROLES.TEACHER],
            'gradeForm': [ROLES.ADMIN, ROLES.TEACHER]
        };

        const requiredRole = permissionMap[formType];
        if (!requiredRole) return true; // No specific restriction

        if (Array.isArray(requiredRole)) {
            return requiredRole.includes(this.userContext.role);
        }

        return this.userContext.role === requiredRole;
    }

    setupResponsiveHandlers() {
        this.resizeHandler = this.debounce(() => {
            if (this.dashboardManager?.attendanceChartInstance) {
                this.dashboardManager.attendanceChartInstance.resize();
            }
        }, 250);
        
        window.addEventListener('resize', this.resizeHandler);
    }

    setupGlobalHandlers() {
        this.errorHandler = (event) => {
            console.error('Global error:', event.error);
            this.handleGlobalError(event.error);
        };

        this.rejectionHandler = (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleGlobalError(event.reason);
        };

        this.visibilityHandler = () => {
            if (document.hidden) {
                this.handlePageHidden();
            } else {
                this.handlePageVisible();
            }
        };

        this.beforeUnloadHandler = (event) => {
            if (this.hasUnsavedChanges()) {
                event.preventDefault();
                event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return event.returnValue;
            }
        };

        // Add event listeners
        window.addEventListener('error', this.errorHandler);
        window.addEventListener('unhandledrejection', this.rejectionHandler);
        document.addEventListener('visibilitychange', this.visibilityHandler);
        window.addEventListener('beforeunload', this.beforeUnloadHandler);
        
        console.log('Global Handlers initialized');
    }

    handleGlobalError(error) {
        // Don't show error messages for network errors during development
        if (error?.message?.includes('Network error')) {
            return;
        }

        // Handle authentication errors globally
        if (error?.message?.includes('Session expired') || 
            error?.message?.includes('Authentication required')) {
            this.authManager?.logout();
            return;
        }

        this.uiUtils?.showMessage('An unexpected error occurred. Please try again.', 'error');
    }

    handlePageHidden() {
        console.log('Page hidden - pausing real-time updates');
        // Could pause auto-refresh timers here
    }

    handlePageVisible() {
        console.log('Page visible - resuming real-time updates');
        // Could resume auto-refresh timers here
    }

    hasUnsavedChanges() {
        const forms = document.querySelectorAll('form');
        for (const form of forms) {
            const inputs = form.querySelectorAll('input, textarea, select');
            for (const input of inputs) {
                if (input.defaultValue !== input.value || input.defaultChecked !== input.checked) {
                    return true;
                }
            }
            
            if (form.checkValidity && !form.checkValidity()) {
                const modifiedInputs = Array.from(inputs).some(input => 
                    input.defaultValue !== input.value || input.defaultChecked !== input.checked
                );
                if (modifiedInputs) {
                    return true;
                }
            }
        }
        return false;
    }

    async loadClassrooms() {
        try {
            if (!this.authManager?.apiClient) {
                throw new Error('API client not available');
            }

            const classrooms = await this.authManager.apiClient.get(API_CONFIG.endpoints.admin.classrooms.list);
            this.populateClassroomSelects(classrooms);
            return Array.isArray(classrooms) ? classrooms : [];
        } catch (error) {
            console.error('Error loading classrooms:', error);
            // Use fallback classrooms for development
            const fallbackClassrooms = [
                { id: 1, name: 'Grade 10A', grade_level: '10' },
                { id: 2, name: 'Grade 10B', grade_level: '10' },
                { id: 3, name: 'Grade 11A', grade_level: '11' },
            ];
            this.populateClassroomSelects(fallbackClassrooms);
            return fallbackClassrooms;
        }
    }

    populateClassroomSelects(classrooms) {
        const selects = [
            'attendanceClassroom',
            'studentsClassroom', 
            'reportClassroom'
        ];

        const selectElements = {};
        selects.forEach(selectId => {
            selectElements[selectId] = document.getElementById(selectId);
        });

        Object.values(selectElements).forEach(select => {
            if (select) {
                const firstOption = select.querySelector('option');
                select.innerHTML = '';
                if (firstOption) {
                    select.appendChild(firstOption);
                }

                classrooms?.forEach(classroom => {
                    const option = document.createElement('option');
                    option.value = classroom.id;
                    option.textContent = classroom.name;
                    select.appendChild(option);
                });
            }
        });
    }

    sanitizeErrorMessage(message) {
        if (typeof message !== 'string') {
            return 'Unknown error';
        }
        return message.replace(/<[^>]*>/g, '').substring(0, 200);
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

        const heading = document.createElement('h2');
        heading.style.cssText = 'margin: 0 0 1rem 0;';
        heading.textContent = 'Application Error';

        const messageP = document.createElement('p');
        messageP.style.cssText = 'margin: 0 0 1rem 0;';
        messageP.textContent = message;

        const reloadButton = document.createElement('button');
        reloadButton.style.cssText = `
            background: white; color: #dc2626; border: none; padding: 0.5rem 1rem;
            border-radius: 4px; cursor: pointer; font-weight: bold;
        `;
        reloadButton.textContent = 'Reload Page';
        reloadButton.onclick = () => window.location.reload();

        contentDiv.appendChild(heading);
        contentDiv.appendChild(messageP);
        contentDiv.appendChild(reloadButton);
        errorDiv.appendChild(contentDiv);
        document.body.appendChild(errorDiv);
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
}

// Request deduplication for async operations
const pendingRequests = new Map();

function createDedupedAsyncFunction(key, asyncFn) {
    return async function(...args) {
        const requestKey = `${key}_${JSON.stringify(args)}`;
        
        if (pendingRequests.has(requestKey)) {
            return pendingRequests.get(requestKey);
        }
        
        const promise = asyncFn.apply(this, args).finally(() => {
            pendingRequests.delete(requestKey);
        });
        
        pendingRequests.set(requestKey, promise);
        return promise;
    };
}

// Global Functions with Role-Based Access Control
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

async function viewStudentDetails(studentId) {
    if (!studentId) {
        console.error('Student ID is required');
        return;
    }

    try {
        // Check if user has permission to view student details
        const userContext = window.authManager?.currentUser;
        if (!userContext) {
            window.uiUtils?.showMessage('Please login to view student details', 'error');
            return;
        }

        if (window.studentManager && window.uiUtils) {
            const student = await window.studentManager.getStudent(studentId);
            window.uiUtils.showStudentModal(student);
        } else {
            window.uiUtils?.showMessage(`Viewing details for student ID: ${studentId}`, 'info');
        }
    } catch (error) {
        console.error('Error fetching student details:', error);
        window.uiUtils?.showMessage('Failed to load student details: ' + error.message, 'error');
    }
}

const loadClassroomForAttendance = createDedupedAsyncFunction('loadAttendance', async function() {
    const classroomSelect = document.getElementById('attendanceClassroom');
    const dateInput = document.getElementById('attendanceDate');
    
    if (!classroomSelect || !dateInput) {
        window.uiUtils?.showMessage('Required elements not found', 'error');
        return;
    }

    const classroomId = classroomSelect.value;
    const date = dateInput.value;
    
    if (!classroomId || !date) {
        window.uiUtils?.showMessage('Please select both a classroom and date', 'error');
        return;
    }

    // Check if user can access this classroom
    const userContext = getUserContext(window.authManager?.currentUser);
    if (!userContext) {
        window.uiUtils?.showMessage('Please login to access attendance', 'error');
        return;
    }

    if (!userContext.canAccessAll && window.dashboardManager) {
        const canAccess = window.dashboardManager.canAccessClassroom(parseInt(classroomId));
        if (!canAccess) {
            window.uiUtils?.showMessage('Access denied: You can only view attendance for your assigned classrooms', 'error');
            return;
        }
    }
    
    try {
        window.uiUtils?.showLoading('attendanceStudentsList', true);
        
        // Load existing attendance and students
        let attendanceData = [];
        let students = [];
        
        if (window.attendanceManager) {
            attendanceData = await window.attendanceManager.loadClassroomAttendance(classroomId, date);
        }
        
        if (window.dashboardManager) {
            students = await window.dashboardManager.loadStudents(classroomId);
        }
        
        // Display attendance list
        if (window.attendanceManager) {
            window.attendanceManager.displayAttendanceList(students, attendanceData, classroomId, date);
        }
        
    } catch (error) {
        console.error('Error loading attendance data:', error);
        window.uiUtils?.showMessage('Failed to load attendance data: ' + error.message, 'error');
    } finally {
        window.uiUtils?.showLoading('attendanceStudentsList', false);
    }
});

async function saveAttendance(classroomId, date) {
    try {
        // Validate user permissions
        const userContext = getUserContext(window.authManager?.currentUser);
        if (!userContext || !hasPermission(userContext.role, 'RECORD_ATTENDANCE')) {
            window.uiUtils?.showMessage('Access denied: You do not have permission to save attendance', 'error');
            return;
        }

        // Check classroom access for teachers
        if (!userContext.canAccessAll && window.dashboardManager) {
            const canAccess = window.dashboardManager.canAccessClassroom(parseInt(classroomId));
            if (!canAccess) {
                window.uiUtils?.showMessage('Access denied: You can only save attendance for your assigned classrooms', 'error');
                return;
            }
        }

        if (window.attendanceManager) {
            await window.attendanceManager.saveAttendance(classroomId, date);
        }
    } catch (error) {
        console.error('Error saving attendance:', error);
        window.uiUtils?.showMessage('Failed to save attendance: ' + error.message, 'error');
    }
}

function clearAttendance() {
    try {
        // Check basic permissions
        const userContext = getUserContext(window.authManager?.currentUser);
        if (!userContext || !hasPermission(userContext.role, 'RECORD_ATTENDANCE')) {
            window.uiUtils?.showMessage('Access denied: You do not have permission to modify attendance', 'error');
            return;
        }

        if (window.attendanceManager) {
            window.attendanceManager.clearAttendance();
        }
    } catch (error) {
        console.error('Error clearing attendance:', error);
        window.uiUtils?.showMessage('Failed to clear attendance', 'error');
    }
}

const generateReports = createDedupedAsyncFunction('generateReports', async function() {
    const classroomSelect = document.getElementById('reportClassroom');
    const periodSelect = document.getElementById('reportPeriod');
    
    if (!classroomSelect || !periodSelect) {
        window.uiUtils?.showMessage('Required elements not found', 'error');
        return;
    }

    const classroomId = classroomSelect.value;
    const periodId = periodSelect.value;
    
    if (!classroomId || !periodId) {
        window.uiUtils?.showMessage('Please select both a classroom and evaluation period', 'error');
        return;
    }

    // Validate user permissions
    const userContext = getUserContext(window.authManager?.currentUser);
    if (!userContext || !hasPermission(userContext.role, 'GENERATE_REPORTS')) {
        window.uiUtils?.showMessage('Access denied: You do not have permission to generate reports', 'error');
        return;
    }

    // Check classroom access for teachers
    if (!userContext.canAccessAll && window.dashboardManager) {
        const canAccess = window.dashboardManager.canAccessClassroom(parseInt(classroomId));
        if (!canAccess) {
            window.uiUtils?.showMessage('Access denied: You can only generate reports for your assigned classrooms', 'error');
            return;
        }
    }
    
    try {
        window.uiUtils?.showLoading('reportsList', true);
        
        let reports = [];
        if (window.gradesReportsManager) {
            reports = await window.gradesReportsManager.loadClassroomReports(classroomId, periodId);
        }
        
        if (window.gradesReportsManager) {
            window.gradesReportsManager.displayReportsList(reports, classroomId, periodId);
        }
        
    } catch (error) {
        console.error('Error generating reports:', error);
        window.uiUtils?.showMessage('Failed to generate reports: ' + error.message, 'error');
    } finally {
        window.uiUtils?.showLoading('reportsList', false);
    }
});

function downloadReport(reportId) {
    try {
        // Validate permissions
        const userContext = getUserContext(window.authManager?.currentUser);
        if (!userContext || !hasPermission(userContext.role, 'VIEW_REPORTS')) {
            window.uiUtils?.showMessage('Access denied: You do not have permission to download reports', 'error');
            return;
        }

        if (window.gradesReportsManager) {
            window.gradesReportsManager.downloadReport(reportId);
        } else {
            console.log('Downloading report:', reportId);
            window.uiUtils?.showMessage('Report download would start here. Report ID: ' + reportId, 'info');
        }
    } catch (error) {
        console.error('Error downloading report:', error);
        window.uiUtils?.showMessage('Failed to download report', 'error');
    }
}

function handleFileImport(event, type) {
    try {
        // Validate permissions based on import type
        const userContext = getUserContext(window.authManager?.currentUser);
        if (!userContext) {
            window.uiUtils?.showMessage('Please login to import files', 'error');
            return;
        }

        const importPermissions = {
            'students': 'CREATE_STUDENTS',
            'grades': 'ADD_GRADES',
            'attendance': 'RECORD_ATTENDANCE'
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
        // Basic permission check - teachers and admins can download templates
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

async function handleGradeSubmission(event) {
    try {
        // Validate grade submission permissions
        const userContext = getUserContext(window.authManager?.currentUser);
        if (!userContext || !hasPermission(userContext.role, 'ADD_GRADES')) {
            window.uiUtils?.showMessage('Access denied: You do not have permission to submit grades', 'error');
            return;
        }

        if (window.gradesReportsManager) {
            await window.gradesReportsManager.handleGradeSubmission(event);
        } else {
            console.error('Grades reports manager not initialized');
        }
    } catch (error) {
        console.error('Error handling grade submission:', error);
        window.uiUtils?.showMessage('Failed to submit grades: ' + error.message, 'error');
    }
}

function closeGradeForm() {
    try {
        if (window.gradesReportsManager) {
            window.gradesReportsManager.closeGradeForm();
        }
    } catch (error) {
        console.error('Error closing grade form:', error);
    }
}

// Protect against redefinition
if (!window.schoolAppGlobalsInitialized) {
    window.showSection = showSection;
    window.logout = logout;
    window.viewStudentDetails = viewStudentDetails;
    window.loadClassroomForAttendance = loadClassroomForAttendance;
    window.saveAttendance = saveAttendance;
    window.clearAttendance = clearAttendance;
    window.generateReports = generateReports;
    window.downloadReport = downloadReport;
    window.handleFileImport = handleFileImport;
    window.downloadTemplate = downloadTemplate;
    window.handleGradeSubmission = handleGradeSubmission;
    window.closeGradeForm = closeGradeForm;
    window.schoolAppGlobalsInitialized = true;
}

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const app = new SchoolManagementApp();
        window.app = app;
        await app.initialize();
    } catch (error) {
        console.error('Failed to initialize application:', error);
        
        // Show user-friendly error message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #fee; border: 1px solid #fcc; color: #c33;
            padding: 1rem; border-radius: 4px; max-width: 400px; text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        const message = document.createElement('p');
        message.textContent = 'Failed to start the application. Please refresh the page or contact support.';
        
        const reloadButton = document.createElement('button');
        reloadButton.textContent = 'Reload Page';
        reloadButton.style.cssText = `
            background: #c33; color: white; border: none; padding: 0.5rem 1rem;
            border-radius: 4px; cursor: pointer; margin-top: 0.5rem;
        `;
        reloadButton.onclick = () => window.location.reload();
        
        errorDiv.appendChild(message);
        errorDiv.appendChild(reloadButton);
        document.body.appendChild(errorDiv);
    }
});

export { SchoolManagementApp };