import { API_CONFIG, resolveEndpoint } from './config.js';

// Student Management Class - Fixed to match backend schema
export class StudentManager {
    constructor(authManager) {
        this.authManager = authManager;
    }

    async getStudents() {
        try {
            const students = await this.authManager.apiClient.get(API_CONFIG.endpoints.students.list);
            return Array.isArray(students) ? students : [];
        } catch (error) {
            console.error('Error fetching students:', error);
            this.authManager.showMessage('Failed to fetch students: ' + error.message, 'error');
            throw error;
        }
    }

    async registerStudent(studentData) {
        // FIX: Validate and transform data to match backend schema
        const transformedData = this.transformStudentDataForBackend(studentData);
        
        const errors = this.validateStudentData(transformedData);
        if (errors.length > 0) {
            throw new Error(`Validation errors: ${errors.join(', ')}`);
        }

        try {
            const result = await this.authManager.apiClient.post(
                API_CONFIG.endpoints.students.register, 
                transformedData, 
                false // requiresAuth = false for registration
            );
            this.authManager.showMessage('Student registered successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error registering student:', error);
            this.authManager.showMessage('Failed to register student: ' + error.message, 'error');
            throw error;
        }
    }

    // FIX: Transform frontend data to match backend schema
    transformStudentDataForBackend(studentData) {
        return {
            // User data (backend creates User first, then Student)
            first_name: studentData.first_name?.toString().trim() || null,
            last_name: studentData.last_name?.toString().trim() || null,
            email: studentData.email?.toString().trim() || null,
            
            // Student-specific data matching backend schema
            student_number: studentData.student_number?.toString().trim() || null,
            
            // FIX: Backend uses classroom_id (Integer), not classroom_name
            classroom_id: this.parseClassroomId(studentData.classroom_name || studentData.classroom_id),
            
            // FIX: Backend expects date_of_birth (Date), renamed from date_of_birth
            date_of_birth: this.validateAndFormatDate(studentData.date_of_birth),
            
            // FIX: Backend field is 'address' (Text), not 'address'
            address: studentData.address?.toString().trim() || null,
            
            // FIX: Backend field is 'phone' (String, max 20), not 'phone_number'
            phone: studentData.phone_number?.toString().trim() || studentData.phone?.toString().trim() || null,
            
            // FIX: Additional backend fields
            parent_name: studentData.parent_name?.toString().trim() || null,
            parent_email: studentData.parent_email?.toString().trim() || null,
            parent_phone: studentData.parent_phone?.toString().trim() || null,
            enrollment_date: studentData.enrollment_date ? 
                this.validateAndFormatDate(studentData.enrollment_date) : 
                new Date().toISOString().split('T')[0],
            is_enrolled: Boolean(studentData.is_enrolled !== false), // Default to true
            
            // Password for user account
            password: studentData.password || null
        };
    }

    // FIX: Helper to parse classroom from name to ID
    parseClassroomId(classroomValue) {
        if (!classroomValue) return null;
        
        // If it's already a number, use it
        if (Number.isInteger(Number(classroomValue))) {
            return parseInt(classroomValue);
        }
        
        // If it's a classroom name, we need to resolve it to ID
        // For now, return null - this should be handled by backend or resolved via API call
        console.warn('Classroom name provided instead of ID:', classroomValue);
        return null;
    }

