/**
 * DeviceAuthManager - Handles device authentication, token management, and session persistence
 * ES5 Compatible - No classes, async/await, arrow functions, template literals, or spread operators
 */

function DeviceAuthManager() {
    this.accessToken = null;
    this.refreshToken = null;
    this.deviceId = null;
    this.deviceName = null;
    this.pipelineType = null;
    this.llmService = null;
    this.isAuthenticated = false;
    
    // Load tokens from localStorage on initialization
    this.loadFromStorage();
}

/**
 * Load authentication data from localStorage
 */
DeviceAuthManager.prototype.loadFromStorage = function() {
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
    this.deviceId = localStorage.getItem('device_id');
    this.deviceName = localStorage.getItem('device_name');
    this.pipelineType = localStorage.getItem('pipeline_type');
    this.llmService = localStorage.getItem('llm_service');
    this.isAuthenticated = !!(this.accessToken && this.deviceId);
};

/**
 * Save authentication data to localStorage
 */
DeviceAuthManager.prototype.saveToStorage = function(accessToken, refreshToken, deviceId, deviceName, pipelineType, llmService) {
    if (typeof pipelineType === 'undefined') pipelineType = null;
    if (typeof llmService === 'undefined') llmService = null;
    
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('device_id', deviceId);
    localStorage.setItem('device_name', deviceName);
    
    if (pipelineType) {
        localStorage.setItem('pipeline_type', pipelineType);
        this.pipelineType = pipelineType;
    }
    if (llmService) {
        localStorage.setItem('llm_service', llmService);
        this.llmService = llmService;
    }
    
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.deviceId = deviceId;
    this.deviceName = deviceName;
    this.isAuthenticated = true;
};

/**
 * Clear authentication data from localStorage
 */
DeviceAuthManager.prototype.clearStorage = function() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('device_id');
    localStorage.removeItem('device_name');
    localStorage.removeItem('pipeline_type');
    localStorage.removeItem('llm_service');
    
    this.accessToken = null;
    this.refreshToken = null;
    this.deviceId = null;
    this.deviceName = null;
    this.pipelineType = null;
    this.llmService = null;
    this.isAuthenticated = false;
};

/**
 * Get access token for API requests
 */
DeviceAuthManager.prototype.getAccessToken = function() {
    return this.accessToken;
};

/**
 * Get device information
 */
DeviceAuthManager.prototype.getDeviceInfo = function() {
    return {
        deviceId: this.deviceId,
        deviceName: this.deviceName,
        pipelineType: this.pipelineType,
        llmService: this.llmService,
        isAuthenticated: this.isAuthenticated
    };
};

/**
 * Check if user is authenticated
 */
DeviceAuthManager.prototype.checkAuth = function() {
    return this.isAuthenticated && this.accessToken;
};

/**
 * Validate access token with backend
 */
DeviceAuthManager.prototype.validateToken = function() {
    var self = this;
    
    if (!this.accessToken) {
        return Promise.resolve(false);
    }

    return fetch('/api/device/validate', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + this.accessToken
        }
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        if (data.valid) {
            // Update device info if returned
            if (data.device_id && data.device_name) {
                self.deviceId = data.device_id;
                self.deviceName = data.device_name;
                localStorage.setItem('device_id', data.device_id);
                localStorage.setItem('device_name', data.device_name);
            }
            self.isAuthenticated = true;
            return true;
        } else {
            // Token invalid, try to refresh
            return self.refreshAccessToken();
        }
    })
    .catch(function(error) {
        console.error('Token validation error:', error);
        // Try to refresh token on error
        return self.refreshAccessToken();
    });
};

/**
 * Refresh access token using refresh token
 */
DeviceAuthManager.prototype.refreshAccessToken = function() {
    var self = this;
    
    if (!this.refreshToken) {
        this.clearStorage();
        return Promise.resolve(false);
    }

    return fetch('/api/device/refresh', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            refresh_token: this.refreshToken
        })
    })
    .then(function(response) {
        return response.json().then(function(data) {
            return { response: response, data: data };
        });
    })
    .then(function(result) {
        if (result.response.ok && result.data.success && result.data.access_token) {
            // Update access token
            self.accessToken = result.data.access_token;
            localStorage.setItem('access_token', result.data.access_token);
            self.isAuthenticated = true;
            console.log('Access token refreshed successfully');
            return true;
        } else {
            // Refresh failed, clear storage and redirect to login
            console.error('Token refresh failed:', result.data.error);
            self.clearStorage();
            return false;
        }
    })
    .catch(function(error) {
        console.error('Token refresh error:', error);
        self.clearStorage();
        return false;
    });
};

