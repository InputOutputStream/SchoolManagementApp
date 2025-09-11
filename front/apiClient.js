import { API_CONFIG } from './config.js';

export class ApiClient {
    constructor(authManager) {
        this.authManager = authManager;
    }

    async call(method, endpoint, data = null, requiresAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (requiresAuth && this.authManager.token) {
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
            const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, config);
            
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

    // Convenience methods
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