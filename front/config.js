const getEnvironmentConfig = () => {
  const hostname = window.location.hostname;
  let env = 'development';
  
  if (hostname.includes('staging')) {
    env = 'staging';
  } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
    env = 'development';
  } else {
    env = 'production';
  }
  
  if (window.APP_CONFIG && window.APP_CONFIG.environment) {
    env = window.APP_CONFIG.environment;
  }
  
  const configs = {
    development: {
      baseUrl: window.APP_CONFIG?.apiUrl || 'http://localhost:5000/api',
      timeout: 30000,
      retries: 2
    },
    staging: {
      baseUrl: window.APP_CONFIG?.apiUrl || 'https://staging-api.school.com/api',
      timeout: 20000,
      retries: 3
    },
    production: {
      baseUrl: window.APP_CONFIG?.apiUrl || 'https://api.school.com/api',
      timeout: 15000,
      retries: 3
    }
  };
  
  return configs[env] || configs.development;
};

// Role hierarchy and permissions
export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student'
};

export const PERMISSIONS = {
  // User Management
  CREATE_USERS: [ROLES.ADMIN],
  UPDATE_USERS: [ROLES.ADMIN],
  DELETE_USERS: [ROLES.ADMIN],
  VIEW_ALL_USERS: [ROLES.ADMIN],
  
  // Teacher Management
  CREATE_TEACHERS: [ROLES.ADMIN],
  UPDATE_TEACHERS: [ROLES.ADMIN],
  DELETE_TEACHERS: [ROLES.ADMIN],
  VIEW_ALL_TEACHERS: [ROLES.ADMIN],
  PROMOTE_TO_ADMIN: [ROLES.ADMIN], // Only admin can promote other teachers to admin
  
  // Student Management
  CREATE_STUDENTS: [ROLES.ADMIN, ROLES.TEACHER],
  UPDATE_STUDENTS: [ROLES.ADMIN, ROLES.TEACHER], // Teachers can only update their assigned students
  DELETE_STUDENTS: [ROLES.ADMIN],
  VIEW_STUDENTS: [ROLES.ADMIN, ROLES.TEACHER],
  
  // Classroom Management
  CREATE_CLASSROOMS: [ROLES.ADMIN],
  UPDATE_CLASSROOMS: [ROLES.ADMIN],
  DELETE_CLASSROOMS: [ROLES.ADMIN],
  VIEW_CLASSROOMS: [ROLES.ADMIN, ROLES.TEACHER],
  ASSIGN_TEACHERS: [ROLES.ADMIN],
  
  // Subject Management
  CREATE_SUBJECTS: [ROLES.ADMIN],
  UPDATE_SUBJECTS: [ROLES.ADMIN],
  DELETE_SUBJECTS: [ROLES.ADMIN],
  VIEW_SUBJECTS: [ROLES.ADMIN, ROLES.TEACHER],
  
  // Attendance Management
  RECORD_ATTENDANCE: [ROLES.ADMIN, ROLES.TEACHER],
  VIEW_ATTENDANCE: [ROLES.ADMIN, ROLES.TEACHER],
  UPDATE_ATTENDANCE: [ROLES.ADMIN, ROLES.TEACHER],
  
  // Grades Management
  ADD_GRADES: [ROLES.ADMIN, ROLES.TEACHER],
  UPDATE_GRADES: [ROLES.ADMIN, ROLES.TEACHER],
  VIEW_GRADES: [ROLES.ADMIN, ROLES.TEACHER],
  
  // Reports
  GENERATE_REPORTS: [ROLES.ADMIN, ROLES.TEACHER],
  VIEW_REPORTS: [ROLES.ADMIN, ROLES.TEACHER],
  
  // System Settings
  SYSTEM_SETTINGS: [ROLES.ADMIN],
  BACKUP_RESTORE: [ROLES.ADMIN]
};

