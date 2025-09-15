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

        if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
            config.body = JSON.stringify(data);
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
            
            const response = await fetch(url, config);
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