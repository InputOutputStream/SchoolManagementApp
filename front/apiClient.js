import { API_CONFIG, resolveEndpoint } from './config.js';

export class ApiClient {
    constructor(authManager) {
        this.authManager = authManager;
        this.requestInterceptors = [];
        this.responseInterceptors = [];
    }

    // Helper method to extract endpoint information from config
    getEndpointInfo(endpoint, ...params) {
        if (typeof endpoint === 'string') {
            // Handle direct string paths (fallback)
            return { path: endpoint, requiresAuth: true };
        } else if (typeof endpoint === 'function') {
            // Handle function-based endpoints with parameters
            const resolvedEndpoint = resolveEndpoint(endpoint, ...params);
            return {
                path: resolvedEndpoint.path,
                method: resolvedEndpoint.method || 'GET',
                requiresAuth: resolvedEndpoint.requiresAuth !== false,
                requiredRole: resolvedEndpoint.requiredRole
            };
        } else if (typeof endpoint === 'object' && endpoint.path) {
            // Handle structured endpoint config
            return {
                path: endpoint.path,
                method: endpoint.method || 'GET',
                requiresAuth: endpoint.requiresAuth !== false,
                requiredRole: endpoint.requiredRole
            };
        } else {
            console.error('Invalid endpoint configuration:', endpoint);
            throw new Error('Invalid endpoint configuration');
        }
    }

    // Check if user has required role
    hasRequiredRole(requiredRole) {
        if (!requiredRole) return true;
        if (!this.authManager.currentUser) return false;

        const userRole = this.authManager.currentUser.role;
        
        // Admin can access everything
        if (userRole === 'admin') return true;
        
        // Check if required role is an array or string
        if (Array.isArray(requiredRole)) {
            return requiredRole.includes(userRole);
        }
        
        return userRole === requiredRole;
    }

    // FIX: Add data transformation method to ensure proper types
    transformDataForBackend(data, endpoint) {
        if (!data || typeof data !== 'object') return data;
        
        const transformed = { ...data };
        
        // Transform based on endpoint patterns
        if (endpoint.includes('/teachers')) {
            return this.transformTeacherData(transformed);
        } else if (endpoint.includes('/classrooms')) {
            return this.transformClassroomData(transformed);
        } else if (endpoint.includes('/subjects')) {
            return this.transformSubjectData(transformed);
        } else if (endpoint.includes('/students')) {
            return this.transformStudentData(transformed);
        } else if (endpoint.includes('/grades')) {
            return this.transformGradeData(transformed);
        } else if (endpoint.includes('/attendance')) {
            return this.transformAttendanceData(transformed);
        }
        
        return transformed;
    }

    // FIX: Teacher data transformation to match backend schema
    transformTeacherData(data) {
        const transformed = {};
        
        // User fields
        if (data.first_name) transformed.first_name = String(data.first_name).trim();
        if (data.last_name) transformed.last_name = String(data.last_name).trim();
        if (data.email) transformed.email = String(data.email).trim().toLowerCase();
        if (data.password) transformed.password = String(data.password);
        
        // Teacher-specific fields
        if (data.employee_number) transformed.employee_number = String(data.employee_number).trim();
        if (data.specialization) transformed.specialization = String(data.specialization).trim();
        if (data.phone_number) transformed.phone_number = String(data.phone_number).trim();
        
        // Boolean fields - ensure proper boolean conversion
        transformed.is_head_teacher = Boolean(data.is_head_teacher);
        
        // Date fields
        if (data.hire_date) {
            transformed.hire_date = this.formatDateForBackend(data.hire_date);
        }
        
        return transformed;
    }

    // FIX: Classroom data transformation to match backend schema
    transformClassroomData(data) {
        const transformed = {};
        
        // Required fields matching backend schema
        if (data.name) transformed.name = String(data.name).trim();
        if (data.grade_level) transformed.level = String(data.grade_level).trim(); // FIX: grade_level -> level
        if (data.level) transformed.level = String(data.level).trim(); // Direct level field
        
        // Optional fields
        if (data.description) transformed.description = String(data.description).trim();
        if (data.capacity) transformed.max_students = parseInt(data.capacity); // FIX: capacity -> max_students
        if (data.max_students) transformed.max_students = parseInt(data.max_students);
        
        // FIX: Handle head teacher assignment
        if (data.head_teacher_email) transformed.head_teacher_email = String(data.head_teacher_email).trim();
        if (data.head_teacher_id) transformed.head_teacher_id = parseInt(data.head_teacher_id);
        
        // FIX: Academic year is required in backend
        transformed.academic_year = data.academic_year || this.getCurrentAcademicYear();
        
        return transformed;
    }

