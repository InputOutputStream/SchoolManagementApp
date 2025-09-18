import { API_CONFIG, resolveEndpoint } from './config.js';

export class GradesReportsManager {
    constructor(authManager) {
        this.authManager = authManager;
    }

    // Grades Management - Fixed to match backend schema
    async addGrade(gradeData) {
        const errors = this.validateGradeData(gradeData);
        if (errors.length > 0) {
            throw new Error(`Validation errors: ${errors.join(', ')}`);
        }

        try {
            // FIX: Transform frontend data to match backend Grade model
            const transformedData = this.transformGradeDataForBackend(gradeData);
            
            const result = await this.authManager.apiClient.post(
                API_CONFIG.endpoints.grades.add, 
                transformedData
            );
            this.authManager.showMessage('Grade added successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error adding grade:', error);
            this.authManager.showMessage('Failed to add grade: ' + error.message, 'error');
            throw error;
        }
    }

    // FIX: Transform grade data to match backend schema
    transformGradeDataForBackend(gradeData) {
        // Backend expects: student_id, evaluation_id, subject_id, points_earned, points_possible, etc.
        // But we might be sending: student_id, subject_id, evaluation_period_id, grade, etc.
        
        const transformed = {
            student_id: parseInt(gradeData.student_id),
            subject_id: parseInt(gradeData.subject_id),
            
            // FIX: Backend uses evaluation_id (from evaluations table), not evaluation_period_id directly
            // We need to either create an evaluation or find existing one
            evaluation_id: gradeData.evaluation_id ? parseInt(gradeData.evaluation_id) : null,
            
            // FIX: Backend uses points_earned and points_possible (Numeric), not a single grade
            points_earned: gradeData.grade ? parseFloat(gradeData.grade) : parseFloat(gradeData.points_earned || 0),
            points_possible: parseFloat(gradeData.points_possible || gradeData.max_points || 20), // Default to 20 if not specified
            
            // FIX: Backend calculates percentage automatically, but we can provide it
            percentage: gradeData.percentage ? parseFloat(gradeData.percentage) : null,
            
            // FIX: Backend expects letter_grade (String, max 5 chars)
            letter_grade: this.calculateLetterGrade(gradeData.grade || gradeData.points_earned),
            
            comments: gradeData.comments || null,
            is_excused: Boolean(gradeData.is_excused || false),
            
            // FIX: created_by should be teacher/user id, not student
            created_by: this.authManager.currentUser?.id || null
        };

        // Calculate percentage if not provided
        if (!transformed.percentage && transformed.points_possible > 0) {
            transformed.percentage = parseFloat(((transformed.points_earned / transformed.points_possible) * 100).toFixed(2));
        }

        return transformed;
    }

    // FIX: Add method to create evaluation if needed
    async createEvaluationIfNeeded(gradeData) {
        // If we don't have evaluation_id, we need to create an evaluation first
        if (!gradeData.evaluation_id && gradeData.evaluation_period_id) {
            const evaluationData = {
                name: gradeData.evaluation_name || `${gradeData.evaluation_type || 'Assessment'} - ${new Date().toLocaleDateString()}`,
                description: gradeData.evaluation_description || null,
                evaluation_period_id: parseInt(gradeData.evaluation_period_id),
                evaluation_type_id: await this.getOrCreateEvaluationType(gradeData.evaluation_type || 'test'),
                subject_id: parseInt(gradeData.subject_id),
                classroom_id: await this.getStudentClassroom(gradeData.student_id),
                evaluation_date: gradeData.evaluation_date || new Date().toISOString().split('T')[0],
                created_by: this.authManager.currentUser?.teacher?.id || null,
                max_points: parseFloat(gradeData.points_possible || gradeData.max_points || 20),
                weight: parseFloat(gradeData.weight || 1.0),
                is_published: Boolean(gradeData.is_published || false)
            };

            // Create evaluation via API (this endpoint would need to exist)
            const evaluation = await this.authManager.apiClient.post('/evaluations', evaluationData);
            return evaluation.id;
        }
        
        return gradeData.evaluation_id;
    }

    async getOrCreateEvaluationType(typeName) {
        // This would fetch or create evaluation type
        // For now, return default ID (this needs backend implementation)
        const typeMap = {
            'quiz': 1,
            'test': 2,
            'assignment': 3,
            'project': 4,
            'participation': 5,
            'exam': 6
        };
        return typeMap[typeName.toLowerCase()] || 2; // Default to test
    }

