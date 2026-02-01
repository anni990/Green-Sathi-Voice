/**
 * ApiService.js - ES5 CONVERTED VERSION
 * Handles all API calls and data processing with device authentication
 * ES5 Compatible - No classes, async/await, arrow functions, or template literals
 */

function ApiService(app) {
    this.app = app;
    this.languageDetectionAttempt = 1;
}

ApiService.prototype.getAuthHeaders = function() {
    var headers = {
        'Content-Type': 'application/json'
    };
    
    // Use device ID headers (no Bearer token auth)
    if (window.deviceAuth) {
        var deviceHeaders = window.deviceAuth.getDeviceHeaders();
        for (var key in deviceHeaders) {
            if (deviceHeaders.hasOwnProperty(key)) {
                headers[key] = deviceHeaders[key];
            }
        }
    }
    
    return headers;
};

ApiService.prototype.handleApiError = function(response, retryFn) {
    // No 401 token refresh logic needed - device ID is always valid
    if (response.status >= 500) {
        console.error('Server error:', response.status);
    }
    return Promise.resolve(null);
};

ApiService.prototype.extractUserInfo = function(text) {
    var self = this;
    
    // Get device_id for LLM service routing
    var deviceId = this.app.stateManager.userInfo.device_id;
    var requestBody = { text: text };
    if (deviceId) {
        requestBody.device_id = deviceId;
    }
    
    return fetch('/api/voice/extract_info', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestBody)
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        if (!data) return;
        
        if (data.fallback) {
            return self.handleExtractionFallback(data.name);
        }
        
        if (data.phone) {
            self.app.stateManager.updateUserInfo('name', data.name || '');
            self.app.stateManager.updateUserInfo('phone', data.phone);
            
            self.app.elementManager.setElementContent('userName', data.name || 'उपयोगकर्ता');
            self.app.elementManager.setElementContent('userPhone', data.phone);
            
            self.app.uiController.updateStatus('ready', 'जानकारी मिल गई!');
            
            setTimeout(function() {
                self.app.startLanguageCollection();
            }, 1500);
        } else {
            return self.handleExtractionFallback(data.name);
        }
    })
    .catch(function(error) {
        console.error('Error extracting info:', error);
        return self.handleExtractionFallback('');
    });
};

ApiService.prototype.handleExtractionFallback = function(name) {
    this.showPhoneInputPopup(name);
    
    this.app.uiController.updateStatus('processing', 'कृपया ध्यान से सुनें...');
    var audioUrl = '/api/voice/static_audio/extraction_error/hindi';
    this.app.audioManager.playAudioFromUrl(audioUrl).catch(function(err) {
        console.error('Error playing extraction error audio:', err);
    });
    
    return Promise.resolve();
};

ApiService.prototype.showPhoneInputPopup = function(name) {
    var self = this;
    
    var overlay = document.createElement('div');
    overlay.id = 'phoneInputOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;justify-content:center;align-items:center;z-index:10000;';
    
    var modal = document.createElement('div');
    modal.style.cssText = 'background:white;padding:30px;border-radius:15px;box-shadow:0 10px 30px rgba(0,0,0,0.3);max-width:400px;width:90%;';
    
    modal.innerHTML = '<h2 style="color:#16A34A;margin-bottom:20px;text-align:center;">📱 फ़ोन नंबर दर्ज करें</h2>' +
        '<p style="margin-bottom:20px;text-align:center;color:#666;">कृपया अपना 10 अंकों का फ़ोन नंबर टाइप करें</p>' +
        '<input type="tel" id="phoneInput" placeholder="9876543210" maxlength="10" style="width:100%;padding:15px;font-size:18px;border:2px solid #16A34A;border-radius:8px;text-align:center;margin-bottom:20px;box-sizing:border-box;"/>' +
        '<button id="submitPhone" style="width:100%;padding:15px;background:#16A34A;color:white;border:none;border-radius:8px;font-size:18px;cursor:pointer;font-weight:bold;">जारी रखें →</button>' +
        '<p id="phoneError" style="color:#DC2626;margin-top:10px;text-align:center;display:none;"></p>';
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    var phoneInput = document.getElementById('phoneInput');
    var submitBtn = document.getElementById('submitPhone');
    var errorMsg = document.getElementById('phoneError');
    
    phoneInput.focus();
    
    var handleSubmit = function() {
        var phone = phoneInput.value.trim();
        
        if (!/^[6-9]\d{9}$/.test(phone)) {
            errorMsg.textContent = 'कृपया सही 10 अंकों का फ़ोन नंबर दर्ज करें';
            errorMsg.style.display = 'block';
            return;
        }
        
        self.app.stateManager.updateUserInfo('name', name || '');
        self.app.stateManager.updateUserInfo('phone', phone);
        
        self.app.elementManager.setElementContent('userName', name || 'उपयोगकर्ता');
        self.app.elementManager.setElementContent('userPhone', phone);
        
        document.body.removeChild(overlay);
        
        self.app.uiController.updateStatus('ready', 'जानकारी मिल गई!');
        
        setTimeout(function() {
            self.app.startLanguageCollection();
        }, 1000);
    };
    
    submitBtn.addEventListener('click', handleSubmit);
    
    phoneInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit();
        }
    });
    
    overlay.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit();
        }
    });
};

