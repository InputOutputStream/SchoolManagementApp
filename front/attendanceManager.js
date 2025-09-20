import { API_CONFIG, resolveEndpoint } from './config.js';

// Updated AttendanceManager to work with new HTML structure
export class AttendanceManager {
    constructor(authManager) {
        this.authManager = authManager;
    }

    async recordAttendance(attendanceData) {
        const errors = this.validateAttendanceData(attendanceData);
        if (errors.length > 0) {
            throw new Error(`Validation errors: ${errors.join(', ')}`);
        }

        try {
            const result = await this.authManager.apiClient.post(
                API_CONFIG.endpoints.attendance.record, 
                attendanceData
            );
            this.showMessage('Attendance recorded successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error recording attendance:', error);
            this.showMessage('Failed to record attendance: ' + error.message, 'error');
            throw error;
        }
    }

    async loadClassroomAttendance(classroomId, date) {
        if (!classroomId || !date) {
            throw new Error('Classroom ID and date are required');
        }

        try {
            const endpointFunction = API_CONFIG.endpoints.attendance.classroomAttendance;
            const endpointConfig = resolveEndpoint(endpointFunction, classroomId);
            
            const endpointWithQuery = {
                ...endpointConfig,
                path: `${endpointConfig.path}?date=${date}`
            };
            
            const attendance = await this.authManager.apiClient.get(endpointWithQuery);
            return Array.isArray(attendance) ? attendance : [];
        } catch (error) {
            console.error('Error loading classroom attendance:', error);
            this.showMessage(`Failed to load attendance: ${error.message}`, 'error');
            return [];
        }
    }

    async loadTeacherAttendance(teacherId, date) {
        if (!teacherId) {
            throw new Error('Teacher ID is required');
        }

        try {
            const endpointFunction = API_CONFIG.endpoints.attendance.teacherAttendance;
            const endpointConfig = resolveEndpoint(endpointFunction, teacherId);
            
            const endpointWithQuery = {
                ...endpointConfig,
                path: `${endpointConfig.path}?date=${date || ''}`
            };
            
            const attendance = await this.authManager.apiClient.get(endpointWithQuery);
            return Array.isArray(attendance) ? attendance : [];
        } catch (error) {
            console.error('Error loading teacher attendance:', error);
            this.showMessage(`Failed to load teacher attendance: ${error.message}`, 'error');
            return [];
        }
    }

    async updateAttendance(attendanceId, attendanceData) {
        if (!attendanceId) {
            throw new Error('Attendance ID is required');
        }

        try {
            const endpointFunction = API_CONFIG.endpoints.attendance.update;
            const endpoint = resolveEndpoint(endpointFunction, attendanceId);
            
            const result = await this.authManager.apiClient.put(endpoint, attendanceData);
            this.showMessage('Attendance updated successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error updating attendance:', error);
            this.showMessage('Failed to update attendance: ' + error.message, 'error');
            throw error;
        }
    }

    async deleteAttendance(attendanceId) {
        if (!attendanceId) {
            throw new Error('Attendance ID is required');
        }

        try {
            const endpointFunction = API_CONFIG.endpoints.attendance.delete;
            const endpoint = resolveEndpoint(endpointFunction, attendanceId);
            
            const result = await this.authManager.apiClient.delete(endpoint);
            this.showMessage('Attendance deleted successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error deleting attendance:', error);
            this.showMessage('Failed to delete attendance: ' + error.message, 'error');
            throw error;
        }
    }

    validateAttendanceData(attendanceData) {
        const errors = [];

        if (!attendanceData.classroom_id || !Number.isInteger(Number(attendanceData.classroom_id))) {
            errors.push('Valid classroom ID is required');
        } else {
            attendanceData.classroom_id = parseInt(attendanceData.classroom_id);
        }

        if (!attendanceData.date) {
            errors.push('Date is required');
        } else if (!/^\d{4}-\d{2}-\d{2}$/.test(attendanceData.date)) {
            errors.push('Date must be in YYYY-MM-DD format');
        } else {
            const date = new Date(attendanceData.date + 'T00:00:00');
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            
            if (isNaN(date.getTime())) {
                errors.push('Invalid date format');
            } else if (date > today) {
                errors.push('Cannot record attendance for future dates');
            }
        }

        if (!attendanceData.attendance_records || !Array.isArray(attendanceData.attendance_records)) {
            errors.push('Attendance records array is required');
        } else if (attendanceData.attendance_records.length === 0) {
            errors.push('At least one attendance record is required');
        } else {
            attendanceData.attendance_records.forEach((record, index) => {
                if (!record.student_id || !Number.isInteger(Number(record.student_id))) {
                    errors.push(`Valid student ID is required for record ${index + 1}`);
                } else {
                    record.student_id = parseInt(record.student_id);
                }

                if (!record.status || !this.isValidAttendanceStatus(record.status)) {
                    errors.push(`Valid status (present, absent, late, excused) is required for record ${index + 1}`);
                }

                if (record.notes && typeof record.notes !== 'string') {
                    errors.push(`Notes for record ${index + 1} must be a string`);
                }

                if (record.created_at && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(record.created_at)) {
                    errors.push(`Invalid created_at format for record ${index + 1}`);
                }
            });
        }

        if (attendanceData.teacher_id && !Number.isInteger(Number(attendanceData.teacher_id))) {
            errors.push('Valid teacher ID is required if provided');
        } else if (attendanceData.teacher_id) {
            attendanceData.teacher_id = parseInt(attendanceData.teacher_id);
        }

        return errors;
    }