    async getStudentClassroom(studentId) {
        // Fetch student's classroom_id
        try {
            const student = await this.authManager.apiClient.get(`/students/${studentId}`);
            return student.classroom_id;
        } catch (error) {
            console.warn('Could not fetch student classroom:', error);
            return null;
        }
    }

    calculateLetterGrade(score, maxScore = 20) {
        const percentage = maxScore > 0 ? (parseFloat(score) / parseFloat(maxScore)) * 100 : 0;
        
        if (percentage >= 90) return 'A';
        if (percentage >= 80) return 'B';
        if (percentage >= 70) return 'C';
        if (percentage >= 60) return 'D';
        return 'F';
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
            
            // FIX: Transform data for backend
            const transformedData = this.transformGradeDataForBackend(gradeData);
            
            const result = await this.authManager.apiClient.put(endpointConfig, transformedData);
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
            const endpointConfig = resolveEndpoint(
                API_CONFIG.endpoints.grades.delete,
                gradeId
            );
            
            const result = await this.authManager.apiClient.delete(endpointConfig);
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

        // FIX: Validate according to backend schema
        if (!gradeData.student_id || !Number.isInteger(Number(gradeData.student_id))) {
            errors.push('Valid student ID is required');
        }

        if (!gradeData.subject_id || !Number.isInteger(Number(gradeData.subject_id))) {
            errors.push('Valid subject ID is required');
        }

        // FIX: Backend needs evaluation_id, not evaluation_period_id directly
        if (!gradeData.evaluation_id && !gradeData.evaluation_period_id) {
            errors.push('Either evaluation ID or evaluation period ID is required');
        }

        // FIX: Validate points_earned and points_possible instead of single grade
        if (gradeData.points_earned !== undefined) {
            const pointsEarned = parseFloat(gradeData.points_earned);
            if (isNaN(pointsEarned) || pointsEarned < 0) {
                errors.push('Points earned must be a non-negative number');
            }
        } else if (gradeData.grade !== undefined) {
            const grade = parseFloat(gradeData.grade);
            if (isNaN(grade) || grade < 0 || grade > 20) {
                errors.push('Grade must be a number between 0 and 20');
            }
        } else {
            errors.push('Either points earned or grade is required');
        }

        if (gradeData.points_possible !== undefined) {
            const pointsPossible = parseFloat(gradeData.points_possible);
            if (isNaN(pointsPossible) || pointsPossible <= 0) {
                errors.push('Points possible must be a positive number');
            }
        }

        // FIX: Validate evaluation_date format if provided
        if (gradeData.evaluation_date && !/^\d{4}-\d{2}-\d{2}$/.test(gradeData.evaluation_date)) {
            errors.push('Evaluation date must be in YYYY-MM-DD format');
        }

        // FIX: Validate letter_grade length (max 5 chars in backend)
        if (gradeData.letter_grade && gradeData.letter_grade.length > 5) {
            errors.push('Letter grade must be 5 characters or less');
        }

        // FIX: Validate percentage range
        if (gradeData.percentage !== undefined) {
            const percentage = parseFloat(gradeData.percentage);
            if (isNaN(percentage) || percentage < 0 || percentage > 100) {
                errors.push('Percentage must be between 0 and 100');
            }
        }

        return errors;
    }

