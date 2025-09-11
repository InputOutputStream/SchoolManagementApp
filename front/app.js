import { AuthManager } from './authManager.js';
import { DashboardManager } from './dashboardManager.js';
import { StudentManager } from './studentManager.js';
import { AttendanceManager } from './attendanceManager.js';
import { GradesReportsManager } from './gradesReportsManager.js';
import { FileImportManager } from './fileImportManager.js';
import { UIUtils } from './uiUtils.js';
import { API_CONFIG } from './config.js';


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
        // FIXED: Track global references for cleanup
        this.globalReferences = new Set();
    }

    async initialize() {
        if (this.isInitialized) {
            console.warn('Application already initialized');
            return;
        }

        try {
            console.log('Initializing School Management System...');

            // FIXED: Validate module imports
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

            // FIXED: Make managers globally accessible with cleanup tracking
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

            this.isInitialized = true;
            console.log('Application initialized successfully');

        } catch (error) {
            console.error('Error initializing application:', error);
            this.showCriticalError('Failed to initialize application: ' + this.sanitizeErrorMessage(error.message));
        }
    }

    // FIXED: Add method to track global references
    setGlobalReference(name, value) {
        window[name] = value;
        this.globalReferences.add(name);
    }

    // FIXED: Add cleanup method
    destroy() {
        // Remove global references
        this.globalReferences.forEach(refName => {
            delete window[refName];
        });
        this.globalReferences.clear();
        
        // Remove event listeners
        window.removeEventListener('resize', this.resizeHandler);
        window.removeEventListener('error', this.errorHandler);
        window.removeEventListener('unhandledrejection', this.rejectionHandler);
        document.removeEventListener('visibilitychange', this.visibilityHandler);
        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
        
        this.isInitialized = false;
    }

    initializeUI() {
        // FIXED: Add null checks with consistent pattern
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
        // Student form validation
        const studentsClassroom = document.getElementById('studentsClassroom');
        if (studentsClassroom) {
            studentsClassroom.addEventListener('change', () => {
                this.dashboardManager?.loadStudents(studentsClassroom.value).catch(console.error);
            });
        }
    }

    setupResponsiveHandlers() {
        // FIXED: Store handler reference for cleanup
        this.resizeHandler = this.debounce(() => {
            if (this.dashboardManager?.attendanceChartInstance) {
                this.dashboardManager.attendanceChartInstance.resize();
            }
        }, 250);
        
        window.addEventListener('resize', this.resizeHandler);
    }

    setupGlobalHandlers() {
        // FIXED: Store handler references for cleanup
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

    async loadClassrooms() {
        try {
            const classrooms = await this.authManager?.apiCall('GET', API_CONFIG.endpoints.admin.classrooms);
            this.populateClassroomSelects(classrooms);
            return Array.isArray(classrooms) ? classrooms : [];
        } catch (error) {
            console.error('Error loading classrooms:', error);
            // Use fallback classrooms
            const fallbackClassrooms = [
                { id: 1, name: 'Grade 10A', grade_level: '10' },
                { id: 2, name: 'Grade 10B', grade_level: '10' },
                { id: 3, name: 'Grade 11A', grade_level: '11' },
            ];
            this.populateClassroomSelects(fallbackClassrooms);
            return fallbackClassrooms;
        }
    }

    handleGlobalError(error) {
        // Don't show error messages for network errors during development
        if (error?.message?.includes('Network error')) {
            return;
        }

        // FIXED: Use consistent optional chaining
        this.uiUtils?.showMessage('An unexpected error occurred. Please try again.', 'error');
    }

    handlePageHidden() {
        console.log('Page hidden - could implement session management');
    }

    handlePageVisible() {
        console.log('Page visible - could refresh session');
    }

    // FIXED: Corrected form validation logic
    hasUnsavedChanges() {
        const forms = document.querySelectorAll('form');
        for (const form of forms) {
            // Check if form has been modified
            const inputs = form.querySelectorAll('input, textarea, select');
            for (const input of inputs) {
                if (input.defaultValue !== input.value || input.defaultChecked !== input.checked) {
                    return true; // Found unsaved changes
                }
            }
            
            // Check for validation errors (indicates user interaction)
            if (form.checkValidity && !form.checkValidity()) {
                // Form has validation errors - check if it was modified
                const modifiedInputs = Array.from(inputs).some(input => 
                    input.defaultValue !== input.value || input.defaultChecked !== input.checked
                );
                if (modifiedInputs) {
                    return true; // Has validation errors AND modifications
                }
            }
        }
        return false;
    }

    populateClassroomSelects(classrooms) {
        const selects = [
            'attendanceClassroom',
            'studentsClassroom', 
            'reportClassroom'
        ];

        // FIXED: Cache DOM references for performance
        const selectElements = {};
        selects.forEach(selectId => {
            selectElements[selectId] = document.getElementById(selectId);
        });

        Object.values(selectElements).forEach(select => {
            if (select) {
                // Clear existing options except the first one
                const firstOption = select.querySelector('option');
                select.innerHTML = '';
                if (firstOption) {
                    select.appendChild(firstOption);
                }

                // Add classroom options
                classrooms?.forEach(classroom => {
                    const option = document.createElement('option');
                    option.value = classroom.id;
                    option.textContent = classroom.name;
                    select.appendChild(option);
                });
            }
        });
    }

    // FIXED: Sanitize error messages to prevent XSS
    sanitizeErrorMessage(message) {
        if (typeof message !== 'string') {
            return 'Unknown error';
        }
        // Remove HTML tags and limit length
        return message.replace(/<[^>]*>/g, '').substring(0, 200);
    }

    // FIXED: Use textContent instead of innerHTML to prevent XSS
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
        messageP.textContent = message; // FIXED: Use textContent instead of innerHTML

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

    // Utility method for debouncing
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

//***********************************************************************************************************

// FIXED: Add request deduplication for async operations
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

// Global Functions (for HTML onclick handlers) - FIXED: Add comprehensive error handling
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

// FIXED: Add comprehensive error handling to async function
async function viewStudentDetails(studentId) {
    if (!studentId) {
        console.error('Student ID is required');
        return;
    }

    try {
        if (window.studentManager && window.uiUtils) {
            const student = await window.studentManager.getStudent(studentId);
            window.uiUtils.showStudentModal(student);
        } else {
            window.uiUtils?.showMessage(`Viewing details for student ID: ${studentId}`, 'info');
        }
    } catch (error) {
        console.error('Error fetching student details:', error);
        window.uiUtils?.showMessage('Failed to load student details', 'error');
    }
}

// FIXED: Add deduplication and comprehensive error handling
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
    
    try {
        window.uiUtils?.showLoading('attendanceStudentsList', true);
        
        // Load existing attendance or create new attendance sheet
        let attendanceData = [];
        if (window.attendanceManager) {
            attendanceData = await window.attendanceManager.loadClassroomAttendance(classroomId, date);
        }
        
        // Load students for the classroom
        const students = await window.dashboardManager?.loadStudents(classroomId);
        
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

// FIXED: Add comprehensive error handling
async function saveAttendance(classroomId, date) {
    try {
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
        if (window.attendanceManager) {
            window.attendanceManager.clearAttendance();
        }
    } catch (error) {
        console.error('Error clearing attendance:', error);
        window.uiUtils?.showMessage('Failed to clear attendance', 'error');
    }
}

// FIXED: Add deduplication and comprehensive error handling
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

// FIXED: Add comprehensive error handling
async function handleGradeSubmission(event) {
    try {
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

// FIXED: Protect against redefinition
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

// FIXED: Add comprehensive error handling to initialization
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

// Export for module usage
export { SchoolManagementApp };