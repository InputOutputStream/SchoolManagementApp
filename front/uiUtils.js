// UI Utilities and Helper Functions
export class UIUtils {
    constructor() {
        this.searchTimeout = null;
        this.setupKeyboardShortcuts();
        this.setupModalHandlers();
    }

    // Section Navigation
    showSection(sectionName) {
        if (!sectionName) {
            console.error('Section name is required');
            return;
        }

        // Hide all content sections
        const contents = [
            'dashboardContent', 
            'attendanceContent', 
            'studentsContent', 
            'reportsContent', 
            'teachersContent', 
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

    updateSidebarActiveState(sectionName) {
        // Reset all links
        document.querySelectorAll('.sidebar a').forEach(link => {
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

    loadSectionData(sectionName) {
        const dashboardManager = window.dashboardManager;
        if (!dashboardManager) return;

        switch(sectionName) {
            case 'students':
                this.loadStudentsSection(dashboardManager);
                break;
            case 'teachers':
                this.loadTeachersSection(dashboardManager);
                break;
            case 'attendance':
                this.loadAttendanceSection(dashboardManager);
                break;
            case 'reports':
                this.loadReportsSection(dashboardManager);
                break;
            case 'dashboard':
                dashboardManager.loadDashboardData().catch(console.error);
                break;
            default:
                console.log(`No special data loading needed for section: ${sectionName}`);
        }
    }

    async loadStudentsSection(dashboardManager) {
        try {
            await dashboardManager.loadStudents();
        } catch (error) {
            console.error('Error loading students section:', error);
            this.showMessage('Failed to load students data', 'error');
        }
    }

    async loadTeachersSection(dashboardManager) {
        try {
            const authManager = window.authManager;
            if (authManager?.currentUser?.role === 'admin') {
                await dashboardManager.loadTeachersList();
            }
        } catch (error) {
            console.error('Error loading teachers section:', error);
            this.showMessage('Failed to load teachers data', 'error');
        }
    }

    async loadAttendanceSection(dashboardManager) {
        try {
            // Set current date for attendance
            const today = new Date().toISOString().split('T')[0];
            const attendanceDateInput = document.getElementById('attendanceDate');
            if (attendanceDateInput && !attendanceDateInput.value) {
                attendanceDateInput.value = today;
            }
        } catch (error) {
            console.error('Error loading attendance section:', error);
        }
    }

    async loadReportsSection(dashboardManager) {
        try {
            // Load evaluation periods if available
            await this.loadEvaluationPeriods();
        } catch (error) {
            console.error('Error loading reports section:', error);
            this.showMessage('Failed to load reports data', 'error');
        }
    }

    async loadEvaluationPeriods() {
        // This would load evaluation periods from the API
        // For now, we'll populate with default values
        const reportPeriodSelect = document.getElementById('reportPeriod');
        if (reportPeriodSelect && reportPeriodSelect.children.length <= 1) {
            const periods = [
                { id: 1, name: 'First Trimester 2024' },
                { id: 2, name: 'Second Trimester 2024' },
                { id: 3, name: 'Third Trimester 2024' }
            ];

            // Clear existing options except the first one
            const firstOption = reportPeriodSelect.querySelector('option');
            reportPeriodSelect.innerHTML = '';
            if (firstOption) {
                reportPeriodSelect.appendChild(firstOption);
            }

            periods.forEach(period => {
                const option = document.createElement('option');
                option.value = period.id;
                option.textContent = period.name;
                reportPeriodSelect.appendChild(option);
            });
        }
    }

    // Search functionality
    initializeSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) {
            console.warn('Search input not found');
            return;
        }
        
        // Clear any existing timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        searchInput.addEventListener('input', (e) => {
            // Clear previous timeout
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }
            
            // Debounce search to avoid too many operations
            this.searchTimeout = setTimeout(async () => {
                const query = e.target.value.trim().toLowerCase();
                
                if (query.length > 2 && window.dashboardManager) {
                    try {
                        // Search students by ID or name
                        const students = await window.dashboardManager.loadStudents();
                        const filteredStudents = this.filterStudents(students, query);
                        
                        // Display filtered results
                        window.dashboardManager.displayStudentsList(filteredStudents);
                    } catch (error) {
                        console.error('Search error:', error);
                        this.showMessage('Search failed', 'error');
                    }
                } else if (query.length === 0) {
                    // Show all students when search is cleared
                    window.dashboardManager.loadStudents().catch(error => {
                        console.error('Error loading students:', error);
                        this.showMessage('Failed to load students', 'error');
                    });
                }
            }, 300); // 300ms debounce
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
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target);
            }
        });

        // Close modals with close button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close') || e.target.closest('.close')) {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.closeModal(modal);
                }
            }
        });

        // Close modals with Escape key
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
        
        // Focus management for accessibility
        const closeButton = modal.querySelector('.close');
        if (closeButton) {
            closeButton.focus();
        }
        
        // Prevent background scrolling
        document.body.style.overflow = 'hidden';
        
        return modal;
    }

    closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
            // Allow background scrolling again
            document.body.style.overflow = '';
            // Remove from DOM after animation
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }

    // Student Details Modal
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
                    <span>${this.escapeHtml(student.phone_number || 'Not specified')}</span>
                </div>
                <div class="detail-row">
                    <label>Address:</label>
                    <span>${this.escapeHtml(student.address || 'Not specified')}</span>
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
            // Add click animations to cards
            document.querySelectorAll('.stat-card').forEach(card => {
                card.addEventListener('click', function() {
                    this.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        this.style.transform = '';
                    }, 150);
                });
            });

            // Add notice item interactions
            document.querySelectorAll('.notice-item').forEach(item => {
                item.addEventListener('click', function() {
                    const notice = this.textContent.trim();
                    if (notice) {
                        // Use our showMessage method instead of alert for better UX
                        window.uiUtils.showMessage(notice, 'info', 5000);
                    }
                });
            });

            console.log('Interactive features added successfully');
            
        } catch (error) {
            console.error('Error adding interactive features:', error);
        }
    }

    // Keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + / for search focus
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.focus();
                }
            }
            
            // Quick navigation shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.showSection('dashboard');
                        break;
                    case '2':
                        e.preventDefault();
                        this.showSection('attendance');
                        break;
                    case '3':
                        e.preventDefault();
                        this.showSection('students');
                        break;
                    case '4':
                        e.preventDefault();
                        this.showSection('reports');
                        break;
                }
            }
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
        // Create or get message container
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

        // Create message element
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

        // Set colors based on type
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

        // Fade in
        setTimeout(() => {
            messageElement.style.opacity = '1';
        }, 10);

        // Auto-remove message
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

    // Loading state management
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
        
        // Handle confirm
        const confirmBtn = modal.querySelector('.confirm-btn');
        confirmBtn.addEventListener('click', () => {
            this.closeModal(modal);
            if (onConfirm) onConfirm();
        });

        // Handle cancel
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