    // Reports Management - Fixed to match backend schema
    async generateReportCard(studentId, periodId, comments = null) {
        if (!studentId || !periodId) {
            throw new Error('Student ID and period ID are required');
        }

        try {
            // FIX: Structure data to match backend report_cards table
            const reportData = { 
                student_id: parseInt(studentId), 
                evaluation_period_id: parseInt(periodId),
                teacher_comments: comments || null,
                generated_by: this.authManager.currentUser?.teacher?.id || null
            };
            
            const endpointConfig = resolveEndpoint(
                API_CONFIG.endpoints.reports.generate,
                studentId,
                periodId
            );
            
            const result = await this.authManager.apiClient.post(endpointConfig, reportData);
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
            const endpointConfig = resolveEndpoint(
                API_CONFIG.endpoints.reports.classroomReports,
                classroomId,
                periodId
            );
            
            const reports = await this.authManager.apiClient.get(endpointConfig);
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
                // FIX: Use backend field names
                const reportTitle = report.file_path ? 
                    `Report Card - ${report.student?.user?.first_name} ${report.student?.user?.last_name}` : 
                    'Report Card';
                    
                const generationDate = report.generation_date ? 
                    this.formatDate(report.generation_date) : 
                    'Unknown';
                    
                const overallAverage = report.overall_average ? 
                    `${report.overall_average}/20` : 
                    'N/A';
                    
                html += `
                    <div class="report-item">
                        <i class="fas fa-file-pdf"></i>
                        <div class="report-details">
                            <span class="report-title">${this.escapeHtml(reportTitle)}</span>
                            <span class="report-date">Generated: ${generationDate}</span>
                            ${report.overall_average ? `<span class="report-average">Average: ${overallAverage}</span>` : ''}
                            ${report.class_rank ? `<span class="report-rank">Rank: ${report.class_rank}/${report.total_students}</span>` : ''}
                        </div>
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
                    <div class="report-details">
                        <span class="report-title">Classroom Report - Generated ${new Date().toLocaleDateString()}</span>
                        <span class="report-date">${new Date().toLocaleDateString()}</span>
                    </div>
                    <button class="btn-small" onclick="downloadReport('placeholder1')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
                <div class="report-item">
                    <i class="fas fa-file-pdf"></i>
                    <div class="report-details">
                        <span class="report-title">Subject Analysis Report</span>
                        <span class="report-date">${new Date().toLocaleDateString()}</span>
                    </div>
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
            `<option value="${subject.id}">${this.escapeHtml(subject.name)}</option>`
        ).join('') : '<option value="">No subjects available</option>';

        const periodsOptions = Array.isArray(evaluationPeriods) ? evaluationPeriods.map(period => 
            `<option value="${period.id}">${this.escapeHtml(period.name)}</option>`
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
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="points_earned">Points Earned: <span class="required">*</span></label>
                        <input type="number" name="points_earned" min="0" step="0.01" required 
                               placeholder="Points earned">
                    </div>
                    <div class="form-group">
                        <label for="points_possible">Points Possible: <span class="required">*</span></label>
                        <input type="number" name="points_possible" min="0.01" step="0.01" required 
                               value="20" placeholder="Total points">
                    </div>
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
                           maxlength="200">
                </div>
                
                <div class="form-group">
                    <label for="evaluation_date">Evaluation Date:</label>
                    <input type="date" name="evaluation_date" max="${new Date().toISOString().split('T')[0]}">
                </div>
                
                <div class="form-group">
                    <label for="weight">Weight:</label>
                    <input type="number" name="weight" min="0.1" step="0.1" value="1.0" 
                           placeholder="Grade weight">
                </div>
                
                <div class="form-group">
                    <label for="comments">Comments:</label>
                    <textarea name="comments" rows="3" placeholder="Optional comments"
                              maxlength="1000"></textarea>
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" name="is_excused" value="true">
                        Excused
                    </label>
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
        
        // FIX: Ensure boolean conversion
        gradeData.is_excused = formData.has('is_excused');
        
        try {
            // FIX: Create evaluation if needed (this handles the evaluation_period_id -> evaluation_id mapping)
            if (!gradeData.evaluation_id && gradeData.evaluation_period_id) {
                gradeData.evaluation_id = await this.createEvaluationIfNeeded(gradeData);
            }
            
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

    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    calculateGPA(grades) {
        if (!Array.isArray(grades) || grades.length === 0) {
            return 0;
        }

        // FIX: Use backend percentage field instead of grade
        const totalPoints = grades.reduce((sum, grade) => {
            const percentage = grade.percentage || 0;
            return sum + percentage;
        }, 0);
        
        return Math.round((totalPoints / grades.length) * 100) / 100;
    }

    getGradeLevel(percentage) {
        if (percentage >= 90) return 'Excellent';
        if (percentage >= 80) return 'Very Good';
        if (percentage >= 70) return 'Good';
        if (percentage >= 60) return 'Satisfactory';
        if (percentage >= 50) return 'Pass';
        return 'Fail';
    }

    downloadReport(reportId) {
        console.log('Downloading report:', reportId);
        
        if (reportId.startsWith('placeholder')) {
            this.authManager.showMessage('This is a demo report. In production, this would download the actual report file.', 'info');
            return;
        }

        try {
            // FIX: Use proper endpoint for report download
            const endpointConfig = resolveEndpoint(
                API_CONFIG.endpoints.reports.download,
                reportId
            );
            
            // Create download link
            const downloadUrl = `${API_CONFIG.baseUrl}${endpointConfig.path}`;
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `report_${reportId}.pdf`;
            
            // Add auth header for download
            if (this.authManager.token) {
                // For file downloads, we might need to handle auth differently
                // This is a simplified approach
                this.authManager.showMessage('Report download initiated...', 'info');
                window.open(downloadUrl, '_blank');
            }
        } catch (error) {
            console.error('Error downloading report:', error);
            this.authManager.showMessage('Failed to download report', 'error');
        }
    }
}