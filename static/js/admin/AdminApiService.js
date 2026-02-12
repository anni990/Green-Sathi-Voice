/**
 * AdminApiService - Centralized API communication for admin panel
 * Handles all fetch requests with error handling and authentication
 */
class AdminApiService {
    constructor() {
        this.baseUrl = '/admin/api';
    }

    /**
     * Generic fetch wrapper with error handling
     */
    async request(endpoint, options = {}) {
        try {
            // Debug log for POST requests
            if (options.method === 'POST' && options.body) {
                console.log(`[API Request] ${options.method} ${this.baseUrl}${endpoint}`, JSON.parse(options.body));
            }
            
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (response.status === 401) {
                // Unauthorized - redirect to login
                window.location.href = '/admin/login';
                throw new Error('Unauthorized');
            }

            const data = await response.json();
            
            // Debug log response
            if (options.method === 'POST') {
                console.log(`[API Response] ${options.method} ${this.baseUrl}${endpoint}`, data);
            }

            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    // Dashboard APIs
    async getDashboardStats() {
        return this.request('/dashboard');
    }

    // User APIs
    async getUsers(page = 1, limit = 20, search = '') {
        const params = new URLSearchParams({ page, limit });
        if (search) params.append('search', search);
        return this.request(`/users?${params}`);
    }

    async getUserDetails(userId) {
        return this.request(`/users/${userId}`);
    }

    async getUserConversations(userId, page = 1, limit = 10) {
        const params = new URLSearchParams({ page, limit });
        return this.request(`/users/${userId}/conversations?${params}`);
    }

    async searchUsers(query) {
        return this.request(`/search?q=${encodeURIComponent(query)}`);
    }

    // Conversation APIs
    async getConversations(page = 1, limit = 20) {
        const params = new URLSearchParams({ page, limit });
        return this.request(`/conversations?${params}`);
    }

    // Analytics APIs
    async getAnalytics(days = 30, deviceId = 'all') {
        const params = new URLSearchParams({ days });
        if (deviceId && deviceId !== 'all') {
            params.append('device_id', deviceId);
        }
        return this.request(`/analytics?${params}`);
    }

    // Device APIs
    async getDevices(params = {}) {
        const { page = 1, limit = 20, ...rest } = params;
        const urlParams = new URLSearchParams({ page, limit });
        
        // Add any additional parameters (for filtering)
        Object.keys(rest).forEach(key => {
            if (rest[key] !== undefined && rest[key] !== null) {
                urlParams.append(key, rest[key]);
            }
        });
        
        return this.request(`/devices?${urlParams}`);
    }

    async getDeviceDetails(deviceId) {
        return this.request(`/devices/${deviceId}`);
    }

    async updateDevicePipeline(deviceId, pipelineType, llmService) {
        return this.request(`/devices/${deviceId}/pipeline`, {
            method: 'PUT',
            body: JSON.stringify({ pipeline_type: pipelineType, llm_service: llmService })
        });
    }

    async deleteDevice(deviceId) {
        return this.request(`/devices/${deviceId}`, {
            method: 'DELETE'
        });
    }

    async exportDevices(filters = {}) {
        return this.request('/devices/export', {
            method: 'POST',
            body: JSON.stringify({ filters })
        });
    }

    async getDeviceSources() {
        return this.request('/devices/sources');
    }

    async bulkDeleteDevices(criteria) {
        return this.request('/devices/bulk-delete', {
            method: 'POST',
            body: JSON.stringify({ criteria })
        });
    }

    async bulkConfigureDevices(criteria, config) {
        return this.request('/devices/bulk-configure', {
            method: 'POST',
            body: JSON.stringify({ criteria, config })
        });
    }

    // Settings APIs
    async changePassword(currentPassword, newPassword, confirmPassword) {
        return this.request('/change-password', {
            method: 'POST',
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword,
                confirm_password: confirmPassword
            })
        });
    }
}

// Export singleton instance
const adminApiService = new AdminApiService();
