import { API_CONFIG } from './config.js';

export class ApiClient {
    constructor(authManager) {
        this.authManager = authManager;
    }

    // Helper method to extract endpoint information from config
    getEndpointInfo(endpoint) {
        if (typeof endpoint === 'string') {
            // Handle direct string paths (fallback)
            return { path: endpoint, requiresAuth: true };
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

    async call(method, endpoint, data = null, requiresAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
        };

        // Extract endpoint information
        let endpointInfo;
        try {
            endpointInfo = this.getEndpointInfo(endpoint);
        } catch (error) {
            console.error('Endpoint error:', error);
            throw error;
        }

        // Use endpoint's requiresAuth setting if not explicitly overridden
        const needsAuth = requiresAuth !== false && endpointInfo.requiresAuth;

        // Check role requirements
        if (endpointInfo.requiredRole && this.authManager.currentUser) {
            if (this.authManager.currentUser.role !== endpointInfo.requiredRole) {
                throw new Error(`Access denied. ${endpointInfo.requiredRole} privileges required.`);
            }
        }

        if (needsAuth && this.authManager.token) {
            headers['Authorization'] = `Bearer ${this.authManager.token}`;
        }

        const config = {
            method: method,
            headers: headers,
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.body = JSON.stringify(data);
        }

        try {
            const url = `${API_CONFIG.baseUrl}${endpointInfo.path}`;
            console.log('Making API call to:', url, 'Method:', method);
            
            const response = await fetch(url, config);
            
            // Handle authentication errors
            if (response.status === 401) {
                this.authManager.logout();
                throw new Error('Session expired. Please login again.');
            }

            // Handle other HTTP errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
            
        } catch (error) {
            // Handle network errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error. Please check your connection.');
            }
            throw error;
        }
    }

    // Convenience methods that properly use endpoint config
    async get(endpoint, requiresAuth = true) {
        return this.call('GET', endpoint, null, requiresAuth);
    }

    async post(endpoint, data, requiresAuth = true) {
        return this.call('POST', endpoint, data, requiresAuth);
    }

    async put(endpoint, data, requiresAuth = true) {
        return this.call('PUT', endpoint, data, requiresAuth);
    }

    async delete(endpoint, requiresAuth = true) {
        return this.call('DELETE', endpoint, null, requiresAuth);
    }
}