    // FIX: Validate and format date strings
    validateAndFormatDate(dateString) {
        if (!dateString) return null;
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return null;
            }
            // Return in YYYY-MM-DD format
            return date.toISOString().split('T')[0];
        } catch (error) {
            console.warn('Invalid date format:', dateString);
            return null;
        }
    }

    async updateStudent(studentId, studentData) {
        if (!studentId) {
            throw new Error('Student ID is required');
        }

        // FIX: Transform data to match backend schema
        const transformedData = this.transformStudentDataForBackend(studentData);
        
        const errors = this.validateStudentData(transformedData, false); // false = not for creation
        if (errors.length > 0) {
            throw new Error(`Validation errors: ${errors.join(', ')}`);
        }

        try {
            const endpointConfig = resolveEndpoint(
                API_CONFIG.endpoints.students.update,
                studentId
            );
            
            const result = await this.authManager.apiClient.put(endpointConfig, transformedData);
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
            const endpointConfig = resolveEndpoint(
                API_CONFIG.endpoints.students.details,
                studentId
            );
            
            const student = await this.authManager.apiClient.get(endpointConfig);
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
            const endpointConfig = resolveEndpoint(
                API_CONFIG.endpoints.students.delete,
                studentId
            );
            
            const result = await this.authManager.apiClient.delete(endpointConfig);
            this.authManager.showMessage('Student deleted successfully!', 'success');
            return result;
        } catch (error) {
            console.error('Error deleting student:', error);
            this.authManager.showMessage('Failed to delete student: ' + error.message, 'error');
            throw error;
        }
    }

    // FIX: Validation updated to match backend schema constraints
    validateStudentData(studentData, isCreation = true) {
        const errors = [];

        // Required fields validation
        if (!studentData.first_name || studentData.first_name.length < 2) {
            errors.push('First name must be at least 2 characters long');
        }

        if (!studentData.last_name || studentData.last_name.length < 2) {
            errors.push('Last name must be at least 2 characters long');
        }

        if (!studentData.email || !this.validateEmail(studentData.email)) {
            errors.push('Valid email address is required');
        }

        if (!studentData.student_number || !this.validateStudentNumber(studentData.student_number)) {
            errors.push('Valid student number is required (alphanumeric, min 3 characters)');
        }

        // FIX: Validate field lengths according to backend schema
        if (studentData.first_name && studentData.first_name.length > 100) {
            errors.push('First name must be 100 characters or less');
        }

        if (studentData.last_name && studentData.last_name.length > 100) {
            errors.push('Last name must be 100 characters or less');
        }

        if (studentData.email && studentData.email.length > 255) {
            errors.push('Email must be 255 characters or less');
        }

        if (studentData.student_number && studentData.student_number.length > 20) {
            errors.push('Student number must be 20 characters or less');
        }

        // FIX: Validate phone field (backend: max 20 chars)
        if (studentData.phone && studentData.phone.length > 20) {
            errors.push('Phone number must be 20 characters or less');
        }

        // FIX: Validate parent fields according to backend schema
        if (studentData.parent_name && studentData.parent_name.length > 200) {
            errors.push('Parent name must be 200 characters or less');
        }

        if (studentData.parent_email && !this.validateEmail(studentData.parent_email)) {
            errors.push('Valid parent email address is required if provided');
        }

        if (studentData.parent_email && studentData.parent_email.length > 255) {
            errors.push('Parent email must be 255 characters or less');
        }

        if (studentData.parent_phone && studentData.parent_phone.length > 20) {
            errors.push('Parent phone number must be 20 characters or less');
        }

        // Date validation
        if (studentData.date_of_birth) {
            const birthDate = new Date(studentData.date_of_birth);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            
            if (isNaN(birthDate.getTime())) {
                errors.push('Invalid date of birth format');
            } else if (age < 3 || age > 30) {
                errors.push('Invalid date of birth - age must be between 3 and 30 years');
            }
        }

        // FIX: Validate enrollment_date if provided
        if (studentData.enrollment_date) {
            const enrollDate = new Date(studentData.enrollment_date);
            const today = new Date();
            
            if (isNaN(enrollDate.getTime())) {
                errors.push('Invalid enrollment date format');
            } else if (enrollDate > today) {
                errors.push('Enrollment date cannot be in the future');
            }
        }

        // FIX: Validate classroom_id if provided
        if (studentData.classroom_id && (!Number.isInteger(studentData.classroom_id) || studentData.classroom_id <= 0)) {
            errors.push('Classroom ID must be a positive integer');
        }

        return errors;
    }

    // Validation helper methods
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validateStudentNumber(studentNumber) {
        // FIX: More flexible student number validation (alphanumeric, min 3, max 20)
        const studentNumberRegex = /^[A-Za-z0-9]{3,20}$/;
        return studentNumberRegex.test(studentNumber);
    }

    // FIX: Additional utility methods for data transformation
    async resolveClassroomByName(classroomName) {
        if (!classroomName || typeof classroomName !== 'string') {
            return null;
        }

        try {
            // Fetch all classrooms and find by name
            const classrooms = await this.authManager.apiClient.get(API_CONFIG.endpoints.admin.classrooms.list);
            const classroom = classrooms.find(c => c.name.toLowerCase() === classroomName.toLowerCase());
            return classroom ? classroom.id : null;
        } catch (error) {
            console.warn('Could not resolve classroom by name:', error);
            return null;
        }
    }

    // FIX: Method to get students by classroom (used by other managers)
    async getStudentsByClassroom(classroomId) {
        if (!classroomId) {
            throw new Error('Classroom ID is required');
        }

        try {
            const endpointConfig = resolveEndpoint(
                API_CONFIG.endpoints.students.classroomStudents,
                classroomId
            );
            
            const students = await this.authManager.apiClient.get(endpointConfig);
            return Array.isArray(students) ? students : [];
        } catch (error) {
            console.error('Error fetching classroom students:', error);
            throw error;
        }
    }

    // FIX: Method to bulk register students (for import functionality)
    async bulkRegisterStudents(studentsData) {
        if (!Array.isArray(studentsData) || studentsData.length === 0) {
            throw new Error('Students data array is required');
        }

        const results = {
            successful: 0,
            failed: 0,
            errors: []
        };

        for (let i = 0; i < studentsData.length; i++) {
            const studentData = studentsData[i];
            
            try {
                await this.registerStudent(studentData);
                results.successful++;
            } catch (error) {
                results.failed++;
                results.errors.push(`Row ${i + 1}: ${error.message}`);
            }
        }

        return results;
    }

    // FIX: Method to search students (for search functionality)
    searchStudents(students, query) {
        if (!Array.isArray(students) || !query || typeof query !== 'string') {
            return students;
        }

        const searchTerm = query.toLowerCase().trim();
        
        return students.filter(student => {
            const studentNumber = (student.student_number || '').toLowerCase();
            const firstName = (student.user?.first_name || '').toLowerCase();
            const lastName = (student.user?.last_name || '').toLowerCase();
            const email = (student.user?.email || '').toLowerCase();
            const fullName = `${firstName} ${lastName}`.trim();
            const classroom = (student.classroom?.name || '').toLowerCase();
            
            return studentNumber.includes(searchTerm) ||
                   firstName.includes(searchTerm) ||
                   lastName.includes(searchTerm) ||
                   fullName.includes(searchTerm) ||
                   email.includes(searchTerm) ||
                   classroom.includes(searchTerm);
        });
    }

    // FIX: Method to format student data for display
    formatStudentForDisplay(student) {
        if (!student) return null;

        return {
            id: student.id,
            studentNumber: student.student_number || 'N/A',
            name: `${student.user?.first_name || 'N/A'} ${student.user?.last_name || 'N/A'}`.trim(),
            email: student.user?.email || 'N/A',
            classroom: student.classroom?.name || 'Not assigned',
            classroomId: student.classroom_id,
            dateOfBirth: student.date_of_birth || null,
            phone: student.phone || 'N/A',
            address: student.address || 'N/A',
            isEnrolled: student.is_enrolled !== false,
            enrollmentDate: student.enrollment_date || null,
            parentName: student.parent_name || 'N/A',
            parentEmail: student.parent_email || 'N/A',
            parentPhone: student.parent_phone || 'N/A'
        };
    }

    // FIX: Method to validate student exists and user has access
    async validateStudentAccess(studentId, userContext) {
        try {
            const student = await this.getStudent(studentId);
            
            if (!student) {
                throw new Error('Student not found');
            }

            // Check if user has access to this student
            if (userContext && !userContext.canAccessAll) {
                const hasAccess = userContext.assignedClassrooms.includes(student.classroom_id) ||
                                userContext.headOfClassrooms.includes(student.classroom_id);
                
                if (!hasAccess) {
                    throw new Error('Access denied: You can only access students from your assigned classrooms');
                }
            }

            return student;
        } catch (error) {
            console.error('Student access validation failed:', error);
            throw error;
        }
    }
}