/**
 * Logout device
 */
DeviceAuthManager.prototype.logout = function() {
    var self = this;
    
    if (this.accessToken) {
        return fetch('/api/device/logout', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + this.accessToken
            }
        })
        .catch(function(error) {
            console.error('Logout error:', error);
        })
        .then(function() {
            // Clear local storage regardless of API response
            self.clearStorage();
        });
    } else {
        // Clear local storage regardless of API response
        this.clearStorage();
        return Promise.resolve();
    }
};

/**
 * Redirect to login page
 */
DeviceAuthManager.prototype.redirectToLogin = function() {
    window.location.href = '/login';
};

/**
 * Redirect to landing page
 */
DeviceAuthManager.prototype.redirectToLanding = function() {
    window.location.href = '/';
};

/**
 * Ensure user is authenticated, redirect to login if not
 */
DeviceAuthManager.prototype.ensureAuthenticated = function() {
    var self = this;
    
    if (!this.checkAuth()) {
        this.redirectToLogin();
        return Promise.resolve(false);
    }

    // Validate token
    return this.validateToken().then(function(isValid) {
        if (!isValid) {
            self.redirectToLogin();
            return false;
        }
        return true;
    });
};

/**
 * Get authorization header for API requests
 */
DeviceAuthManager.prototype.getAuthHeader = function() {
    if (this.accessToken) {
        return { 'Authorization': 'Bearer ' + this.accessToken };
    }
    return {};
};

/**
 * Fetch pipeline configuration from backend
 */
DeviceAuthManager.prototype.fetchPipelineConfig = function() {
    var self = this;
    
    if (!this.isAuthenticated) {
        console.error('Not authenticated');
        return Promise.resolve(null);
    }

    return fetch('/api/device/config', {
        method: 'GET',
        headers: this.getAuthHeader()
    })
    .then(function(response) {
        if (response.ok) {
            return response.json();
        }
        return null;
    })
    .then(function(data) {
        if (data && data.success && data.config) {
            self.pipelineType = data.config.pipeline_type;
            self.llmService = data.config.llm_service;
            
            // Update localStorage
            if (self.pipelineType) {
                localStorage.setItem('pipeline_type', self.pipelineType);
            }
            if (self.llmService) {
                localStorage.setItem('llm_service', self.llmService);
            }
            
            return data.config;
        }
        return null;
    })
    .catch(function(error) {
        console.error('Error fetching pipeline config:', error);
        return null;
    });
};

/**
 * Update pipeline configuration
 */
DeviceAuthManager.prototype.updatePipelineConfig = function(pipelineType, llmService) {
    var self = this;
    
    if (!this.isAuthenticated) {
        console.error('Not authenticated');
        return Promise.resolve({ success: false, error: 'Not authenticated' });
    }

    // Manually merge headers (no spread operator)
    var headers = {
        'Content-Type': 'application/json'
    };
    var authHeader = this.getAuthHeader();
    for (var key in authHeader) {
        if (authHeader.hasOwnProperty(key)) {
            headers[key] = authHeader[key];
        }
    }

    return fetch('/api/device/config', {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({
            pipeline_type: pipelineType,
            llm_service: llmService
        })
    })
    .then(function(response) {
        return response.json().then(function(data) {
            return { response: response, data: data };
        });
    })
    .then(function(result) {
        if (result.response.ok && result.data.success) {
            // Update local state and storage
            if (pipelineType) {
                self.pipelineType = pipelineType;
                localStorage.setItem('pipeline_type', pipelineType);
            }
            if (llmService) {
                self.llmService = llmService;
                localStorage.setItem('llm_service', llmService);
            }
            return { success: true };
        } else {
            return { success: false, error: result.data.error };
        }
    })
    .catch(function(error) {
        console.error('Error updating pipeline config:', error);
        return { success: false, error: 'Network error' };
    });
};

/**
 * Get available pipeline options
 */
DeviceAuthManager.prototype.getAvailableOptions = function() {
    return fetch('/api/device/available_options')
        .then(function(response) {
            if (response.ok) {
                return response.json();
            }
            return null;
        })
        .then(function(data) {
            return (data && data.success) ? data.options : null;
        })
        .catch(function(error) {
            console.error('Error fetching available options:', error);
            return null;
        });
};

// Create global instance
window.deviceAuth = new DeviceAuthManager();