    // FIX: Subject data transformation to match backend schema
    transformSubjectData(data) {
        const transformed = {};
        
        // Required fields
        if (data.name) transformed.name = String(data.name).trim();
        if (data.code) transformed.code = String(data.code).trim().toUpperCase();
        
        // Optional fields
        if (data.description) transformed.description = String(data.description).trim();
        
        // FIX: Backend expects Integer coefficient, not Float
        if (data.coefficient) {
            const coeff = parseFloat(data.coefficient);
            transformed.coefficient = Number.isInteger(coeff) ? coeff : Math.round(coeff);
        } else {
            transformed.coefficient = 1; // Default value
        }
        
        return transformed;
    }

    // FIX: Student data transformation (already fixed in studentManager, but ensuring consistency)
    transformStudentData(data) {
        const transformed = {};
        
        // User fields
        if (data.first_name) transformed.first_name = String(data.first_name).trim();
        if (data.last_name) transformed.last_name = String(data.last_name).trim();
        if (data.email) transformed.email = String(data.email).trim().toLowerCase();
        if (data.password) transformed.password = String(data.password);
        
        // Student-specific fields
        if (data.student_number) transformed.student_number = String(data.student_number).trim();
        if (data.classroom_id) transformed.classroom_id = parseInt(data.classroom_id);
        if (data.phone_number) transformed.phone = String(data.phone_number).trim(); // FIX: phone_number -> phone
        if (data.phone) transformed.phone = String(data.phone).trim();
        if (data.address) transformed.address = String(data.address).trim();
        
        // Parent information
        if (data.parent_name) transformed.parent_name = String(data.parent_name).trim();
        if (data.parent_email) transformed.parent_email = String(data.parent_email).trim();
        if (data.parent_phone) transformed.parent_phone = String(data.parent_phone).trim();
        
        // Date fields
        if (data.date_of_birth) transformed.date_of_birth = this.formatDateForBackend(data.date_of_birth);
        if (data.enrollment_date) transformed.enrollment_date = this.formatDateForBackend(data.enrollment_date);
        
        // Boolean fields
        transformed.is_enrolled = Boolean(data.is_enrolled !== false);
        
        return transformed;
    }

    // FIX: Grade data transformation (enhanced from gradesReportManager)
    transformGradeData(data) {
        const transformed = {};
        
        // Required integer fields
        if (data.student_id) transformed.student_id = parseInt(data.student_id);
        if (data.subject_id) transformed.subject_id = parseInt(data.subject_id);
        if (data.evaluation_id) transformed.evaluation_id = parseInt(data.evaluation_id);
        
        // Numeric fields - backend expects Numeric type
        if (data.points_earned !== undefined) {
            transformed.points_earned = parseFloat(data.points_earned);
        } else if (data.grade !== undefined) {
            transformed.points_earned = parseFloat(data.grade);
        }
        
        if (data.points_possible !== undefined) {
            transformed.points_possible = parseFloat(data.points_possible);
        } else {
            transformed.points_possible = 20.0; // Default
        }
        
        // Calculate percentage if not provided
        if (data.percentage !== undefined) {
            transformed.percentage = parseFloat(data.percentage);
        } else if (transformed.points_possible > 0) {
            transformed.percentage = parseFloat(((transformed.points_earned / transformed.points_possible) * 100).toFixed(2));
        }
        
        // String fields with length limits
        if (data.letter_grade) {
            transformed.letter_grade = String(data.letter_grade).substr(0, 5);
        } else {
            transformed.letter_grade = this.calculateLetterGrade(transformed.percentage || 0);
        }
        
        if (data.comments) transformed.comments = String(data.comments).trim();
        
        // Boolean field
        transformed.is_excused = Boolean(data.is_excused);
        
        // User ID for created_by
        if (data.created_by) {
            transformed.created_by = parseInt(data.created_by);
        } else if (this.authManager.currentUser) {
            transformed.created_by = parseInt(this.authManager.currentUser.id);
        }
        
        return transformed;
    }

    // FIX: Attendance data transformation (enhanced from attendanceManager)
    transformAttendanceData(data) {
        const transformed = {};
        
        // Required fields
        if (data.classroom_id) transformed.classroom_id = parseInt(data.classroom_id);
        if (data.date) transformed.date = this.formatDateForBackend(data.date);
        
        // Teacher ID
        if (data.teacher_id) {
            transformed.teacher_id = parseInt(data.teacher_id);
        } else if (this.authManager.currentUser?.teacher?.id) {
            transformed.teacher_id = parseInt(this.authManager.currentUser.teacher.id);
        }
        
        // Attendance records array
        if (data.attendance_records && Array.isArray(data.attendance_records)) {
            transformed.attendance_records = data.attendance_records.map(record => ({
                student_id: parseInt(record.student_id),
                status: String(record.status).toLowerCase(),
                notes: record.notes ? String(record.notes).trim() : null,
                recorded_at: record.recorded_at || new Date().toISOString()
            }));
        }
        
        return transformed;
    }

