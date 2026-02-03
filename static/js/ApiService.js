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
        
        // Always show confirmation popup - whether extraction succeeded or failed
        if (data.fallback || !data.phone) {
            // Failed extraction - show popup with error audio
            self.showConfirmationPopup(data.name || '', '', true);
        } else {
            // Successful extraction - show confirmation popup with success audio
            self.showConfirmationPopup(data.name || '', data.phone, false);
        }
    })
    .catch(function(error) {
        console.error('Error extracting info:', error);
        return self.handleExtractionFallback('');
    });
};

/**
 * Show confirmation popup for name/phone - works for both successful and failed extraction
 * @param {string} name - Extracted or empty name
 * @param {string} phone - Extracted phone (empty if failed)
 * @param {boolean} isError - Whether this is an error case (play error audio)
 */
ApiService.prototype.showConfirmationPopup = function(name, phone, isError) {
    var self = this;
    
    // Create overlay
    var overlay = document.createElement('div');
    overlay.id = 'phoneConfirmOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;justify-content:center;align-items:center;z-index:10000;';
    
    // Create modal
    var modal = document.createElement('div');
    modal.style.cssText = 'background:white;padding:30px;border-radius:15px;box-shadow:0 10px 30px rgba(0,0,0,0.3);max-width:450px;width:90%;';
    
    // Build modal content
    var titleText = isError ? '⚠️ जानकारी दर्ज करें' : '✅ जानकारी की पुष्टि करें';
    var instructionText = isError ? 'कृपया अपना 10 अंकों का फ़ोन नंबर टाइप करें' : 'यदि सही है तो Enter दबाएं। गलत है तो Backspace से संपादित करें।';
    
    modal.innerHTML = '<h2 style="color:#16A34A;margin-bottom:20px;text-align:center;">' + titleText + '</h2>' +
        '<div style="margin-bottom:20px;">' +
            '<p style="text-align:center;color:#666;margin-bottom:15px;font-size:14px;">' + instructionText + '</p>' +
            '<div style="background:#F0FDF4;padding:15px;border-radius:10px;margin-bottom:10px;">' +
                '<p style="color:#166534;font-weight:600;margin-bottom:8px;">👤 नाम:</p>' +
                '<p id="displayName" style="color:#15803D;font-size:20px;font-weight:700;text-align:center;">' + (name || 'उपयोगकर्ता') + '</p>' +
            '</div>' +
            '<div style="background:#FEF3C7;padding:15px;border-radius:10px;">' +
                '<p style="color:#92400E;font-weight:600;margin-bottom:8px;">📱 फ़ोन नंबर:</p>' +
                '<input type="tel" id="phoneInputConfirm" value="' + phone + '" placeholder="9876543210" maxlength="10" ' +
                'style="width:100%;padding:12px;font-size:22px;border:2px solid #F59E0B;border-radius:8px;text-align:center;' +
                'box-sizing:border-box;font-weight:700;background:white;"/>' +
            '</div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;">' +
            '<button id="confirmBtn" style="flex:1;padding:15px;background:#16A34A;color:white;border:none;border-radius:8px;' +
            'font-size:18px;cursor:pointer;font-weight:bold;">✓ पुष्टि करें (Enter)</button>' +
        '</div>' +
        '<p id="phoneConfirmError" style="color:#DC2626;margin-top:10px;text-align:center;display:none;font-weight:600;"></p>';
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Get elements
    var phoneInput = document.getElementById('phoneInputConfirm');
    var confirmBtn = document.getElementById('confirmBtn');
    var errorMsg = document.getElementById('phoneConfirmError');
    
    // Focus phone input and select all text for easy editing
    phoneInput.focus();
    phoneInput.select();
    
    // Restrict input to numbers only (0-9)
    phoneInput.addEventListener('keydown', function(e) {
        // Allow: backspace, delete, tab, escape, enter, arrow keys
        var allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
        
        // Allow if it's a control key
        if (allowedKeys.indexOf(e.key) !== -1) {
            return;
        }
        
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].indexOf(e.key.toLowerCase()) !== -1) {
            return;
        }
        
        // Block if not a number (0-9)
        if (!/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            console.log('⚠️ Blocked non-numeric key:', e.key);
            return;
        }
    });
    
    // Additional filter on paste event
    phoneInput.addEventListener('paste', function(e) {
        e.preventDefault();
        var pastedText = (e.clipboardData || window.clipboardData).getData('text');
        var numbersOnly = pastedText.replace(/\D/g, ''); // Remove all non-digits
        
        if (numbersOnly) {
            // Insert only the numeric part
            var currentValue = phoneInput.value;
            var selectionStart = phoneInput.selectionStart;
            var newValue = currentValue.substring(0, selectionStart) + numbersOnly + currentValue.substring(phoneInput.selectionEnd);
            phoneInput.value = newValue.substring(0, 10); // Limit to 10 digits
            phoneInput.setSelectionRange(selectionStart + numbersOnly.length, selectionStart + numbersOnly.length);
            console.log('📋 Pasted numbers only:', numbersOnly);
        }
    });
    
    // Play appropriate audio
    this.app.uiController.updateStatus('processing', 'कृपया ध्यान से सुनें...');
    if (isError) {
        // Error case - play extraction error audio
        var errorAudioUrl = '/api/voice/static_audio/extraction_error/hindi';
        this.app.audioManager.playAudioFromUrl(errorAudioUrl).catch(function(err) {
            console.error('Error playing extraction error audio:', err);
        });
    } else {
        // Success case - play confirmation prompt
        var confirmAudioUrl = '/api/voice/static_audio/confirm_details/hindi';
        this.app.audioManager.playAudioFromUrl(confirmAudioUrl).then(function() {
            self.app.uiController.updateStatus('ready', 'जानकारी की पुष्टि करें');
        }).catch(function(err) {
            console.error('Error playing confirmation audio:', err);
            self.app.uiController.updateStatus('ready', 'जानकारी की पुष्टि करें');
        });
    }
    
    // Handle confirmation
    var handleConfirm = function() {
        var phoneValue = phoneInput.value.trim();
        
        // Validate phone number
        if (!/^[6-9]\d{9}$/.test(phoneValue)) {
            errorMsg.textContent = '❌ कृपया सही 10 अंकों का फ़ोन नंबर दर्ज करें (6-9 से शुरू)';
            errorMsg.style.display = 'block';
            phoneInput.focus();
            phoneInput.select();
            return;
        }
        
        // Save data
        self.app.stateManager.updateUserInfo('name', name || 'उपयोगकर्ता');
        self.app.stateManager.updateUserInfo('phone', phoneValue);
        
        self.app.elementManager.setElementContent('userName', name || 'उपयोगकर्ता');
        self.app.elementManager.setElementContent('userPhone', phoneValue);
        
        // Clear popup flag BEFORE removing overlay
        window.__popupActive = false;
        console.log('🔓 Phone confirmed - clearing popup flag (window.__popupActive = false)');
        
        // Remove overlay
        document.body.removeChild(overlay);
        
        // Play confirmation audio and proceed
        self.app.uiController.updateStatus('processing', 'जानकारी सहेजी जा रही है...');
        var confirmedAudioUrl = '/api/voice/static_audio/details_confirmed/hindi';
        self.app.audioManager.playAudioFromUrl(confirmedAudioUrl).then(function() {
            self.app.uiController.updateStatus('ready', 'जानकारी सहेजी गई!');
            // Wait 1 second then proceed to language selection
            setTimeout(function() {
                self.app.startLanguageCollection();
            }, 1000);
        }).catch(function(err) {
            console.error('Error playing confirmed audio:', err);
            self.app.uiController.updateStatus('ready', 'जानकारी सहेजी गई!');
            setTimeout(function() {
                self.app.startLanguageCollection();
            }, 1000);
        });
    };
    
    // Button click handler
    confirmBtn.addEventListener('click', handleConfirm);
    
    // Keyboard event handler for popup
    var popupKeyHandler = function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleConfirm();
        }
        // Allow Backspace for editing (default behavior)
        // Do NOT stop propagation for Backspace - let it work normally in input field
    };
    
    phoneInput.addEventListener('keydown', popupKeyHandler);
    overlay.addEventListener('keydown', popupKeyHandler);
    
    // Mark popup as active for KeyboardHandler
    window.__popupActive = true;
    console.log('🔒 Confirmation popup opened - Backspace enabled for editing (window.__popupActive = true)');
    
    // Cleanup function to clear popup flag
    var cleanupPopup = function() {
        if (window.__popupActive) {
            window.__popupActive = false;
            console.log('🔓 Confirmation popup closed - Backspace returns to global behavior (window.__popupActive = false)');
        }
    };
    
    // Ensure cleanup happens even if overlay is removed other ways
    overlay.addEventListener('DOMNodeRemoved', cleanupPopup);
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
