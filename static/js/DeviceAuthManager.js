/**
 * DeviceAuthManager - Handles device authentication, token management, and session persistence
 */

class DeviceAuthManager {
    constructor() {
        this.accessToken = null;
        this.refreshToken = null;
        this.deviceId = null;
        this.deviceName = null;
        this.isAuthenticated = false;
        
        // Load tokens from localStorage on initialization
        this.loadFromStorage();
    }

    /**
     * Load authentication data from localStorage
     */
    loadFromStorage() {
        this.accessToken = localStorage.getItem('access_token');
        this.refreshToken = localStorage.getItem('refresh_token');
        this.deviceId = localStorage.getItem('device_id');
        this.deviceName = localStorage.getItem('device_name');
        this.isAuthenticated = !!(this.accessToken && this.deviceId);
    }

    /**
     * Save authentication data to localStorage
     */
    saveToStorage(accessToken, refreshToken, deviceId, deviceName) {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('device_id', deviceId);
        localStorage.setItem('device_name', deviceName);
        
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.deviceId = deviceId;
        this.deviceName = deviceName;
        this.isAuthenticated = true;
    }

    /**
     * Clear authentication data from localStorage
     */
    clearStorage() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('device_id');
        localStorage.removeItem('device_name');
        
        this.accessToken = null;
        this.refreshToken = null;
        this.deviceId = null;
        this.deviceName = null;
        this.isAuthenticated = false;
    }

    /**
     * Get access token for API requests
     */
    getAccessToken() {
        return this.accessToken;
    }

    /**
     * Get device information
     */
    getDeviceInfo() {
        return {
            deviceId: this.deviceId,
            deviceName: this.deviceName,
            isAuthenticated: this.isAuthenticated
        };
    }

    /**
     * Check if user is authenticated
     */
    checkAuth() {
        return this.isAuthenticated && this.accessToken;
    }

    /**
     * Validate access token with backend
     */
    async validateToken() {
        if (!this.accessToken) {
            return false;
        }

        try {
            const response = await fetch('/api/device/validate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            const data = await response.json();
            
            if (data.valid) {
                // Update device info if returned
                if (data.device_id && data.device_name) {
                    this.deviceId = data.device_id;
                    this.deviceName = data.device_name;
                    localStorage.setItem('device_id', data.device_id);
                    localStorage.setItem('device_name', data.device_name);
                }
                this.isAuthenticated = true;
                return true;
            } else {
                // Token invalid, try to refresh
                return await this.refreshAccessToken();
            }
        } catch (error) {
            console.error('Token validation error:', error);
            // Try to refresh token on error
            return await this.refreshAccessToken();
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken() {
        if (!this.refreshToken) {
            this.clearStorage();
            return false;
        }

        try {
            const response = await fetch('/api/device/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refresh_token: this.refreshToken
                })
            });

            const data = await response.json();
            
            if (response.ok && data.success && data.access_token) {
                // Update access token
                this.accessToken = data.access_token;
                localStorage.setItem('access_token', data.access_token);
                this.isAuthenticated = true;
                console.log('Access token refreshed successfully');
                return true;
            } else {
                // Refresh failed, clear storage and redirect to login
                console.error('Token refresh failed:', data.error);
                this.clearStorage();
                return false;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            this.clearStorage();
            return false;
        }
    }

    /**
     * Logout device
     */
    async logout() {
        if (this.accessToken) {
            try {
                await fetch('/api/device/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        
        // Clear local storage regardless of API response
        this.clearStorage();
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        window.location.href = '/login';
    }

    /**
     * Redirect to landing page
     */
    redirectToLanding() {
        window.location.href = '/';
    }

    /**
     * Ensure user is authenticated, redirect to login if not
     */
    async ensureAuthenticated() {
        if (!this.checkAuth()) {
            this.redirectToLogin();
            return false;
        }

        // Validate token
        const isValid = await this.validateToken();
        if (!isValid) {
            this.redirectToLogin();
            return false;
        }

        return true;
    }

    /**
     * Get authorization header for API requests
     */
    getAuthHeader() {
        if (this.accessToken) {
            return { 'Authorization': `Bearer ${this.accessToken}` };
        }
        return {};
    }
}

// Create global instance
window.deviceAuth = new DeviceAuthManager();
