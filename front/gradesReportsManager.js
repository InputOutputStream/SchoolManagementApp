import { API_CONFIG } from './config.js';

export class GradesReportsManager {
    constructor(authManager) {
        this.authManager = authManager;
    }

    // Grades Management
 async addGrade(gradeData) {
        const errors = this.validateGradeData(gradeData);
        if (errors.length > 0) {
            throw new Error(`Validation errors: ${errors.join(', ')}`);
        }

        try {
            const result = await this.authManager.apiClient.post(
                API_CONFIG.endpoints.grades.add, 
                gradeData
            );
            this.authManager.showMessage('Grade added successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error adding grade:', error);
            this.authManager.showMessage('Failed to add grade: ' + error.message, 'error');
            throw error;
        }
    }

    async updateGrade(gradeId, gradeData) {
        if (!gradeId) {
            throw new Error('Grade ID is required');
        }

        const errors = this.validateGradeData(gradeData);
        if (errors.length > 0) {
            throw new Error(`Validation errors: ${errors.join(', ')}`);
        }

        try {
            const endpointConfig = resolveEndpoint(
                API_CONFIG.endpoints.grades.update, 
                gradeId
            );
            
            const result = await this.authManager.apiClient.put(endpointConfig, gradeData);
            this.authManager.showMessage('Grade updated successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error updating grade:', error);
            this.authManager.showMessage('Failed to update grade: ' + error.message, 'error');
            throw error;
        }
    }

    async loadClassroomGrades(classroomId, periodId) {
        if (!classroomId) {
            throw new Error('Classroom ID is required');
        }

        try {
            if (periodId) {
                const endpointConfig = resolveEndpoint(
                    API_CONFIG.endpoints.grades.classroomGrades, 
                    classroomId, 
                    periodId
                );
                const grades = await this.authManager.apiClient.get(endpointConfig);
                return Array.isArray(grades) ? grades : [];
            } else {
                // Fallback for when no period is specified
                const endpointConfig = {
                    path: `/grades/classroom/${classroomId}`,
                    method: 'GET',
                    requiredRole: ['teacher', 'admin']
                };
                const grades = await this.authManager.apiClient.get(endpointConfig);
                return Array.isArray(grades) ? grades : [];
            }
        } catch (error) {
            console.error('Error loading classroom grades:', error);
            return [];
        }
    }

    async deleteGrade(gradeId) {
        if (!gradeId) {
            throw new Error('Grade ID is required');
        }

        try {
            const result = await this.authManager.apiClient.delete(`${API_CONFIG.endpoints.grades.update}/${gradeId}`);
            this.authManager.showMessage('Grade deleted successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error deleting grade:', error);
            this.authManager.showMessage('Failed to delete grade: ' + error.message, 'error');
            throw error;
        }
    }

    validateGradeData(gradeData) {
        const errors = [];

        if (!gradeData.student_id) {
            errors.push('Student ID is required');
        }

        if (!gradeData.subject_id) {
            errors.push('Subject ID is required');
        }

        if (!gradeData.evaluation_period_id) {
            errors.push('Evaluation period ID is required');
        }

        if (gradeData.grade === undefined || gradeData.grade === null || gradeData.grade === '') {
            errors.push('Grade is required');
        } else {
            const grade = parseFloat(gradeData.grade);
            if (isNaN(grade) || grade < 0 || grade > 20) {
                errors.push('Grade must be a number between 0 and 20');
            }
        }

        if (gradeData.evaluation_date) {
            const evalDate = new Date(gradeData.evaluation_date);
            const today = new Date();
            
            if (evalDate > today) {
                errors.push('Evaluation date cannot be in the future');
            }
        }

        return errors;
    }

    // Reports Management
    async generateReportCard(studentId, periodId, comments = null) {
        if (!studentId || !periodId) {
            throw new Error('Student ID and period ID are required');
        }

        try {
            const reportData = { 
                student_id: studentId, 
                period_id: periodId,
                comments: comments
            };
            const result = await this.authManager.apiClient.post(API_CONFIG.endpoints.reports.generate, reportData);
            this.authManager.showMessage('Report card generated successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error generating report card:', error);
            this.authManager.showMessage('Failed to generate report card: ' + error.message, 'error');
            throw error;
        }
    }

    async loadClassroomReports(classroomId, periodId) {
        if (!classroomId) {
            throw new Error('Classroom ID is required');
        }

        try {
            let endpoint = `${API_CONFIG.endpoints.reports.classroom}/${classroomId}`;
            if (periodId) {
                endpoint += `?period_id=${periodId}`;
            }
            const reports = await this.authManager.apiClient.get(endpoint);
            return Array.isArray(reports) ? reports : [];
        } catch (error) {
            console.error('Error loading classroom reports:', error);
            return [];
        }
    }

