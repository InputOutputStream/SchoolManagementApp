export class FileImportManager {
    constructor(authManager, dashboardManager) {
        this.authManager = authManager;
        this.dashboardManager = dashboardManager;
    }

    async handleFileImport(event, type) {
        const file = event.target.files[0];
        if (!file) {
            this.showMessage('No file selected', 'error');
            return;
        }

        // Check file type
        const validTypes = ['.csv', '.xlsx', '.xls'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (!validTypes.includes(fileExtension)) {
            this.showMessage('Invalid file type. Please select a CSV or Excel file.', 'error');
            return;
        }

        try {
            let data;
            if (fileExtension === '.csv') {
                data = await this.parseCSVFile(file);
            } else {
                data = await this.parseExcelFile(file);
            }

            await this.processImportData(data, type);
            
        } catch (error) {
            console.error('File import error:', error);
            this.showMessage('Error importing file: ' + error.message, 'error');
        }
    }

    async parseCSVFile(file) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                delimitersToGuess: [',', '\t', ';', '|'],
                complete: (results) => {
                    if (results.errors.length > 0) {
                        console.warn('CSV parsing warnings:', results.errors);
                    }
                    
                    // Clean headers (remove whitespace)
                    const cleanedData = results.data.map(row => {
                        const cleanedRow = {};
                        Object.keys(row).forEach(key => {
                            const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
                            cleanedRow[cleanKey] = row[key];
                        });
                        return cleanedRow;
                    });
                    
                    resolve(cleanedData);
                },
                error: (error) => {
                    reject(new Error('Failed to parse CSV file: ' + error.message));
                }
            });
        });
    }

    async parseExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Get first worksheet
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Convert to JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                        header: 1,
                        defval: null 
                    });
                    
                    if (jsonData.length === 0) {
                        reject(new Error('Excel file is empty'));
                        return;
                    }
                    
                    // Convert to objects with headers
                    const headers = jsonData[0].map(header => 
                        header ? header.toString().trim().toLowerCase().replace(/\s+/g, '_') : ''
                    );
                    
                    const data2 = jsonData.slice(1).map(row => {
                        const obj = {};
                        headers.forEach((header, index) => {
                            if (header) {
                                obj[header] = row[index] !== null ? row[index] : undefined;
                            }
                        });
                        return obj;
                    }).filter(row => Object.values(row).some(value => value !== undefined && value !== null && value !== ''));
                    
                    resolve(data2);
                } catch (error) {
                    reject(new Error('Failed to parse Excel file: ' + error.message));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    async processImportData(data, type) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('No data found in file');
        }

        let results = { successCount: 0, errorCount: 0, errors: [] };

        switch (type) {
            case 'students':
                results = await this.processStudentsImport(data);
                break;
            case 'teachers':
                results = await this.processTeachersImport(data);
                break;
            case 'classrooms':
                results = await this.processClassroomsImport(data);
                break;
            case 'subjects':
                results = await this.processSubjectsImport(data);
                break;
            default:
                throw new Error('Invalid import type');
        }

        // Show results
        let message = `Import completed: ${results.successCount} successful`;
        if (results.errorCount > 0) {
            message += `, ${results.errorCount} failed`;
            if (results.errors.length > 0) {
                message += `\nFirst few errors: ${results.errors.slice(0, 3).join('; ')}`;
            }
        }

        this.showMessage(message, results.errorCount > 0 ? 'warning' : 'success');
    }

    // FIX: Student import with proper data transformation
    async processStudentsImport(data) {
        const requiredFields = ['first_name', 'last_name', 'email', 'student_number'];
        const results = { successCount: 0, errorCount: 0, errors: [] };
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            try {
                // Validate required fields
                const missingFields = requiredFields.filter(field => !row[field]);
                if (missingFields.length > 0) {
                    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
                }

                // FIX: Transform data to match backend Student schema
                const studentData = {
                    // User data
                    first_name: this.sanitizeString(row.first_name),
                    last_name: this.sanitizeString(row.last_name),
                    email: this.sanitizeEmail(row.email),
                    password: row.password || this.generatePassword(),
                    
                    // Student data
                    student_number: this.sanitizeString(row.student_number),
                    date_of_birth: this.formatDate(row.date_of_birth),
                    address: this.sanitizeString(row.address, 500), // Text field, reasonable limit
                    phone: this.sanitizeString(row.phone_number || row.phone, 20), // Backend field is 'phone'
                    
                    // Parent information
                    parent_name: this.sanitizeString(row.parent_name, 200),
                    parent_email: row.parent_email ? this.sanitizeEmail(row.parent_email) : null,
                    parent_phone: this.sanitizeString(row.parent_phone, 20),
                    
                    // Classroom resolution
                    classroom_id: await this.resolveClassroomId(row.classroom_name || row.classroom_id),
                    
                    // Enrollment info
                    enrollment_date: this.formatDate(row.enrollment_date) || new Date().toISOString().split('T')[0],
                    is_enrolled: this.parseBoolean(row.is_enrolled, true) // Default to true
                };

                // Create student via API
                await this.authManager.apiClient.post(
                    this.authManager.apiClient.authManager.constructor.name.includes('API_CONFIG') 
                        ? '/students/register' 
                        : '/admin/students', 
                    studentData
                );
                
                results.successCount++;
            } catch (error) {
                results.errorCount++;
                results.errors.push(`Row ${i + 2}: ${error.message}`);
            }
        }
        
        return results;
    }

    // FIX: Teacher import with proper data transformation
    async processTeachersImport(data) {
        if (!this.authManager.currentUser || this.authManager.currentUser.role !== 'admin') {
            throw new Error('Admin privileges required for teacher import');
        }

        const requiredFields = ['first_name', 'last_name', 'email', 'employee_number'];
        const results = { successCount: 0, errorCount: 0, errors: [] };
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            try {
                // Validate required fields
                const missingFields = requiredFields.filter(field => !row[field]);
                if (missingFields.length > 0) {
                    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
                }

                // FIX: Transform data to match backend Teacher schema
                const teacherData = {
                    // User data
                    first_name: this.sanitizeString(row.first_name, 100),
                    last_name: this.sanitizeString(row.last_name, 100),
                    email: this.sanitizeEmail(row.email),
                    password: row.password || this.generatePassword(),
                    
                    // Teacher data
                    employee_number: this.sanitizeString(row.employee_number, 20),
                    specialization: this.sanitizeString(row.specialization, 100),
                    phone_number: this.sanitizeString(row.phone_number || row.phone, 20),
                    
                    // Boolean field
                    is_head_teacher: this.parseBoolean(row.is_head_teacher),
                    
                    // Date field
                    hire_date: this.formatDate(row.hire_date) || new Date().toISOString().split('T')[0]
                };

                // Create teacher via API
                await this.authManager.apiClient.post('/admin/teachers', teacherData);
                results.successCount++;
            } catch (error) {
                results.errorCount++;
                results.errors.push(`Row ${i + 2}: ${error.message}`);
            }
        }
        
        return results;
    }

    // FIX: Classroom import with proper data transformation
    async processClassroomsImport(data) {
        if (!this.authManager.currentUser || this.authManager.currentUser.role !== 'admin') {
            throw new Error('Admin privileges required for classroom import');
        }

        const requiredFields = ['name', 'grade_level'];
        const results = { successCount: 0, errorCount: 0, errors: [] };
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            try {
                // Validate required fields
                const missingFields = requiredFields.filter(field => !row[field] && !row.level);
                if (missingFields.length > 0) {
                    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
                }

                // FIX: Transform data to match backend Classroom schema
                const classroomData = {
                    name: this.sanitizeString(row.name, 50),
                    level: this.sanitizeString(row.grade_level || row.level, 50), // Backend field is 'level'
                    description: this.sanitizeString(row.description, 500),
                    max_students: row.capacity ? parseInt(row.capacity) : null, // Backend field is 'max_students'
                    academic_year: this.getCurrentAcademicYear(),
                    
                    // Handle head teacher assignment
                    head_teacher_email: row.head_teacher_email ? this.sanitizeEmail(row.head_teacher_email) : null
                };

                // Create classroom via API
                await this.authManager.apiClient.post('/admin/classrooms', classroomData);
                results.successCount++;
            } catch (error) {
                results.errorCount++;
                results.errors.push(`Row ${i + 2}: ${error.message}`);
            }
        }
        
        return results;
    }

    // FIX: Subject import with proper data transformation
    async processSubjectsImport(data) {
        if (!this.authManager.currentUser || this.authManager.currentUser.role !== 'admin') {
            throw new Error('Admin privileges required for subject import');
        }

        const requiredFields = ['name', 'code'];
        const results = { successCount: 0, errorCount: 0, errors: [] };
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            try {
                // Validate required fields
                const missingFields = requiredFields.filter(field => !row[field]);
                if (missingFields.length > 0) {
                    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
                }

                // FIX: Transform data to match backend Subject schema
                const subjectData = {
                    name: this.sanitizeString(row.name, 100),
                    code: this.sanitizeString(row.code, 20).toUpperCase(),
                    description: this.sanitizeString(row.description, 500),
                    
                    // FIX: Backend expects Integer coefficient
                    coefficient: row.coefficient ? Math.round(parseFloat(row.coefficient)) : 1
                };

                // Create subject via API
                await this.authManager.apiClient.post('/admin/subjects', subjectData);
                results.successCount++;
            } catch (error) {
                results.errorCount++;
                results.errors.push(`Row ${i + 2}: ${error.message}`);
            }
        }
        
        return results;
    }

    // FIX: Data transformation helper methods
    sanitizeString(value, maxLength = null) {
        if (!value) return null;
        
        let sanitized = String(value).trim();
        if (maxLength && sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength);
        }
        
        return sanitized || null;
    }

    sanitizeEmail(value) {
        if (!value) return null;
        
        const email = String(value).trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(email)) {
            throw new Error(`Invalid email format: ${email}`);
        }
        
        if (email.length > 255) {
            throw new Error(`Email too long: ${email}`);
        }
        
        return email;
    }

    formatDate(value) {
        if (!value) return null;
        
        try {
            const date = new Date(value);
            if (isNaN(date.getTime())) return null;
            
            // Return in YYYY-MM-DD format
            return date.toISOString().split('T')[0];
        } catch (error) {
            console.warn('Invalid date format:', value);
            return null;
        }
    }

    parseBoolean(value, defaultValue = false) {
        if (value === null || value === undefined) return defaultValue;
        
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value === 1;
        if (typeof value === 'string') {
            const lowerValue = value.toLowerCase().trim();
            return lowerValue === 'true' || lowerValue === 'yes' || lowerValue === '1';
        }
        
        return defaultValue;
    }

    generatePassword(length = 12) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        
        return password;
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

    // FIX: Resolve classroom ID from name
    async resolveClassroomId(classroomValue) {
        if (!classroomValue) return null;
        
        // If it's already a number, use it
        if (Number.isInteger(Number(classroomValue))) {
            return parseInt(classroomValue);
        }
        
        // If it's a classroom name, resolve to ID via API
        try {
            const classrooms = await this.authManager.apiClient.get('/admin/classrooms');
            const classroom = classrooms.find(c => 
                c.name.toLowerCase() === String(classroomValue).toLowerCase()
            );
            
            return classroom ? classroom.id : null;
        } catch (error) {
            console.warn('Could not resolve classroom by name:', classroomValue, error);
            return null;
        }
    }

    downloadTemplate(type) {
        const templates = {
            students: [
                ['first_name', 'last_name', 'email', 'student_number', 'date_of_birth', 'phone_number', 'address', 'classroom_name', 'parent_name', 'parent_email', 'parent_phone'],
                ['John', 'Doe', 'john.doe@email.com', 'STU001', '2005-01-15', '123-456-7890', '123 Main St', 'Grade 10A', 'Jane Doe', 'jane.doe@email.com', '098-765-4321'],
                ['Jane', 'Smith', 'jane.smith@email.com', 'STU002', '2005-03-22', '987-654-3210', '456 Oak Ave', 'Grade 10B', 'Bob Smith', 'bob.smith@email.com', '111-222-3333']
            ],
            teachers: [
                ['first_name', 'last_name', 'email', 'employee_number', 'specialization', 'phone_number', 'is_head_teacher', 'hire_date'],
                ['Alice', 'Johnson', 'alice.johnson@school.com', 'TEA001', 'Mathematics', '555-0101', 'false', '2024-01-15'],
                ['Bob', 'Wilson', 'bob.wilson@school.com', 'TEA002', 'English', '555-0102', 'true', '2023-09-01']
            ],
            classrooms: [
                ['name', 'grade_level', 'description', 'capacity', 'head_teacher_email'],
                ['Grade 10A', '10', 'Science-focused classroom', '30', 'alice.johnson@school.com'],
                ['Grade 10B', '10', 'Arts-focused classroom', '28', 'bob.wilson@school.com']
            ],
            subjects: [
                ['name', 'code', 'description', 'coefficient'],
                ['Mathematics', 'MATH101', 'Basic Mathematics', '2'],
                ['English', 'ENG101', 'English Language Arts', '2'],
                ['Science', 'SCI101', 'General Science', '2']
            ]
        };

        const templateData = templates[type];
        if (!templateData) {
            this.showMessage('Invalid template type', 'error');
            return;
        }

        // Create CSV content
        const csvContent = templateData.map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${type}_template.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        this.showMessage(`${type} template downloaded successfully`, 'success');
    }

    // Unified message display method
    showMessage(message, type) {
        if (window.uiUtils && typeof window.uiUtils.showMessage === 'function') {
            window.uiUtils.showMessage(message, type);
        } else if (this.authManager && typeof this.authManager.showMessage === 'function') {
            this.authManager.showMessage(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}