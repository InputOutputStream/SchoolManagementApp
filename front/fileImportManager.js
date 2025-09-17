export class FileImportManager {
    constructor(authManager, dashboardManager) {
        this.authManager = authManager;
        this.dashboardManager = dashboardManager;
    }

    async handleFileImport(event, type) {
        const file = event.target.files[0];
        if (!file) {
            this.authManager.showMessage('No file selected', 'error');
            return;
        }

        // Check file type
        const validTypes = ['.csv', '.xlsx', '.xls'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (!validTypes.includes(fileExtension)) {
            this.authManager.showMessage('Invalid file type. Please select a CSV or Excel file.', 'error');
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
            this.authManager.showMessage('Error importing file: ' + error.message, 'error');
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

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        switch (type) {
            case 'students':
                await this.processStudentsImport(data, successCount, errorCount, errors);
                break;
            case 'teachers':
                await this.processTeachersImport(data, successCount, errorCount, errors);
                break;
            case 'classrooms':
                await this.processClassroomsImport(data, successCount, errorCount, errors);
                break;
            case 'subjects':
                await this.processSubjectsImport(data, successCount, errorCount, errors);
                break;
            default:
                throw new Error('Invalid import type');
        }

        // Show results
        let message = `Import completed: ${successCount} successful`;
        if (errorCount > 0) {
            message += `, ${errorCount} failed`;
            if (errors.length > 0) {
                message += `\nFirst few errors: ${errors.slice(0, 3).join('; ')}`;
            }
        }

        this.authManager.showMessage(message, errorCount > 0 ? 'warning' : 'success');
    }

    async processStudentsImport(data, successCount, errorCount, errors) {
        const requiredFields = ['first_name', 'last_name', 'email', 'student_number'];
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            try {
                // Validate required fields
                const missingFields = requiredFields.filter(field => !row[field]);
                if (missingFields.length > 0) {
                    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
                }

                // Format student data
                const studentData = {
                    first_name: row.first_name,
                    last_name: row.last_name,
                    email: row.email,
                    student_number: row.student_number,
                    date_of_birth: row.date_of_birth || null,
                    phone_number: row.phone_number || null,
                    address: row.address || null,
                    classroom_name: row.classroom_name || null
                };

                // Register student (assuming we have a student manager)
                if (window.studentManager) {
                    await window.studentManager.registerStudent(studentData);
                }
                
                successCount++;
            } catch (error) {
                errorCount++;
                errors.push(`Row ${i + 2}: ${error.message}`);
            }
        }
    }

    async processTeachersImport(data, successCount, errorCount, errors) {
        if (!this.authManager.currentUser || this.authManager.currentUser.role !== 'admin') {
            throw new Error('Admin privileges required for teacher import');
        }

        const requiredFields = ['first_name', 'last_name', 'email', 'employee_number'];
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            try {
                // Validate required fields
                const missingFields = requiredFields.filter(field => !row[field]);
                if (missingFields.length > 0) {
                    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
                }

                // Format teacher data
                const teacherData = {
                    first_name: row.first_name,
                    last_name: row.last_name,
                    email: row.email,
                    employee_number: row.employee_number,
                    specialization: row.specialization || null,
                    phone_number: row.phone_number || null,
                    is_head_teacher: this.parseBoolean(row.is_head_teacher)
                };

                // Create teacher
                await this.authManager.apiClient.post('/admin/teachers', teacherData);
                successCount++;
            } catch (error) {
                errorCount++;
                errors.push(`Row ${i + 2}: ${error.message}`);
            }
        }
    }

    async processClassroomsImport(data, successCount, errorCount, errors) {
        if (!this.authManager.currentUser || this.authManager.currentUser.role !== 'admin') {
            throw new Error('Admin privileges required for classroom import');
        }

        const requiredFields = ['name', 'grade_level'];
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            try {
                // Validate required fields
                const missingFields = requiredFields.filter(field => !row[field]);
                if (missingFields.length > 0) {
                    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
                }

                // Format classroom data
                const classroomData = {
                    name: row.name,
                    grade_level: row.grade_level,
                    description: row.description || null,
                    capacity: row.capacity ? parseInt(row.capacity) : null,
                    head_teacher_email: row.head_teacher_email || null
                };

                // Create classroom
                await this.authManager.apiClient.post('/admin/classrooms', classroomData);
                successCount++;
            } catch (error) {
                errorCount++;
                errors.push(`Row ${i + 2}: ${error.message}`);
            }
        }
    }

    async processSubjectsImport(data, successCount, errorCount, errors) {
        if (!this.authManager.currentUser || this.authManager.currentUser.role !== 'admin') {
            throw new Error('Admin privileges required for subject import');
        }

        const requiredFields = ['name', 'code'];
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            try {
                // Validate required fields
                const missingFields = requiredFields.filter(field => !row[field]);
                if (missingFields.length > 0) {
                    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
                }

                // Format subject data
                const subjectData = {
                    name: row.name,
                    code: row.code,
                    description: row.description || null,
                    coefficient: row.coefficient ? parseFloat(row.coefficient) : 1
                };

                // Create subject
                await this.authManager.apiClient.post('/admin/subjects', subjectData);
                successCount++;
            } catch (error) {
                errorCount++;
                errors.push(`Row ${i + 2}: ${error.message}`);
            }
        }
    }

    async processStudentsImport(data, successCount, errorCount, errors) {
        const requiredFields = ['first_name', 'last_name', 'email', 'student_number'];
        const results = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            try {
                const missingFields = requiredFields.filter(field => !row[field]);
                if (missingFields.length > 0) {
                    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
                }
                results.push({ data: row });
            } catch (error) {
                errors.push(`Row ${i + 2}: ${error.message}`);
                errorCount++;
            }
        }

        // Effectuer les imports uniquement si toutes les validations passent
        if (errors.length === 0) {
            for (const result of results) {
                try {
                    await this.authManager.apiClient.post('/students/register', result.data);
                    successCount++;
                } catch (error) {
                    errors.push(`Row ${result.data.student_number}: ${error.message}`);
                    errorCount++;
                }
            }
        }

        return { successCount, errorCount, errors };
    }

    downloadTemplate(type) {
        const templates = {
            students: [
                ['first_name', 'last_name', 'email', 'student_number', 'date_of_birth', 'phone_number', 'address', 'classroom_name'],
                ['John', 'Doe', 'john.doe@email.com', 'STU001', '2005-01-15', '123-456-7890', '123 Main St', 'Grade 10A'],
                ['Jane', 'Smith', 'jane.smith@email.com', 'STU002', '2005-03-22', '987-654-3210', '456 Oak Ave', 'Grade 10B']
            ],
            teachers: [
                ['first_name', 'last_name', 'email', 'employee_number', 'specialization', 'phone_number', 'is_head_teacher'],
                ['Alice', 'Johnson', 'alice.johnson@school.com', 'TEA001', 'Mathematics', '555-0101', 'false'],
                ['Bob', 'Wilson', 'bob.wilson@school.com', 'TEA002', 'English', '555-0102', 'true']
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
                ['Science', 'SCI101', 'General Science', '1.5']
            ]
        };

        const templateData = templates[type];
        if (!templateData) {
            this.authManager.showMessage('Invalid template type', 'error');
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

        this.authManager.showMessage(`${type} template downloaded successfully`, 'success');
    }

    parseBoolean(value) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const lowerValue = value.toLowerCase().trim();
            return lowerValue === 'true' || lowerValue === 'yes' || lowerValue === '1';
        }
        if (typeof value === 'number') return value === 1;
        return false;
    }
}