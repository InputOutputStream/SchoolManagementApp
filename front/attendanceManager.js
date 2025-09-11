import { API_CONFIG } from './config.js';

export class AttendanceManager {
    constructor(authManager) {
        this.authManager = authManager;
    }

    async recordAttendance(attendanceData) {
        // Validate attendance data
        const errors = this.validateAttendanceData(attendanceData);
        if (errors.length > 0) {
            throw new Error(`Validation errors: ${errors.join(', ')}`);
        }

        try {
            const result = await this.authManager.apiClient.post(API_CONFIG.endpoints.attendance.record, attendanceData);
            this.authManager.showMessage('Attendance recorded successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error recording attendance:', error);
            this.authManager.showMessage('Failed to record attendance: ' + error.message, 'error');
            throw error;
        }
    }

    async loadClassroomAttendance(classroomId, date) {
        if (!classroomId || !date) {
            throw new Error('Classroom ID and date are required');
        }

        try {
            const endpoint = `${API_CONFIG.endpoints.attendance.classroom}/${classroomId}?date=${date}`;
            const attendance = await this.authManager.apiClient.get(endpoint);
            return Array.isArray(attendance) ? attendance : [];
        } catch (error) {
            console.error('Error loading classroom attendance:', error);
            return [];
        }
    }

    async updateAttendance(attendanceId, attendanceData) {
        if (!attendanceId) {
            throw new Error('Attendance ID is required');
        }

        try {
            const result = await this.authManager.apiClient.put(`${API_CONFIG.endpoints.attendance.record}/${attendanceId}`, attendanceData);
            this.authManager.showMessage('Attendance updated successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error updating attendance:', error);
            this.authManager.showMessage('Failed to update attendance: ' + error.message, 'error');
            throw error;
        }
    }

    validateAttendanceData(attendanceData) {
        const errors = [];

        if (!attendanceData.classroom_id) {
            errors.push('Classroom ID is required');
        }

        if (!attendanceData.date) {
            errors.push('Date is required');
        } else {
            const date = new Date(attendanceData.date);
            const today = new Date();
            
            if (date > today) {
                errors.push('Cannot record attendance for future dates');
            }
        }

        if (!attendanceData.attendance_records || !Array.isArray(attendanceData.attendance_records)) {
            errors.push('Attendance records array is required');
        } else if (attendanceData.attendance_records.length === 0) {
            errors.push('At least one attendance record is required');
        } else {
            // Validate individual attendance records
            attendanceData.attendance_records.forEach((record, index) => {
                if (!record.student_id) {
                    errors.push(`Student ID is required for record ${index + 1}`);
                }

                if (!record.status || !this.isValidAttendanceStatus(record.status)) {
                    errors.push(`Valid status is required for record ${index + 1}`);
                }
            });
        }

        return errors;
    }

    isValidAttendanceStatus(status) {
        const validStatuses = ['present', 'absent', 'late', 'excused'];
        return validStatuses.includes(status);
    }

    displayAttendanceList(students, attendanceData = [], classroomId, date) {
        const studentsList = document.getElementById('attendanceStudentsList');
        if (!studentsList) {
            console.error('Attendance students list element not found');
            return;
        }

        if (!Array.isArray(students) || students.length === 0) {
            studentsList.innerHTML = '<p>No students found for this classroom.</p>';
            return;
        }

        let html = '<div class="attendance-list">';
        
        students.forEach(student => {
            const existingAttendance = attendanceData.find(att => att.student_id === student.id);
            const currentStatus = existingAttendance?.status || 'present';
            
            html += `
                <div class="attendance-item">
                    <span class="student-info">
                        ${student.user?.first_name || 'N/A'} ${student.user?.last_name || 'N/A'} 
                        <small>(${student.student_number || 'N/A'})</small>
                    </span>
                    <select class="attendance-status" data-student-id="${student.id}">
                        <option value="present" ${currentStatus === 'present' ? 'selected' : ''}>Present</option>
                        <option value="absent" ${currentStatus === 'absent' ? 'selected' : ''}>Absent</option>
                        <option value="late" ${currentStatus === 'late' ? 'selected' : ''}>Late</option>
                        <option value="excused" ${currentStatus === 'excused' ? 'selected' : ''}>Excused</option>
                    </select>
                </div>
            `;
        });
        
        html += `
            </div>
            <div class="attendance-actions">
                <button class="btn" onclick="saveAttendance('${classroomId}', '${date}')">
                    <i class="fas fa-save"></i> Save Attendance
                </button>
                <button class="btn btn-secondary" onclick="clearAttendance()">
                    <i class="fas fa-eraser"></i> Clear
                </button>
            </div>
        `;
        
        studentsList.innerHTML = html;
    }

    saveAttendance(classroomId, date) {
        const attendanceItems = document.querySelectorAll('.attendance-status');
        
        if (attendanceItems.length === 0) {
            this.authManager.showMessage('No attendance data to save', 'error');
            return;
        }

        const attendanceData = {
            classroom_id: classroomId,
            date: date,
            attendance_records: []
        };

        attendanceItems.forEach(item => {
            const studentId = item.dataset.studentId;
            const status = item.value;
            
            if (studentId && status) {
                attendanceData.attendance_records.push({
                    student_id: parseInt(studentId),
                    status: status
                });
            }
        });

        return this.recordAttendance(attendanceData);
    }

    clearAttendance() {
        const attendanceItems = document.querySelectorAll('.attendance-status');
        attendanceItems.forEach(item => {
            item.value = 'present';
        });
    }

    // Generate attendance report
    generateAttendanceReport(students, attendanceData) {
        const report = {
            totalStudents: students.length,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            attendanceRate: 0
        };

        attendanceData.forEach(record => {
            switch (record.status) {
                case 'present':
                    report.present++;
                    break;
                case 'absent':
                    report.absent++;
                    break;
                case 'late':
                    report.late++;
                    break;
                case 'excused':
                    report.excused++;
                    break;
            }
        });

        // Calculate attendance rate (present + late as attending)
        const attending = report.present + report.late;
        report.attendanceRate = report.totalStudents > 0 ? 
            Math.round((attending / report.totalStudents) * 100) : 0;

        return report;
    }
}