    // FIX: Helper methods for data transformation
    formatDateForBackend(dateValue) {
        if (!dateValue) return null;
        
        try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return null;
            
            // Return in YYYY-MM-DD format for backend
            return date.toISOString().split('T')[0];
        } catch (error) {
            console.warn('Invalid date format:', dateValue);
            return null;
        }
    }

    getCurrentAcademicYear() {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        
        // Academic year typically starts in September (month 8)
        if (currentMonth >= 8) {
            return `${currentYear}-${currentYear + 1}`;
        } else {
            return `${currentYear - 1}-${currentYear}`;
        }
    }

    calculateLetterGrade(percentage) {
        if (percentage >= 90) return 'A';
        if (percentage >= 80) return 'B';
        if (percentage >= 70) return 'C';
        if (percentage >= 60) return 'D';
        return 'F';
    }

    async call(method, endpoint, data = null, requiresAuth = true, ...endpointParams) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...API_CONFIG.securityHeaders
        };

        // Extract endpoint information
        let endpointInfo;
        try {
            endpointInfo = this.getEndpointInfo(endpoint, ...endpointParams);
        } catch (error) {
            console.error('Endpoint error:', error);
            throw error;
        }

        // Use endpoint's requiresAuth setting if not explicitly overridden
        const needsAuth = requiresAuth !== false && endpointInfo.requiresAuth;

        // Check role requirements
        if (endpointInfo.requiredRole && !this.hasRequiredRole(endpointInfo.requiredRole)) {
            const requiredRoles = Array.isArray(endpointInfo.requiredRole) 
                ? endpointInfo.requiredRole.join(' or ') 
                : endpointInfo.requiredRole;
            throw new Error(`Access denied. ${requiredRoles} privileges required.`);
        }

        // Add auth token if needed
        if (needsAuth && this.authManager.token) {
            headers['Authorization'] = `Bearer ${this.authManager.token}`;
        } else if (needsAuth && !this.authManager.token) {
            throw new Error('Authentication required. Please login.');
        }

        const config = {
            method: method.toUpperCase(),
            headers: headers,
            timeout: API_CONFIG.timeout || 15000
        };

        // FIX: Transform data before sending to backend
        if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
            const transformedData = this.transformDataForBackend(data, endpointInfo.path);
            config.body = JSON.stringify(transformedData);
        }

        // Apply request interceptors
        for (const interceptor of this.requestInterceptors) {
            await interceptor(config, endpointInfo);
        }

        try {
            const url = `${API_CONFIG.baseUrl}${endpointInfo.path}`;
            console.log('Making API call to:', url, 'Method:', method, 'Auth required:', needsAuth);
            
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), config.timeout);
            
            config.signal = controller.signal;

            console.log("........................................................................................")
            console.log("The API REQUEST: ")
            console.log(url, config)
            console.log("........................................................................................")
            const response = await fetch(url, config);
            console.log("........................................................................................")
            console.log("The API RESPONSE: ")
            console.log(response)
            console.log("........................................................................................")
            clearTimeout(timeoutId);
            
            // Apply response interceptors
            for (const interceptor of this.responseInterceptors) {
                await interceptor(response);
            }
            
            // Handle authentication errors
            if (response.status === 401) {
                this.authManager.logout();
                throw new Error('Session expired. Please login again.');
            }

            // Handle forbidden errors
            if (response.status === 403) {
                throw new Error('Access forbidden. Insufficient privileges.');
            }

            // Handle other HTTP errors
            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorData.error || errorMessage;
                } catch (parseError) {
                    // If response is not JSON, use status text
                    errorMessage = response.statusText || errorMessage;
                }
                
                throw new Error(errorMessage);
            }

            // Handle empty responses
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const result = await response.json();
                return result;
            } else {
                return await response.text();
            }
            
        } catch (error) {
            // Handle network errors
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please try again.');
            }
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error. Please check your connection.');
            }
            
            throw error;
        }
    }

    // Convenience methods with proper parameter handling
    async get(endpoint, requiresAuth = true, ...params) {
        return this.call('GET', endpoint, null, requiresAuth, ...params);
    }

    async post(endpoint, data, requiresAuth = true, ...params) {
        return this.call('POST', endpoint, data, requiresAuth, ...params);
    }

    async put(endpoint, data, requiresAuth = true, ...params) {
        return this.call('PUT', endpoint, data, requiresAuth, ...params);
    }

    async patch(endpoint, data, requiresAuth = true, ...params) {
        return this.call('PATCH', endpoint, data, requiresAuth, ...params);
    }

    async delete(endpoint, requiresAuth = true, ...params) {
        return this.call('DELETE', endpoint, null, requiresAuth, ...params);
    }

    // Interceptor management
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }

    // Retry mechanism
    async callWithRetry(method, endpoint, data = null, maxRetries = API_CONFIG.retries || 3, ...params) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.call(method, endpoint, data, true, ...params);
            } catch (error) {
                lastError = error;
                
                // Don't retry on auth errors or client errors
                if (error.message.includes('Session expired') || 
                    error.message.includes('Access denied') ||
                    error.message.includes('Access forbidden')) {
                    throw error;
                }
                
                // Don't retry on the last attempt
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Exponential backoff
                const delay = Math.pow(2, attempt - 1) * 1000;
                console.log(`API call failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError;
    }
}