    isValidAttendanceStatus(status) {
        const validStatuses = ['present', 'absent', 'late', 'excused'];
        return validStatuses.includes(status?.toLowerCase());
    }

    // Updated to work with new HTML structure
    displayAttendanceList(students, attendanceData = [], classroomId, date) {
        const studentsList = document.getElementById('studentAttendanceList');
        if (!studentsList) {
            console.error('Student attendance list element not found');
            return;
        }

        if (!Array.isArray(students) || students.length === 0) {
            studentsList.innerHTML = '<p class="no-data">No students found for this classroom.</p>';
            return;
        }

        let html = '<div class="attendance-list">';
        
        students.forEach(student => {
            const existingAttendance = attendanceData.find(att => att.student_id === student.id);
            const currentStatus = existingAttendance?.status || 'present';
            
            html += `
                <div class="attendance-item">
                    <span class="student-info">
                        <strong>${this.escapeHtml(student.user?.first_name || 'N/A')} ${this.escapeHtml(student.user?.last_name || 'N/A')}</strong>
                        <small>(${this.escapeHtml(student.student_number || 'N/A')})</small>
                    </span>
                    <div class="attendance-controls">
                        <select class="attendance-status" data-student-id="${student.id}" aria-label="Attendance status for ${student.user?.first_name} ${student.user?.last_name}">
                            <option value="present" ${currentStatus === 'present' ? 'selected' : ''}>Present</option>
                            <option value="absent" ${currentStatus === 'absent' ? 'selected' : ''}>Absent</option>
                            <option value="late" ${currentStatus === 'late' ? 'selected' : ''}>Late</option>
                            <option value="excused" ${currentStatus === 'excused' ? 'selected' : ''}>Excused</option>
                        </select>
                        <span class="status-indicator ${currentStatus}">${currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}</span>
                    </div>
                </div>
            `;
        });
        
        html += `
            </div>
            <div class="attendance-actions">
                <button class="btn btn-primary" onclick="saveStudentAttendance('${classroomId}', '${date}')" ${students.length === 0 ? 'disabled' : ''}>
                    <i class="fas fa-save"></i> Save Attendance
                </button>
                <button class="btn btn-secondary" onclick="clearAttendance()" ${students.length === 0 ? 'disabled' : ''}>
                    <i class="fas fa-eraser"></i> Clear
                </button>
                <button class="btn btn-info" onclick="window.attendanceManager.generateAttendanceSummary('${classroomId}', '${date}')" ${students.length === 0 ? 'disabled' : ''}>
                    <i class="fas fa-chart-bar"></i> Summary
                </button>
            </div>
        `;
        
        studentsList.innerHTML = html;

        this.addAttendanceEventListeners();
    }

