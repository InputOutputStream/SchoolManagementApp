// API Configuration
export const API_CONFIG = {
    baseUrl: 'http://localhost:5000/api',
    endpoints: {
        auth: {
            login: '/auth/login',
            profile: '/auth/profile'
        },
        admin: {
            teachers: '/admin/teachers',
            classrooms: '/admin/classrooms',
            subjects: '/admin/subjects',
            assignments: '/admin/assignments',
            auditLogs: '/admin/audit-logs',
            stats: '/admin/dashboard/stats'
        },
        teachers: {
            myAssignments: '/teachers/my-assignments',
            myClassrooms: '/teachers/my-classrooms'
        },
        students: {
            register: '/students/register',
            classroom: '/students/classroom',
            update: '/students',
            list: '/students'
        },
        grades: {
            add: '/grades',
            update: '/grades',
            classroom: '/grades/classroom'
        },
        reports: {
            generate: '/reports/generate',
            classroom: '/reports/classroom'
        },
        attendance: {
            record: '/attendance',
            classroom: '/attendance/classroom'
        }
    }
};