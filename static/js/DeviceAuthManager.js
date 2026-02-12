/**
 * DeviceAuthManager - Handles device identification and configuration (NO AUTHENTICATION)
 * ES5 Compatible - No classes, async/await, arrow functions, template literals, or spread operators
 * Refactored for Android ID-based device tracking without login/logout/session management
 */

function DeviceAuthManager(options) {
    options = options || {};
    this.mode = options.mode || 'auto';  // 'auto' (default), 'web-only', 'android-only'
    this.deviceId = null;
    this.deviceName = null;
    this.pipelineType = null;
    this.llmService = null;
    this.source = 'web';
    this.isRegistered = false;
    
    // Load device info from localStorage on initialization
    this.loadFromStorage();
    
    // Initialize device ID from injected context or generate UUID
    this.initDeviceId();
}

/**
 * Load device data from localStorage
 */
DeviceAuthManager.prototype.loadFromStorage = function() {
    this.deviceId = localStorage.getItem('device_id');
    this.deviceName = localStorage.getItem('device_name');
    this.pipelineType = localStorage.getItem('pipeline_type') || 'library';
    this.llmService = localStorage.getItem('llm_service') || 'vertex';
    this.source = localStorage.getItem('device_source') || 'web';
    this.isRegistered = !!(this.deviceId && localStorage.getItem('device_registered') === 'true');
};

/**
 * Initialize device ID from Android WebView or generate UUID fallback
 * CRITICAL: ALWAYS gets fresh Android ID (no localStorage priority)
 * This ensures device re-registers when database changes
 */
DeviceAuthManager.prototype.initDeviceId = function() {
    var self = this;
    
    // Priority 1: ALWAYS check Android WebView first (fresh ID, no cache)
    if (this.mode !== 'web-only' && window.__DEVICE_CONTEXT__ && window.__DEVICE_CONTEXT__.deviceId) {
        this.deviceId = window.__DEVICE_CONTEXT__.deviceId;
        this.source = 'android-webview';
        this.deviceName = 'Device-' + this.deviceId.substring(0, 8);
        // Reset registration flag to force backend check
        this.isRegistered = false;
        console.log('📱 Android ID detected (fresh):', this.deviceId);
        return;
    }
    
    // Priority 2: Check localStorage only as fallback (for web browsers)
    if (this.deviceId && this.isRegistered) {
        console.log('✅ Device ID loaded from storage (web fallback):', this.deviceId);
        return;
    }
    
    // Priority 3: Generate UUID fallback for web browsers
    // In 'web-only' mode, this is the ONLY option (no Android check)
    // In 'auto' mode, this is fallback when no Android ID exists
    this.deviceId = this.generateUUID();
    this.source = 'web';
    this.deviceName = 'Web-' + this.deviceId.substring(0, 8);
    // Reset registration flag to force backend check
    this.isRegistered = false;
    console.log('🌐 UUID generated for web (mode: ' + this.mode + '):', this.deviceId);
};

/**
 * Generate UUID v4 (ES5 compatible)
 */
DeviceAuthManager.prototype.generateUUID = function() {
    var d = new Date().getTime();
    var d2 = (performance && performance.now && (performance.now() * 1000)) || 0;
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;
        if (d > 0) {
            r = (d + r) % 16 | 0;
            d = Math.floor(d / 16);
        } else {
            r = (d2 + r) % 16 | 0;
            d2 = Math.floor(d2 / 16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
};

/**
 * Save device data to localStorage (ONLY after backend confirms registration)
 */
DeviceAuthManager.prototype.saveToStorage = function() {
    if (this.deviceId) {
        localStorage.setItem('device_id', this.deviceId);
    }
    if (this.deviceName) {
        localStorage.setItem('device_name', this.deviceName);
    }
    if (this.pipelineType) {
        localStorage.setItem('pipeline_type', this.pipelineType);
    }
    if (this.llmService) {
        localStorage.setItem('llm_service', this.llmService);
    }
    if (this.source) {
        localStorage.setItem('device_source', this.source);
    }
    // Mark as registered to prevent re-initialization
    localStorage.setItem('device_registered', 'true');
    this.isRegistered = true;
    console.log('💾 Device saved to localStorage:', this.deviceId);
};

/**
 * Auto-register device with backend
 * CRITICAL: ALWAYS calls backend to verify device exists in current database
 * This ensures device re-registers when database changes
 */
DeviceAuthManager.prototype.autoRegisterDevice = function() {
    var self = this;
    
    if (!this.deviceId) {
        console.error('❌ No device ID available for registration');
        return Promise.resolve({ success: false, error: 'No device ID' });
    }
    
    // ALWAYS call backend to verify device exists in current database
    // (Remove skip check - backend will handle existing devices)
    console.log('🔄 Auto-registering device (checking database):', this.deviceId);
    
    // Use defaults: library + vertex (as specified by user)
    var requestPipelineType = this.pipelineType || 'library';
    var requestLlmService = this.llmService || 'vertex';
    
    return fetch('/api/device/auto_register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            android_id: this.deviceId,
            source: this.source,
            pipeline_type: requestPipelineType,
            llm_service: requestLlmService
        })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        if (data.success) {
            // Update with backend response
            self.deviceId = data.device_id;
            self.deviceName = data.device_name;
            self.pipelineType = data.pipeline_type;
            self.llmService = data.llm_service;
            
            // ONLY NOW save to localStorage (prevents duplicate registrations)
            self.saveToStorage();
            
            console.log('✅ Device registered:', data.already_registered ? 'existing' : 'new');
            return { success: true, data: data };
        } else {
            console.error('❌ Auto-registration failed:', data.error);
            return { success: false, error: data.error };
        }
    })
    .catch(function(error) {
        console.error('❌ Auto-registration error:', error);
        return { success: false, error: error.toString() };
    });
};