    // New method for displaying teacher attendance list
    displayTeacherAttendanceList(teachers, attendanceData = [], date) {
        const teachersList = document.getElementById('teacherAttendanceList');
        if (!teachersList) {
            console.error('Teacher attendance list element not found');
            return;
        }

        if (!Array.isArray(teachers) || teachers.length === 0) {
            teachersList.innerHTML = '<p class="no-data">No teachers found.</p>';
            return;
        }

        let html = '<div class="attendance-list">';
        
        teachers.forEach(teacher => {
            const existingAttendance = attendanceData.find(att => att.teacher_id === teacher.id);
            const currentStatus = existingAttendance?.status || 'present';
            
            html += `
                <div class="attendance-item">
                    <span class="teacher-info">
                        <strong>${this.escapeHtml(teacher.user?.first_name || 'N/A')} ${this.escapeHtml(teacher.user?.last_name || 'N/A')}</strong>
                        <small>(${this.escapeHtml(teacher.employee_number || 'N/A')})</small>
                    </span>
                    <div class="attendance-controls">
                        <select class="teacher-attendance-status" data-teacher-id="${teacher.id}" aria-label="Attendance status for ${teacher.user?.first_name} ${teacher.user?.last_name}">
                            <option value="present" ${currentStatus === 'present' ? 'selected' : ''}>Present</option>
                            <option value="absent" ${currentStatus === 'absent' ? 'selected' : ''}>Absent</option>
                            <option value="late" ${currentStatus === 'late' ? 'selected' : ''}>Late</option>
                            <option value="sick" ${currentStatus === 'sick' ? 'selected' : ''}>Sick Leave</option>
                            <option value="vacation" ${currentStatus === 'vacation' ? 'selected' : ''}>Vacation</option>
                        </select>
                        <span class="status-indicator ${currentStatus}">${currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}</span>
                    </div>
                </div>
            `;
        });
        
        html += `
            </div>
            <div class="attendance-actions">
                <button class="btn btn-primary" onclick="saveTeacherAttendance('${date}')" ${teachers.length === 0 ? 'disabled' : ''}>
                    <i class="fas fa-save"></i> Save Teacher Attendance
                </button>
                <button class="btn btn-secondary" onclick="clearTeacherAttendance()" ${teachers.length === 0 ? 'disabled' : ''}>
                    <i class="fas fa-eraser"></i> Clear
                </button>
                <button class="btn btn-info" onclick="window.attendanceManager.generateTeacherAttendanceSummary('${date}')" ${teachers.length === 0 ? 'disabled' : ''}>
                    <i class="fas fa-chart-bar"></i> Summary
                </button>
            </div>
        `;
        
        teachersList.innerHTML = html;

        this.addTeacherAttendanceEventListeners();
    }