    displayReportsList(reports, classroomId, periodId) {
        const reportsList = document.getElementById('reportsList');
        if (!reportsList) {
            console.error('Reports list element not found');
            return;
        }

        let html = '';
        
        if (Array.isArray(reports) && reports.length > 0) {
            reports.forEach(report => {
                html += `
                    <div class="report-item">
                        <i class="fas fa-file-pdf"></i>
                        <span>${report.title || report.name || 'Report'}</span>
                        <span class="report-date">${this.formatDate(report.created_at)}</span>
                        <button class="btn-small" onclick="downloadReport('${report.id}')">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                `;
            });
        } else {
            // Show placeholder reports
            html = `
                <div class="report-item">
                    <i class="fas fa-file-pdf"></i>
                    <span>Classroom Report - Generated ${new Date().toLocaleDateString()}</span>
                    <span class="report-date">${new Date().toLocaleDateString()}</span>
                    <button class="btn-small" onclick="downloadReport('placeholder1')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
                <div class="report-item">
                    <i class="fas fa-file-pdf"></i>
                    <span>Subject Analysis Report</span>
                    <span class="report-date">${new Date().toLocaleDateString()}</span>
                    <button class="btn-small" onclick="downloadReport('placeholder2')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            `;
        }
        
        reportsList.innerHTML = html;
    }

    createGradeForm(studentId, subjects = [], evaluationPeriods = []) {
        if (!studentId) {
            throw new Error('Student ID is required');
        }

        const subjectsOptions = Array.isArray(subjects) ? subjects.map(subject => 
            `<option value="${subject.id}">${subject.name}</option>`
        ).join('') : '<option value="">No subjects available</option>';

        const periodsOptions = Array.isArray(evaluationPeriods) ? evaluationPeriods.map(period => 
            `<option value="${period.id}">${period.name}</option>`
        ).join('') : '<option value="">No evaluation periods available</option>';

        return `
            <form id="gradeForm" onsubmit="handleGradeSubmission(event)">
                <input type="hidden" name="student_id" value="${studentId}">
                
                <div class="form-group">
                    <label for="subject_id">Subject: <span class="required">*</span></label>
                    <select name="subject_id" required>
                        <option value="">Select Subject</option>
                        ${subjectsOptions}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="evaluation_period_id">Evaluation Period: <span class="required">*</span></label>
                    <select name="evaluation_period_id" required>
                        <option value="">Select Period</option>
                        ${periodsOptions}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="grade">Grade: <span class="required">*</span></label>
                    <input type="number" name="grade" min="0" max="20" step="0.01" required 
                           placeholder="Enter grade (0-20)">
                </div>
                
                <div class="form-group">
                    <label for="evaluation_type">Evaluation Type:</label>
                    <select name="evaluation_type">
                        <option value="">Select Type</option>
                        <option value="quiz">Quiz</option>
                        <option value="test">Test</option>
                        <option value="assignment">Assignment</option>
                        <option value="project">Project</option>
                        <option value="participation">Participation</option>
                        <option value="exam">Exam</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="evaluation_name">Evaluation Name:</label>
                    <input type="text" name="evaluation_name" placeholder="e.g., Math Quiz 1"
                           maxlength="100">
                </div>
                
                <div class="form-group">
                    <label for="evaluation_date">Evaluation Date:</label>
                    <input type="date" name="evaluation_date" max="${new Date().toISOString().split('T')[0]}">
                </div>
                
                <div class="form-group">
                    <label for="comments">Comments:</label>
                    <textarea name="comments" rows="3" placeholder="Optional comments"
                              maxlength="500"></textarea>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn">Add Grade</button>
                    <button type="button" class="btn btn-secondary" onclick="closeGradeForm()">Cancel</button>
                </div>
            </form>
        `;
    }

    async handleGradeSubmission(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const gradeData = Object.fromEntries(formData.entries());
        
        try {
            await this.addGrade(gradeData);
            event.target.reset();
            this.closeGradeForm();
        } catch (error) {
            console.error('Grade submission error:', error);
            this.authManager.showMessage('Failed to add grade: ' + error.message, 'error');
        }
    }

    closeGradeForm() {
        const gradeModal = document.getElementById('gradeModal');
        if (gradeModal) {
            gradeModal.style.display = 'none';
        }
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

    calculateGPA(grades) {
        if (!Array.isArray(grades) || grades.length === 0) {
            return 0;
        }

        const totalPoints = grades.reduce((sum, grade) => sum + parseFloat(grade.grade || 0), 0);
        return Math.round((totalPoints / grades.length) * 100) / 100;
    }

    getGradeLevel(grade) {
        if (grade >= 18) return 'Excellent';
        if (grade >= 16) return 'Very Good';
        if (grade >= 14) return 'Good';
        if (grade >= 12) return 'Satisfactory';
        if (grade >= 10) return 'Pass';
        return 'Fail';
    }

    downloadReport(reportId) {
        console.log('Downloading report:', reportId);
        
        if (reportId.startsWith('placeholder')) {
            this.authManager.showMessage('This is a demo report. In production, this would download the actual report file.', 'info');
            return;
        }

        // In a real implementation, this would trigger the actual download
        // For now, we'll just show a message
        this.authManager.showMessage('Report download would start here. Report ID: ' + reportId, 'info');
    }
}