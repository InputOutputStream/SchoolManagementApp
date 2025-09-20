// UI Utilities and Helper Functions - Updated for new HTML structure
export class UIUtils {
    constructor() {
        this.searchTimeout = null;
        this.setupKeyboardShortcuts();
        this.setupModalHandlers();
        this.setupNavigation();
    }

    // Updated section navigation for new structure
    showSection(sectionName) {
        if (!sectionName) {
            console.error('Section name is required');
            return;
        }

        // Updated content sections list to match new HTML structure
        const contents = [
            'dashboardContent',
            'teachersContent',
            'studentsContent', 
            'teachers-attendanceContent',
            'students-attendanceContent',
            'evaluationsContent',
            'reportsContent',
            'settingsContent'
        ];
        
        contents.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.add('hidden');
            }
        });

        // Show selected section
        const targetContent = document.getElementById(sectionName + 'Content');
        if (targetContent) {
            targetContent.classList.remove('hidden');
            
            // Load section-specific data
            this.loadSectionData(sectionName);
        } else {
            console.warn(`Section content not found: ${sectionName}Content`);
        }

        // Update sidebar active state
        this.updateSidebarActiveState(sectionName);
    }

    loadSectionData(sectionName) {
        const dashboardManager = window.dashboardManager;
        if (!dashboardManager) return;

        switch(sectionName) {
            case 'dashboard':
                dashboardManager.loadDashboardData().catch(console.error);
                break;
                
            case 'teachers':
                this.loadTeachersSection(dashboardManager);
                break;
                
            case 'students':
                this.loadStudentsSection(dashboardManager);
                break;
                
            case 'teachers-attendance':
                this.loadTeacherAttendanceSection();
                break;
                
            case 'students-attendance':
                this.loadStudentAttendanceSection();
                break;
                
            case 'evaluations':
                this.loadEvaluationsSection();
                break;
                
            case 'reports':
                this.loadReportsSection();
                break;
                
            case 'settings':
                this.loadSettingsSection();
                break;
                
            default:
                console.log(`No special data loading needed for section: ${sectionName}`);
        }
    }

    async loadTeachersSection(dashboardManager) {
        try {
            const authManager = window.authManager;
            if (authManager?.currentUser?.role === 'admin') {
                await dashboardManager.loadTeachersList();
                await this.loadTeacherOptions();
            }
        } catch (error) {
            console.error('Error loading teachers section:', error);
            this.showMessage('Failed to load teachers data', 'error');
        }
    }

    async loadStudentsSection(dashboardManager) {
        try {
            await dashboardManager.loadStudents();
            await dashboardManager.loadClassrooms();
        } catch (error) {
            console.error('Error loading students section:', error);
            this.showMessage('Failed to load students data', 'error');
        }
    }

    async loadTeacherAttendanceSection() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const teacherAttendanceDateInput = document.getElementById('teacherAttendanceDate');
            if (teacherAttendanceDateInput && !teacherAttendanceDateInput.value) {
                teacherAttendanceDateInput.value = today;
            }
            
            await this.loadTeacherOptions();
        } catch (error) {
            console.error('Error loading teacher attendance section:', error);
        }
    }

    async loadStudentAttendanceSection() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const studentAttendanceDateInput = document.getElementById('studentAttendanceDate');
            if (studentAttendanceDateInput && !studentAttendanceDateInput.value) {
                studentAttendanceDateInput.value = today;
            }
            
            if (window.dashboardManager) {
                await window.dashboardManager.loadClassrooms();
            }
        } catch (error) {
            console.error('Error loading student attendance section:', error);
        }
    }

    async loadEvaluationsSection() {
        try {
            await Promise.all([
                this.loadClassroomOptions(),
                this.loadSubjectOptions(),
                this.loadEvaluationPeriods(),
                this.loadEvaluationsList()
            ]);
        } catch (error) {
            console.error('Error loading evaluations section:', error);
            this.showMessage('Failed to load evaluations data', 'error');
        }
    }

    async loadReportsSection() {
        try {
            await Promise.all([
                this.loadClassroomOptions(),
                this.loadEvaluationPeriods(),
                this.loadStudentOptions()
            ]);
        } catch (error) {
            console.error('Error loading reports section:', error);
            this.showMessage('Failed to load reports data', 'error');
        }
    }

    async loadSettingsSection() {
        try {
            const authManager = window.authManager;
            if (authManager?.currentUser?.role === 'admin') {
                await Promise.all([
                    this.loadClassroomsList(),
                    this.loadSubjectsList(),
                    this.loadTeacherOptions(),
                    this.loadAssignmentsList()
                ]);
            }
        } catch (error) {
            console.error('Error loading settings section:', error);
            this.showMessage('Failed to load settings data', 'error');
        }
    }

    // Helper methods for loading options/data - updated for new HTML structure
    async loadTeacherOptions() {
        if (!window.authManager?.apiClient) return;
        
        try {
            const teachers = await window.authManager.apiClient.get('/admin/teachers');
            this.populateSelect('teacherSelect', teachers, 'id', teacher => 
                `${teacher.user?.first_name} ${teacher.user?.last_name} (${teacher.employee_number})`
            );
            this.populateSelect('assignment-teacher', teachers, 'id', teacher => 
                `${teacher.user?.first_name} ${teacher.user?.last_name}`
            );
        } catch (error) {
            console.error('Error loading teacher options:', error);
        }
    }

    async loadClassroomOptions() {
        if (!window.dashboardManager) return;
        
        try {
            const classrooms = await window.dashboardManager.loadClassrooms();
            // Updated to match new HTML element IDs
            this.populateSelect('evaluation-classroom', classrooms, 'id', 'name');
            this.populateSelect('assignment-classroom', classrooms, 'id', 'name');
            this.populateSelect('student-classroom', classrooms, 'id', 'name');
            this.populateSelect('reportClassroom', classrooms, 'id', 'name');
            this.populateSelect('evaluationsClassroomFilter', classrooms, 'id', 'name');
        } catch (error) {
            console.error('Error loading classroom options:', error);
        }
    }

    async loadSubjectOptions() {
        if (!window.dashboardManager) return;
        
        try {
            const subjects = await window.dashboardManager.loadSubjects();
            this.populateSelect('evaluation-subject', subjects, 'id', 'name');
            this.populateSelect('assignment-subject', subjects, 'id', 'name');
        } catch (error) {
            console.error('Error loading subject options:', error);
        }
    }

    async loadStudentOptions() {
        if (!window.dashboardManager) return;
        
        try {
            const students = await window.dashboardManager.loadStudents();
            this.populateSelect('grade-student', students, 'id', student => 
                `${student.user?.first_name} ${student.user?.last_name} (${student.student_number})`
            );
            this.populateSelect('reportStudent', students, 'id', student => 
                `${student.user?.first_name} ${student.user?.last_name}`
            );
        } catch (error) {
            console.error('Error loading student options:', error);
        }
    }

    async loadEvaluationPeriods() {
        if (!window.authManager?.apiClient) return;
        
        try {
            const periods = await window.authManager.apiClient.get('/evaluation-periods');
            this.populateSelect('reportPeriod', periods, 'id', 'name');
        } catch (error) {
            console.error('Error loading evaluation periods:', error);
        }
    }

    async loadEvaluationsList() {
        const list = document.getElementById('evaluationsList');
        if (!list) return;

        try {
            const evaluations = await window.authManager.apiClient.get('/evaluations');
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
                    <p>${evaluation.type} - ${evaluation.subject?.name} (${evaluation.classroom?.name})</p>
                    <small>${evaluation.evaluation_date}</small>
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

    async loadClassroomsList() {
        const list = document.getElementById('classroomsList');
        if (!list) return;

        try {
            const classrooms = await window.authManager.apiClient.get('/admin/classrooms');
            list.innerHTML = this.formatClassroomsList(classrooms);
        } catch (error) {
            console.error('Error loading classrooms:', error);
            list.innerHTML = '<p class="no-data">Failed to load classrooms</p>';
        }
    }

    formatClassroomsList(classrooms) {
        if (!Array.isArray(classrooms) || classrooms.length === 0) {
            return '<p class="no-data">No classrooms found</p>';
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Grade Level</th>
                        <th>Capacity</th>
                        <th>Head Teacher</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${classrooms.map(classroom => `
                        <tr>
                            <td>${this.escapeHtml(classroom.name)}</td>
                            <td>${this.escapeHtml(classroom.level)}</td>
                            <td>${classroom.max_students || 'N/A'}</td>
                            <td>${classroom.head_teacher?.name || 'Not assigned'}</td>
                            <td>
                                <button class="btn-small btn-secondary" onclick="editClassroom(${classroom.id})">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async loadSubjectsList() {
        const list = document.getElementById('subjectsList');
        if (!list) return;

        try {
            const subjects = await window.authManager.apiClient.get('/admin/subjects');
            list.innerHTML = this.formatSubjectsList(subjects);
        } catch (error) {
            console.error('Error loading subjects:', error);
            list.innerHTML = '<p class="no-data">Failed to load subjects</p>';
        }
    }

    formatSubjectsList(subjects) {
        if (!Array.isArray(subjects) || subjects.length === 0) {
            return '<p class="no-data">No subjects found</p>';
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Code</th>
                        <th>Coefficient</th>
                        <th>Description</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${subjects.map(subject => `
                        <tr>
                            <td>${this.escapeHtml(subject.name)}</td>
                            <td>${this.escapeHtml(subject.code)}</td>
                            <td>${subject.coefficient}</td>
                            <td>${this.escapeHtml(subject.description || 'N/A')}</td>
                            <td>
                                <button class="btn-small btn-secondary" onclick="editSubject(${subject.id})">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async loadAssignmentsList() {
        const list = document.getElementById('assignmentsList');
        if (!list) return;

        try {
            const assignments = await window.authManager.apiClient.get('/admin/assignments');
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
    
    updateSidebarActiveState(sectionName) {
        // Reset all links
        document.querySelectorAll('.sidebar a.nav-link').forEach(link => {
            link.classList.remove('active');
            link.setAttribute('aria-current', 'false');
        });
        
        // Find and activate the correct link using data-section attribute
        const activeLink = document.querySelector(`.sidebar a[data-section="${sectionName}"]`);
        
        if (activeLink) {
            activeLink.classList.add('active');
            activeLink.setAttribute('aria-current', 'page');
        } else {
            console.warn(`Sidebar link not found for section: ${sectionName}`);
        }
    }

    // Search functionality - updated to work with new structure
    initializeSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) {
            console.warn('Search input not found');
            return;
        }
        
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        searchInput.addEventListener('input', (e) => {
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }
            
            this.searchTimeout = setTimeout(async () => {
                const query = e.target.value.trim().toLowerCase();
                
                if (query.length > 2 && window.dashboardManager) {
                    try {
                        const students = await window.dashboardManager.loadStudents();
                        const filteredStudents = this.filterStudents(students, query);
                        window.dashboardManager.displayStudentsList(filteredStudents);
                    } catch (error) {
                        console.error('Search error:', error);
                        this.showMessage('Search failed', 'error');
                    }
                } else if (query.length === 0) {
                    window.dashboardManager.loadStudents().catch(error => {
                        console.error('Error loading students:', error);
                        this.showMessage('Failed to load students', 'error');
                    });
                }
            }, 300);
        });
    }

    filterStudents(students, query) {
        if (!Array.isArray(students)) return [];
        
        return students.filter(student => {
            const studentNumber = (student.student_number || '').toLowerCase();
            const firstName = (student.user?.first_name || '').toLowerCase();
            const lastName = (student.user?.last_name || '').toLowerCase();
            const fullName = `${firstName} ${lastName}`.trim();
            const classroom = (student.classroom?.name || '').toLowerCase();
            
            return studentNumber.includes(query) ||
                   firstName.includes(query) ||
                   lastName.includes(query) ||
                   fullName.includes(query) ||
                   classroom.includes(query);
        });
    }

    // Modal Management
    setupModalHandlers() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close') || e.target.closest('.close')) {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.closeModal(modal);
                }
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal');
                modals.forEach(modal => {
                    if (modal.style.display === 'block') {
                        this.closeModal(modal);
                    }
                });
            }
        });
    }

    setupNavigation() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) {
            console.warn('Sidebar not found');
            return;
        }

        sidebar.addEventListener('click', (e) => {
            const navLink = e.target.closest('.nav-link');
            if (!navLink) return;

            e.preventDefault();
            
            const sectionName = navLink.getAttribute('data-section');
            if (sectionName) {
                this.showSection(sectionName);
            }
        });

        console.log('Navigation setup completed');
    }

    showModal(content, title = '') {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', title ? 'modalTitle' : '');
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    ${title ? `<h2 id="modalTitle">${title}</h2>` : ''}
                    <button class="close" aria-label="Close dialog">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        const closeButton = modal.querySelector('.close');
        if (closeButton) {
            closeButton.focus();
        }
        
        document.body.style.overflow = 'hidden';
        
        return modal;
    }

    closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }

    // Student Details Modal - updated for new structure
    showStudentModal(student) {
        if (!student) {
            console.error('Student data is required');
            return;
        }

        const content = `
            <div class="student-details">
                <div class="detail-row">
                    <label>Name:</label>
                    <span>${this.escapeHtml(student.user?.first_name || 'N/A')} ${this.escapeHtml(student.user?.last_name || 'N/A')}</span>
                </div>
                <div class="detail-row">
                    <label>Student ID:</label>
                    <span>${this.escapeHtml(student.student_number || 'N/A')}</span>
                </div>
                <div class="detail-row">
                    <label>Email:</label>
                    <span>${this.escapeHtml(student.user?.email || 'N/A')}</span>
                </div>
                <div class="detail-row">
                    <label>Classroom:</label>
                    <span>${this.escapeHtml(student.classroom?.name || 'Not assigned')}</span>
                </div>
                <div class="detail-row">
                    <label>Date of Birth:</label>
                    <span>${student.date_of_birth ? this.formatDate(student.date_of_birth) : 'Not specified'}</span>
                </div>
                <div class="detail-row">
                    <label>Phone:</label>
                    <span>${this.escapeHtml(student.phone || 'Not specified')}</span>
                </div>
                <div class="detail-row">
                    <label>Address:</label>
                    <span>${this.escapeHtml(student.address || 'Not specified')}</span>
                </div>
                <div class="detail-row">
                    <label>Parent Name:</label>
                    <span>${this.escapeHtml(student.parent_name || 'Not specified')}</span>
                </div>
                <div class="detail-row">
                    <label>Parent Email:</label>
                    <span>${this.escapeHtml(student.parent_email || 'Not specified')}</span>
                </div>
                <div class="detail-row">
                    <label>Parent Phone:</label>
                    <span>${this.escapeHtml(student.parent_phone || 'Not specified')}</span>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn" onclick="window.uiUtils.closeModal(this.closest('.modal'))">Close</button>
            </div>
        `;

        return this.showModal(content, 'Student Details');
    }

    // Interactive features
    addInteractiveFeatures() {
        try {
            document.querySelectorAll('.stat-card').forEach(card => {
                card.addEventListener('click', function() {
                    this.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        this.style.transform = '';
                    }, 150);
                });
            });

            document.querySelectorAll('.notice-item').forEach(item => {
                item.addEventListener('click', function() {
                    const notice = this.textContent.trim();
                    if (notice) {
                        window.uiUtils.showMessage(notice, 'info', 5000);
                    }
                });
            });

            console.log('Interactive features added successfully');
            
        } catch (error) {
            console.error('Error adding interactive features:', error);
        }
    }

    // Keyboard shortcuts - updated for new sections
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.focus();
                }
            }
            
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.showSection('dashboard');
                        break;
                    case '2':
                        e.preventDefault();
                        this.showSection('teachers');
                        break;
                    case '3':
                        e.preventDefault();
                        this.showSection('students');
                        break;
                    case '4':
                        e.preventDefault();
                        this.showSection('students-attendance');
                        break;
                    case '5':
                        e.preventDefault();
                        this.showSection('evaluations');
                        break;
                    case '6':
                        e.preventDefault();
                        this.showSection('reports');
                        break;
                    case '7':
                        e.preventDefault();
                        this.showSection('settings');
                        break;
                }
            }
        });
    }

    // Utility method to populate select elements
    populateSelect(selectId, items, valueField, textField) {
        const select = document.getElementById(selectId);
        if (!select || !Array.isArray(items)) return;

        const firstOption = select.querySelector('option');
        select.innerHTML = '';
        if (firstOption) {
            select.appendChild(firstOption);
        }

        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueField];
            
            if (typeof textField === 'function') {
                option.textContent = textField(item);
            } else {
                option.textContent = item[textField];
            }
            
            select.appendChild(option);
        });
    }

    // Form validation helpers
    validateForm(form, rules = {}) {
        const errors = [];
        const formData = new FormData(form);
        
        for (const [field, rule] of Object.entries(rules)) {
            const value = formData.get(field);
            
            if (rule.required && (!value || value.toString().trim() === '')) {
                errors.push(`${rule.label || field} is required`);
                continue;
            }
            
            if (value && rule.type === 'email' && !this.isValidEmail(value)) {
                errors.push(`${rule.label || field} must be a valid email address`);
            }
            
            if (value && rule.minLength && value.toString().length < rule.minLength) {
                errors.push(`${rule.label || field} must be at least ${rule.minLength} characters`);
            }
            
            if (value && rule.maxLength && value.toString().length > rule.maxLength) {
                errors.push(`${rule.label || field} must be no more than ${rule.maxLength} characters`);
            }
            
            if (value && rule.pattern && !rule.pattern.test(value)) {
                errors.push(`${rule.label || field} format is invalid`);
            }
        }
        
        return errors;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Utility methods
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

    showMessage(message, type = 'info', duration = 5000) {
        let messageContainer = document.getElementById('messageContainer');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'messageContainer';
            messageContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            `;
            document.body.appendChild(messageContainer);
        }

        const messageElement = document.createElement('div');
        messageElement.className = `alert alert-${type}`;
        messageElement.setAttribute('role', 'alert');
        messageElement.setAttribute('aria-live', 'polite');
        messageElement.style.cssText = `
            margin-bottom: 10px;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        messageElement.textContent = message;

        const colors = {
            success: { bg: '#d4edda', color: '#155724', border: '#c3e6cb' },
            error: { bg: '#f8d7da', color: '#721c24', border: '#f5c6cb' },
            warning: { bg: '#fff3cd', color: '#856404', border: '#ffeaa7' },
            info: { bg: '#d1ecf1', color: '#0c5460', border: '#bee5eb' }
        };

        const colorScheme = colors[type] || colors.info;
        messageElement.style.backgroundColor = colorScheme.bg;
        messageElement.style.color = colorScheme.color;
        messageElement.style.border = `1px solid ${colorScheme.border}`;

        messageContainer.appendChild(messageElement);

        setTimeout(() => {
            messageElement.style.opacity = '1';
        }, 10);

        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.style.opacity = '0';
                setTimeout(() => {
                    if (messageElement.parentNode) {
                        messageContainer.removeChild(messageElement);
                    }
                }, 300);
            }
        }, duration);
    }

    showLoading(elementId, show = true) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (show) {
            element.style.position = 'relative';
            element.style.pointerEvents = 'none';
            
            const loader = document.createElement('div');
            loader.className = 'loading-overlay';
            loader.innerHTML = '<div class="loading"></div>';
            loader.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255,255,255,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            `;
            element.appendChild(loader);
        } else {
            element.style.pointerEvents = '';
            const loader = element.querySelector('.loading-overlay');
            if (loader) {
                loader.remove();
            }
        }
    }

    // Confirmation dialogs
    showConfirmDialog(message, onConfirm, onCancel = null) {
        const content = `
            <p>${this.escapeHtml(message)}</p>
            <div class="modal-actions">
                <button class="btn confirm-btn">Confirm</button>
                <button class="btn btn-secondary cancel-btn">Cancel</button>
            </div>
        `;

        const modal = this.showModal(content, 'Confirm Action');
        
        const confirmBtn = modal.querySelector('.confirm-btn');
        confirmBtn.addEventListener('click', () => {
            this.closeModal(modal);
            if (onConfirm) onConfirm();
        });

        const cancelBtn = modal.querySelector('.cancel-btn');
        cancelBtn.addEventListener('click', () => {
            this.closeModal(modal);
            if (onCancel) onCancel();
        });
    }

    // XSS protection
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

}