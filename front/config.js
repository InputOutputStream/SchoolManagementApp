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
      }
    },

    // Admin endpoints
    admin: {
      teachers: {
        create: { 
          path: '/admin/teachers', 
          method: 'POST',
          requiredRole: 'admin'
        },
        list: { 
          path: '/admin/teachers', 
          method: 'GET',
          requiredRole: 'admin'
        }
      },

      classrooms: {
        create: { 
          path: '/admin/classrooms', 
          method: 'POST',
          requiredRole: 'admin'
        },
        list: { 
          path: '/admin/classrooms', 
          method: 'GET',
          requiredRole: 'admin'
        }
      },

      subjects: {
        create: { 
          path: '/admin/subjects', 
          method: 'POST',
          requiredRole: 'admin'
        },
        list: { 
          path: '/admin/subjects', 
          method: 'GET',
          requiredRole: 'admin'
        }
      },

      dashboard: {
        stats: { 
          path: '/admin/dashboard/stats', 
          method: 'GET',
          requiredRole: 'admin'
        }
      }
    },

    // Teacher endpoints
    teachers: {
      myAssignments: { 
        path: '/teachers/my-assignments', 
        method: 'GET',
        requiredRole: 'teacher'
      },
      myClassrooms: { 
        path: '/teachers/my-classrooms', 
        method: 'GET',
        requiredRole: 'teacher'
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
        requiredRole: 'teacher'
      },
      classroomStudents: (classroomId) => ({ 
        path: `/students/classroom/${classroomId}`, 
        method: 'GET',
        requiredRole: 'teacher'
      }),
      update: (studentId) => ({ 
        path: `/students/${studentId}`, 
        method: 'PUT',
        requiredRole: 'teacher'
      })
    },

    // Grades endpoints
    grades: {
      add: { 
        path: '/grades', 
        method: 'POST',
        requiredRole: 'teacher'
      },
      update: (gradeId) => ({ 
        path: `/grades/${gradeId}`, 
        method: 'PUT',
        requiredRole: 'teacher'
      }),
      classroomGrades: (classroomId, periodId) => ({ 
        path: `/grades/classroom/${classroomId}/period/${periodId}`, 
        method: 'GET',
        requiredRole: 'teacher'
      })
    },

    // Reports endpoints
    reports: {
      generate: (studentId, periodId) => ({ 
        path: `/reports/generate/${studentId}/${periodId}`, 
        method: 'POST',
        requiredRole: 'teacher'
      }),
      classroomReports: (classroomId, periodId) => ({ 
        path: `/reports/classroom/${classroomId}/period/${periodId}`, 
        method: 'GET',
        requiredRole: 'teacher'
      })
    },

    // Attendance endpoints
    attendance: {
      record: { 
        path: '/attendance', 
        method: 'POST',
        requiredRole: 'teacher'
      },
      classroomAttendance: (classroomId) => ({ 
        path: `/attendance/classroom/${classroomId}`, 
        method: 'GET',
        requiredRole: 'teacher'
      }),
      update: (attendanceId) => ({ 
        path: `/attendance/${attendanceId}`, 
        method: 'PUT',
        requiredRole: 'teacher'
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

export default API_CONFIG;