/**
 * Clear device data from localStorage (for testing/debugging only)
 */
DeviceAuthManager.prototype.clearStorage = function() {
    localStorage.removeItem('device_id');
    localStorage.removeItem('device_name');
    localStorage.removeItem('pipeline_type');
    localStorage.removeItem('llm_service');
    localStorage.removeItem('device_source');
    localStorage.removeItem('device_registered');
    
    this.deviceId = null;
    this.deviceName = null;
    this.pipelineType = null;
    this.llmService = null;
    this.source = 'web';
    this.isRegistered = false;
    console.log('🗑️ Device storage cleared');
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
        source: this.source,
        isRegistered: this.isRegistered
    };
};

/**
 * Get device headers for API requests (X-Device-ID)
 */
DeviceAuthManager.prototype.getDeviceHeaders = function() {
    var headers = {};
    if (this.deviceId) {
        headers['X-Device-ID'] = this.deviceId;
    }
    if (this.deviceName) {
        headers['X-Device-Name'] = this.deviceName;
    }
    return headers;
};

/**
 * Check if device is registered (always true if device ID exists)
 */
DeviceAuthManager.prototype.checkAuth = function() {
    // Backward compatibility: always return true if device ID exists
    return !!this.deviceId;
};

/**
 * Fetch pipeline configuration from backend
 */
DeviceAuthManager.prototype.fetchPipelineConfig = function() {
    var self = this;
    
    if (!this.deviceId) {
        console.error('No device ID available');
        return Promise.resolve(null);
    }

    var headers = this.getDeviceHeaders();
    
    return fetch('/api/device/config', {
        method: 'GET',
        headers: headers
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
            self.saveToStorage();
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
    
    if (!this.deviceId) {
        console.error('No device ID available');
        return Promise.resolve({ success: false, error: 'No device ID' });
    }

    var headers = this.getDeviceHeaders();
    headers['Content-Type'] = 'application/json';

    return fetch('/api/device/config', {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({
            pipeline_type: pipelineType,
            llm_service: llmService
        })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        if (data.success) {
            // Update local state and storage
            if (pipelineType) {
                self.pipelineType = pipelineType;
            }
            if (llmService) {
                self.llmService = llmService;
            }
            self.saveToStorage();
            return { success: true };
        } else {
            return { success: false, error: data.error };
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

// Deprecated methods (kept for backward compatibility, do nothing)
DeviceAuthManager.prototype.getAccessToken = function() {
    return null;
};

DeviceAuthManager.prototype.validateToken = function() {
    return Promise.resolve(true);
};

DeviceAuthManager.prototype.refreshAccessToken = function() {
    return Promise.resolve(true);
};

DeviceAuthManager.prototype.logout = function() {
    // No-op: no session management
    return Promise.resolve();
};

DeviceAuthManager.prototype.redirectToLogin = function() {
    // No-op: no login required
};

DeviceAuthManager.prototype.redirectToLanding = function() {
    window.location.href = '/';
};

DeviceAuthManager.prototype.ensureAuthenticated = function() {
    return Promise.resolve(true);
};

DeviceAuthManager.prototype.getAuthHeader = function() {
    // Deprecated: use getDeviceHeaders() instead
    return this.getDeviceHeaders();
};

// Create global instance
window.deviceAuth = new DeviceAuthManager();