    addAttendanceEventListeners() {
        const statusSelects = document.querySelectorAll('.attendance-status');
        
        statusSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                const studentId = e.target.dataset.studentId;
                const status = e.target.value;
                const indicator = e.target.parentNode.querySelector('.status-indicator');
                
                if (indicator) {
                    indicator.className = `status-indicator ${status}`;
                    indicator.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                }

                clearTimeout(this.autoSaveTimeout);
                this.autoSaveTimeout = setTimeout(() => {
                    this.autoSaveAttendance();
                }, 2000);
            });
        });
    }

    addTeacherAttendanceEventListeners() {
        const statusSelects = document.querySelectorAll('.teacher-attendance-status');
        
        statusSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                const teacherId = e.target.dataset.teacherId;
                const status = e.target.value;
                const indicator = e.target.parentNode.querySelector('.status-indicator');
                
                if (indicator) {
                    indicator.className = `status-indicator ${status}`;
                    indicator.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                }

                clearTimeout(this.autoSaveTimeout);
                this.autoSaveTimeout = setTimeout(() => {
                    this.autoSaveTeacherAttendance();
                }, 2000);
            });
        });
    }

    async autoSaveAttendance() {
        const classroomId = document.getElementById('attendanceClassroom')?.value;
        const date = document.getElementById('studentAttendanceDate')?.value;
        
        if (classroomId && date) {
            try {
                await this.saveAttendance(classroomId, date);
                this.showMessage('Attendance auto-saved', 'info');
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }
    }

    async autoSaveTeacherAttendance() {
        const date = document.getElementById('teacherAttendanceDate')?.value;
        
        if (date) {
            try {
                await this.saveTeacherAttendance(date);
                this.showMessage('Teacher attendance auto-saved', 'info');
            } catch (error) {
                console.error('Teacher auto-save failed:', error);
            }
        }
    }

    async saveAttendance(classroomId, date) {
        const attendanceItems = document.querySelectorAll('.attendance-status');
        
        if (attendanceItems.length === 0) {
            this.showMessage('No attendance data to save', 'error');
            return;
        }

        const attendanceData = {
            classroom_id: parseInt(classroomId),
            date: date,
            teacher_id: this.authManager.currentUser?.teacher?.id || null,
            attendance_records: []
        };

        attendanceItems.forEach(item => {
            const studentId = item.dataset.studentId;
            const status = item.value;
            
            if (studentId && status && this.isValidAttendanceStatus(status)) {
                attendanceData.attendance_records.push({
                    student_id: parseInt(studentId),
                    status: status.toLowerCase(),
                    recorded_at: new Date().toISOString()
                });
            }
        });

        if (!attendanceData.classroom_id || !attendanceData.date) {
            this.showMessage('Classroom ID and date are required', 'error');
            return;
        }

        if (attendanceData.attendance_records.length === 0) {
            this.showMessage('No valid attendance records to save', 'error');
            return;
        }

        const validationErrors = this.validateAttendanceData(attendanceData);
        if (validationErrors.length > 0) {
            this.showMessage('Validation failed: ' + validationErrors.join(', '), 'error');
            return;
        }

        try {
            const result = await this.recordAttendance(attendanceData);
            return result;
        } catch (error) {
            console.error('Error saving attendance:', error);
            throw error;
        }
    }

    async saveTeacherAttendance(date) {
        const attendanceItems = document.querySelectorAll('.teacher-attendance-status');
        
        if (attendanceItems.length === 0) {
            this.showMessage('No teacher attendance data to save', 'error');
            return;
        }

        const teacherAttendanceData = {
            date: date,
            teacher_records: []
        };

        attendanceItems.forEach(item => {
            const teacherId = item.dataset.teacherId;
            const status = item.value;
            
            if (teacherId && status) {
                teacherAttendanceData.teacher_records.push({
                    teacher_id: parseInt(teacherId),
                    status: status.toLowerCase(),
                    recorded_at: new Date().toISOString()
                });
            }
        });

        if (!teacherAttendanceData.date) {
            this.showMessage('Date is required', 'error');
            return;
        }

        if (teacherAttendanceData.teacher_records.length === 0) {
            this.showMessage('No valid teacher attendance records to save', 'error');
            return;
        }

        try {
            // This would need a specific endpoint for teacher attendance
            const result = await this.authManager.apiClient.post('/attendance/teachers', teacherAttendanceData);
            this.showMessage('Teacher attendance saved successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error saving teacher attendance:', error);
            this.showMessage('Failed to save teacher attendance: ' + error.message, 'error');
            throw error;
        }
    }

    clearAttendance() {
        const attendanceItems = document.querySelectorAll('.attendance-status');
        const indicators = document.querySelectorAll('.status-indicator');
        
        attendanceItems.forEach(item => {
            item.value = 'present';
        });

        indicators.forEach(indicator => {
            indicator.className = 'status-indicator present';
            indicator.textContent = 'Present';
        });

        this.showMessage('Attendance cleared - all students marked as present', 'info');
    }

    clearTeacherAttendance() {
        const attendanceItems = document.querySelectorAll('.teacher-attendance-status');
        const indicators = document.querySelectorAll('.teacher-attendance-status + .status-indicator');
        
        attendanceItems.forEach(item => {
            item.value = 'present';
        });

        indicators.forEach(indicator => {
            indicator.className = 'status-indicator present';
            indicator.textContent = 'Present';
        });

        this.showMessage('Teacher attendance cleared - all teachers marked as present', 'info');
    }

    async generateAttendanceSummary(classroomId, date) {
        const attendanceItems = document.querySelectorAll('.attendance-status');
        
        if (attendanceItems.length === 0) {
            this.showMessage('No attendance data available', 'error');
            return;
        }

        const summary = {
            totalStudents: attendanceItems.length,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            date: date,
            classroom_id: parseInt(classroomId),
            generated_at: new Date().toISOString(),
            teacher_id: this.authManager.currentUser?.teacher?.id || null
        };

        attendanceItems.forEach(item => {
            const status = item.value;
            if (summary.hasOwnProperty(status)) {
                summary[status]++;
            }
        });

        const attending = summary.present + summary.late;
        const attendanceRate = summary.totalStudents > 0 ? 
            Math.round((attending / summary.totalStudents) * 100) : 0;

        const summaryContent = `
            <div class="attendance-summary">
                <h3>Attendance Summary for ${date}</h3>
                <div class="summary-grid">
                    <div class="summary-item present">
                        <span class="count">${summary.present}</span>
                        <span class="label">Present</span>
                    </div>
                    <div class="summary-item late">
                        <span class="count">${summary.late}</span>
                        <span class="label">Late</span>
                    </div>
                    <div class="summary-item excused">
                        <span class="count">${summary.excused}</span>
                        <span class="label">Excused</span>
                    </div>
                    <div class="summary-item absent">
                        <span class="count">${summary.absent}</span>
                        <span class="label">Absent</span>
                    </div>
                </div>
                <div class="summary-stats">
                    <div class="stat-row">
                        <span>Total Students:</span>
                        <span><strong>${summary.totalStudents}</strong></span>
                    </div>
                    <div class="stat-row">
                        <span>Attendance Rate:</span>
                        <span class="rate ${attendanceRate >= 90 ? 'good' : attendanceRate >= 75 ? 'average' : 'poor'}">
                            <strong>${attendanceRate}%</strong>
                        </span>
                    </div>
                </div>
            </div>
        `;

        if (window.uiUtils && typeof window.uiUtils.showModal === 'function') {
            window.uiUtils.showModal(summaryContent, 'Attendance Summary');
        } else {
            const textSummary = `Attendance Summary for ${date}:\n` +
                              `Total: ${summary.totalStudents} students\n` +
                              `Present: ${summary.present}\n` +
                              `Late: ${summary.late}\n` +
                              `Excused: ${summary.excused}\n` +
                              `Absent: ${summary.absent}\n` +
                              `Attendance Rate: ${attendanceRate}%`;
            alert(textSummary);
        }

        return summary;
    }

    async generateTeacherAttendanceSummary(date) {
        const attendanceItems = document.querySelectorAll('.teacher-attendance-status');
        
        if (attendanceItems.length === 0) {
            this.showMessage('No teacher attendance data available', 'error');
            return;
        }

        const summary = {
            totalTeachers: attendanceItems.length,
            present: 0,
            absent: 0,
            late: 0,
            sick: 0,
            vacation: 0,
            date: date,
            generated_at: new Date().toISOString()
        };

        attendanceItems.forEach(item => {
            const status = item.value;
            if (summary.hasOwnProperty(status)) {
                summary[status]++;
            }
        });

        const working = summary.present + summary.late;
        const workingRate = summary.totalTeachers > 0 ? 
            Math.round((working / summary.totalTeachers) * 100) : 0;

        const summaryContent = `
            <div class="attendance-summary">
                <h3>Teacher Attendance Summary for ${date}</h3>
                <div class="summary-grid">
                    <div class="summary-item present">
                        <span class="count">${summary.present}</span>
                        <span class="label">Present</span>
                    </div>
                    <div class="summary-item late">
                        <span class="count">${summary.late}</span>
                        <span class="label">Late</span>
                    </div>
                    <div class="summary-item sick">
                        <span class="count">${summary.sick}</span>
                        <span class="label">Sick</span>
                    </div>
                    <div class="summary-item vacation">
                        <span class="count">${summary.vacation}</span>
                        <span class="label">Vacation</span>
                    </div>
                    <div class="summary-item absent">
                        <span class="count">${summary.absent}</span>
                        <span class="label">Absent</span>
                    </div>
                </div>
                <div class="summary-stats">
                    <div class="stat-row">
                        <span>Total Teachers:</span>
                        <span><strong>${summary.totalTeachers}</strong></span>
                    </div>
                    <div class="stat-row">
                        <span>Working Rate:</span>
                        <span class="rate ${workingRate >= 90 ? 'good' : workingRate >= 75 ? 'average' : 'poor'}">
                            <strong>${workingRate}%</strong>
                        </span>
                    </div>
                </div>
            </div>
        `;

        if (window.uiUtils && typeof window.uiUtils.showModal === 'function') {
            window.uiUtils.showModal(summaryContent, 'Teacher Attendance Summary');
        } else {
            const textSummary = `Teacher Attendance Summary for ${date}:\n` +
                              `Total: ${summary.totalTeachers} teachers\n` +
                              `Present: ${summary.present}\n` +
                              `Late: ${summary.late}\n` +
                              `Sick: ${summary.sick}\n` +
                              `Vacation: ${summary.vacation}\n` +
                              `Absent: ${summary.absent}\n` +
                              `Working Rate: ${workingRate}%`;
            alert(textSummary);
        }

        return summary;
    }

    generateAttendanceReport(students, attendanceData) {
        const report = {
            totalStudents: students.length,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            attendanceRate: 0,
            students: [],
            generated_at: new Date().toISOString(),
            report_type: 'attendance_summary'
        };

        students.forEach(student => {
            const attendance = attendanceData.find(att => att.student_id === student.id);
            const status = attendance?.status || 'present';
            
            if (report.hasOwnProperty(status)) {
                report[status]++;
            }
            
            report.students.push({
                id: student.id,
                name: `${student.user?.first_name || 'N/A'} ${student.user?.last_name || 'N/A'}`,
                studentNumber: student.student_number,
                status: status,
                classroom_id: student.classroom?.id || null,
                user_id: student.user_id || null
            });
        });

        const attending = report.present + report.late;
        report.attendanceRate = report.totalStudents > 0 ? 
            Math.round((attending / report.totalStudents) * 100) : 0;

        return report;
    }

    // Utility methods
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showMessage(message, type = 'info') {
        if (window.uiUtils && typeof window.uiUtils.showMessage === 'function') {
            window.uiUtils.showMessage(message, type);
        } else if (this.authManager && typeof this.authManager.showMessage === 'function') {
            this.authManager.showMessage(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}