ApiService.prototype.detectLanguage = function(text, attempt) {
    var self = this;
    if (typeof attempt === 'undefined') attempt = 1;
    
    // Get device_id for LLM service routing
    var deviceId = this.app.stateManager.userInfo.device_id;
    var requestBody = { text: text, attempt: attempt };
    if (deviceId) {
        requestBody.device_id = deviceId;
    }
    
    return fetch('/api/voice/detect_language', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestBody)
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        if (!data) return;
        
        if (data.retry && attempt < 3) {
            return self.handleLanguageDetectionRetry(attempt);
        }
        
        if (data.language) {
            self.app.stateManager.updateUserInfo('language', data.language);
            self.app.elementManager.setElementContent('userLanguage', data.language);
            
            return self.registerUser().then(function() {
                self.app.uiController.showUserInfoDisplay();
            });
            
        } else {
            if (attempt >= 3) {
                self.app.uiController.showError('भाषा पहचानना नहीं हो सकी। डिफ़ॉल्ट हिंदी का उपयोग किया जा रहा है।');
                self.app.stateManager.updateUserInfo('language', 'hindi');
                self.app.elementManager.setElementContent('userLanguage', 'hindi');
                return self.registerUser().then(function() {
                    self.app.uiController.showUserInfoDisplay();
                });
            } else {
                return self.handleLanguageDetectionRetry(attempt);
            }
        }
    })
    .catch(function(error) {
        console.error('Error detecting language:', error);
        if (attempt < 3) {
            return self.handleLanguageDetectionRetry(attempt);
        } else {
            self.app.uiController.showError('भाषा पहचानने में त्रुटि। डिफ़ॉल्ट हिंदी का उपयोग किया जा रहा है।');
            self.app.stateManager.updateUserInfo('language', 'hindi');
            self.app.elementManager.setElementContent('userLanguage', 'hindi');
            return self.registerUser().then(function() {
                self.app.uiController.showUserInfoDisplay();
            });
        }
    });
};

ApiService.prototype.handleLanguageDetectionRetry = function(attempt) {
    var self = this;
    
    this.app.uiController.updateStatus('processing', 'पुन: प्रयास ' + (attempt + 1) + '/3...');
    
    var audioUrl = '/api/voice/static_audio/language_error/hindi';
    return this.app.audioManager.playAudioFromUrl(audioUrl)
        .then(function() {
            self.app.uiController.updateStatus('ready', 'भाषा बताएं...');
            self.languageDetectionAttempt = attempt + 1;
            
            setTimeout(function() {
                self.app.audioManager.startRecording();
            }, 500);
        })
        .catch(function(error) {
            console.error('Error in language retry:', error);
            self.languageDetectionAttempt = attempt + 1;
            setTimeout(function() {
                self.app.audioManager.startRecording();
            }, 1000);
        });
};

ApiService.prototype.registerUser = function() {
    var self = this;
    var userInfo = this.app.stateManager.getUserInfo();
    
    return fetch('/api/user/register', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
            name: userInfo.name,
            phone: userInfo.phone,
            language: userInfo.language
        })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        if (!data) return;
        
        if (data.user_id) {
            self.app.stateManager.updateUserInfo('user_id', data.user_id);
            self.app.stateManager.updateUserInfo('session_id', data.session_id);
            console.log('User registered:', data);
        }
    })
    .catch(function(error) {
        console.error('Error registering user:', error);
    });
};

ApiService.prototype.processConversation = function(text) {
    var self = this;
    var userInfo = this.app.stateManager.getUserInfo();
    
    this.app.conversationManager.addMessageToConversation(text, 'user');
    
    return fetch('/api/voice/generate_response', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
            text: text,
            language: userInfo.language,
            user_id: userInfo.user_id,
            session_id: userInfo.session_id
        })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        if (!data) return;
        
        if (data.response) {
            self.app.conversationManager.addMessageToConversation(data.response, 'bot');
            return self.app.audioManager.playResponse(data.response, data.language);
        } else {
            self.app.uiController.showError('Could not generate response. Please try again.');
            self.app.uiController.updateStatus('ready', 'अगले संदेश के लिए तैयार - Enter दबाएं');
        }
    })
    .catch(function(error) {
        self.app.uiController.showError('Error in conversation: ' + error.message);
        self.app.uiController.updateStatus('error', 'Conversation error');
    });
};