export const API_CONFIG = {
  ...getEnvironmentConfig(),
  
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  
  securityHeaders: {
    'X-Requested-With': 'XMLHttpRequest',
    'Cache-Control': 'no-cache'
  },
  
  endpoints: {
    // Authentication endpoints
    auth: {
      login: { 
        path: '/auth/login', 
        method: 'POST',
        requiresAuth: false
      },
      profile: { 
        path: '/auth/profile', 
        method: 'GET',
        requiresAuth: true
      },
      logout: { 
        path: '/auth/logout', 
        method: 'POST',
        requiresAuth: true
      },
      refreshToken: {
        path: '/auth/refresh',
        method: 'POST',
        requiresAuth: false
      }
    },

    // Admin endpoints - Only admin can access
    admin: {
      dashboard: {
        stats: { 
          path: '/admin/dashboard/stats', 
          method: 'GET',
          requiredRole: ROLES.ADMIN
        }
      },
      
      teachers: {
        create: { 
          path: '/admin/teachers', 
          method: 'POST',
          requiredRole: ROLES.ADMIN
        },
        list: { 
          path: '/admin/teachers', 
          method: 'GET',
          requiredRole: ROLES.ADMIN
        },
        update: (teacherId) => ({ 
          path: `/admin/teachers/${teacherId}`, 
          method: 'PUT',
          requiredRole: ROLES.ADMIN
        }),
        delete: (teacherId) => ({ 
          path: `/admin/teachers/${teacherId}`, 
          method: 'DELETE',
          requiredRole: ROLES.ADMIN
        }),
        promoteToAdmin: (teacherId) => ({
          path: `/admin/teachers/${teacherId}/promote`,
          method: 'PATCH',
          requiredRole: ROLES.ADMIN
        })
      },

      classrooms: {
        create: { 
          path: '/admin/classrooms', 
          method: 'POST',
          requiredRole: ROLES.ADMIN
        },
        list: { 
          path: '/admin/classrooms', 
          method: 'GET',
          requiredRole: [ROLES.ADMIN, ROLES.TEACHER]
        },
        update: (classroomId) => ({ 
          path: `/admin/classrooms/${classroomId}`, 
          method: 'PUT',
          requiredRole: ROLES.ADMIN
        }),
        delete: (classroomId) => ({ 
          path: `/admin/classrooms/${classroomId}`, 
          method: 'DELETE',
          requiredRole: ROLES.ADMIN
        }),
        assignTeacher: (classroomId) => ({
          path: `/admin/classrooms/${classroomId}/assign-teacher`,
          method: 'POST',
          requiredRole: ROLES.ADMIN
        })
      },

      subjects: {
        create: { 
          path: '/admin/subjects', 
          method: 'POST',
          requiredRole: ROLES.ADMIN
        },
        list: { 
          path: '/admin/subjects', 
          method: 'GET',
          requiredRole: [ROLES.ADMIN, ROLES.TEACHER]
        },
        update: (subjectId) => ({ 
          path: `/admin/subjects/${subjectId}`, 
          method: 'PUT',
          requiredRole: ROLES.ADMIN
        }),
        delete: (subjectId) => ({ 
          path: `/admin/subjects/${subjectId}`, 
          method: 'DELETE',
          requiredRole: ROLES.ADMIN
        })
      },

      students: {
        create: { 
          path: '/admin/students', 
          method: 'POST',
          requiredRole: [ROLES.ADMIN, ROLES.TEACHER]
        },
        list: { 
          path: '/admin/students', 
          method: 'GET',
          requiredRole: [ROLES.ADMIN, ROLES.TEACHER]
        },
        update: (studentId) => ({ 
          path: `/admin/students/${studentId}`, 
          method: 'PUT',
          requiredRole: [ROLES.ADMIN, ROLES.TEACHER]
        }),
        delete: (studentId) => ({ 
          path: `/admin/students/${studentId}`, 
          method: 'DELETE',
          requiredRole: ROLES.ADMIN
        })
      }
    },

    // Teacher endpoints - Teachers can access their assigned data
    teachers: {
      profile: { 
        path: '/teachers/profile', 
        method: 'GET',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      },
      myAssignments: { 
        path: '/teachers/my-assignments', 
        method: 'GET',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      },
      myClassrooms: { 
        path: '/teachers/my-classrooms', 
        method: 'GET',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      },
      myStudents: { 
        path: '/teachers/my-students', 
        method: 'GET',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      },
      updateProfile: {
        path: '/teachers/profile',
        method: 'PUT',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      }
    },

    // Student endpoints
    students: {
      register: { 
        path: '/students/register', 
        method: 'POST',
        requiresAuth: false
      },
      list: { 
        path: '/students', 
        method: 'GET',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      },
      details: (studentId) => ({ 
        path: `/students/${studentId}`, 
        method: 'GET',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      }),
      classroomStudents: (classroomId) => ({ 
        path: `/students/classroom/${classroomId}`, 
        method: 'GET',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      }),
      update: (studentId) => ({ 
        path: `/students/${studentId}`, 
        method: 'PUT',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      }),
      delete: (studentId) => ({ 
        path: `/students/${studentId}`, 
        method: 'DELETE',
        requiredRole: ROLES.ADMIN
      })
    },

    // Grades endpoints
    grades: {
      add: { 
        path: '/grades', 
        method: 'POST',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      },
      update: (gradeId) => ({ 
        path: `/grades/${gradeId}`, 
        method: 'PUT',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      }),
      delete: (gradeId) => ({ 
        path: `/grades/${gradeId}`, 
        method: 'DELETE',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      }),
      studentGrades: (studentId) => ({ 
        path: `/grades/student/${studentId}`, 
        method: 'GET',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      }),
      classroomGrades: (classroomId, periodId) => ({ 
        path: `/grades/classroom/${classroomId}/period/${periodId}`, 
        method: 'GET',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      }),
      teacherGrades: (teacherId) => ({ 
        path: `/grades/teacher/${teacherId}`, 
        method: 'GET',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      })
    },

    // Reports endpoints
    reports: {
      generate: (studentId, periodId) => ({ 
        path: `/reports/generate/${studentId}/${periodId}`, 
        method: 'POST',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      }),
      classroomReports: (classroomId, periodId) => ({ 
        path: `/reports/classroom/${classroomId}/period/${periodId}`, 
        method: 'GET',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      }),
      teacherReports: (teacherId, periodId) => ({ 
        path: `/reports/teacher/${teacherId}/period/${periodId}`, 
        method: 'GET',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      }),
      download: (reportId) => ({ 
        path: `/reports/${reportId}/download`, 
        method: 'GET',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      })
    },

    // Attendance endpoints
    attendance: {
      record: { 
        path: '/attendance', 
        method: 'POST',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      },
      classroomAttendance: (classroomId) => ({ 
        path: `/attendance/classroom/${classroomId}`, 
        method: 'GET',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      }),
      studentAttendance: (studentId) => ({ 
        path: `/attendance/student/${studentId}`, 
        method: 'GET',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      }),
      update: (attendanceId) => ({ 
        path: `/attendance/${attendanceId}`, 
        method: 'PUT',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      }),
      delete: (attendanceId) => ({ 
        path: `/attendance/${attendanceId}`, 
        method: 'DELETE',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      }),
      teacherAttendance: (teacherId) => ({ 
        path: `/attendance/teacher/${teacherId}`, 
        method: 'GET',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      })
    },

    // Evaluation periods
    evaluationPeriods: {
      list: { 
        path: '/evaluation-periods', 
        method: 'GET',
        requiredRole: [ROLES.TEACHER, ROLES.ADMIN]
      },
      create: { 
        path: '/evaluation-periods', 
        method: 'POST',
        requiredRole: ROLES.ADMIN
      },
      update: (periodId) => ({ 
        path: `/evaluation-periods/${periodId}`, 
        method: 'PUT',
        requiredRole: ROLES.ADMIN
      })
    }
  }
};

// Helper function to resolve endpoint configuration
export const resolveEndpoint = (endpointConfig, ...params) => {
  if (typeof endpointConfig === 'function') {
    return endpointConfig(...params);
  }
  return endpointConfig;
};

// Helper function to check if user has permission
export const hasPermission = (userRole, permission) => {
  if (!userRole || !permission) return false;
  
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  
  // Admin has all permissions
  if (userRole === ROLES.ADMIN) return true;
  
  return allowedRoles.includes(userRole);
};

// Helper function to get user context for data access
export const getUserContext = (user) => {
  if (!user) return null;
  
  return {
    id: user.id,
    role: user.role,
    teacherId: user.teacher?.id || null,
    assignedClassrooms: user.teacher?.assigned_classrooms || [],
    headOfClassrooms: user.teacher?.head_of_classrooms || [],
    canAccessAll: user.role === ROLES.ADMIN
  };
};

export default API_CONFIG;