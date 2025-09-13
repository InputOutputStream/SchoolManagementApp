import { API_CONFIG } from './config.js';

// Student Management Class
export class StudentManager {
    constructor(authManager) {
        this.authManager = authManager;
    }

    async getStudents() {
        try {
            const students = await this.authManager.apiClient.get(API_CONFIG.endpoints.students.list);
            return students;
        } catch (error) {
            console.error('Error fetching students:', error);
            this.authManager.showMessage('Failed to fetch students: ' + error.message, 'error');
            throw error;
        }
    }

    async registerStudent(studentData) {
        // Validate required fields
        const requiredFields = ['first_name', 'last_name', 'email', 'student_number'];
        const missingFields = requiredFields.filter(field => !studentData[field] || !studentData[field].toString().trim());
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        try {
            const result = await this.authManager.apiClient.post(API_CONFIG.endpoints.students.register, studentData, false);
            this.authManager.showMessage('Student registered successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error registering student:', error);
            this.authManager.showMessage('Failed to register student: ' + error.message, 'error');
            throw error;
        }
    }

    async updateStudent(studentId, studentData) {
        if (!studentId) {
            throw new Error('Student ID is required');
        }

        try {
            const url = `${API_CONFIG.endpoints.students.update}/${studentId}`;
            const result = await this.authManager.apiClient.put(url, studentData);
            this.authManager.showMessage('Student updated successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error updating student:', error);
            this.authManager.showMessage('Failed to update student: ' + error.message, 'error');
            throw error;
        }
    }

    async getStudent(studentId) {
        if (!studentId) {
            throw new Error('Student ID is required');
        }

        try {
            const url = `${API_CONFIG.endpoints.students.update}/${studentId}`;
            const student = await this.authManager.apiClient.get(url);
            return student;
        } catch (error) {
            console.error('Error fetching student:', error);
            throw error;
        }
    }

    async deleteStudent(studentId) {
        if (!studentId) {
            throw new Error('Student ID is required');
        }

        try {
            const url = `${API_CONFIG.endpoints.students.update}/${studentId}`;
            const result = await this.authManager.apiClient.delete(url);
            this.authManager.showMessage('Student deleted successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error deleting student:', error);
            this.authManager.showMessage('Failed to delete student: ' + error.message, 'error');
            throw error;
        }
    }

    // Validation helper methods
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validateStudentNumber(studentNumber) {
        // Assuming student number should be alphanumeric and at least 3 characters
        const studentNumberRegex = /^[A-Za-z0-9]{3,}$/;
        return studentNumberRegex.test(studentNumber);
    }

    validateStudentData(studentData) {
        const errors = [];

        if (!studentData.first_name || studentData.first_name.trim().length < 2) {
            errors.push('First name must be at least 2 characters long');
        }

        if (!studentData.last_name || studentData.last_name.trim().length < 2) {
            errors.push('Last name must be at least 2 characters long');
        }

        if (!studentData.email || !this.validateEmail(studentData.email)) {
            errors.push('Valid email address is required');
        }

        if (!studentData.student_number || !this.validateStudentNumber(studentData.student_number)) {
            errors.push('Valid student number is required (alphanumeric, min 3 characters)');
        }

        if (studentData.date_of_birth) {
            const birthDate = new Date(studentData.date_of_birth);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            
            if (age < 5 || age > 100) {
                errors.push('Invalid date of birth');
            }
        }

        return errors;
    }
}