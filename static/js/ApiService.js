/**
 * ApiService.js
 * Handles all API calls and data processing with device authentication
 */

class ApiService {
    constructor(app) {
        this.app = app;
        this.languageDetectionAttempt = 1; // Track language detection retry attempts
    }
    
    /**
     * Get authorization headers
     */
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (window.deviceAuth && window.deviceAuth.getAccessToken()) {
            headers['Authorization'] = `Bearer ${window.deviceAuth.getAccessToken()}`;
        }
        
        return headers;
    }
    
    /**
     * Handle API errors including token expiration
     */
    async handleApiError(response, retryFn) {
        if (response.status === 401) {
            // Token expired, try to refresh
            if (window.deviceAuth) {
                const refreshed = await window.deviceAuth.refreshAccessToken();
                if (refreshed && retryFn) {
                    // Retry the original request with new token
                    return await retryFn();
                } else {
                    // Refresh failed, redirect to login
                    window.deviceAuth.redirectToLogin();
                    return null;
                }
            }
        }
        return null;
    }
    
    async extractUserInfo(text) {
        try {
            const response = await fetch('/api/voice/extract_info', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ text: text })
            });
            
            // Handle 401 errors
            if (response.status === 401) {
                await this.handleApiError(response, () => this.extractUserInfo(text));
                return;
            }
            
            const data = await response.json();
            
            // Check if fallback is needed (failed to extract phone)
            if (data.fallback) {
                // Show popup and play error audio
                await this.handleExtractionFallback(data.name);
                return;
            }
            
            if (data.phone) {
                this.app.stateManager.updateUserInfo('name', data.name || '');
                this.app.stateManager.updateUserInfo('phone', data.phone);
                
                // Update UI
                this.app.elementManager.setElementContent('userName', data.name || 'उपयोगकर्ता');
                this.app.elementManager.setElementContent('userPhone', data.phone);
                
                this.app.uiController.updateStatus('ready', 'जानकारी मिल गई!');
                
                // Auto-proceed to language collection
                setTimeout(() => {
                    this.app.startLanguageCollection();
                }, 1500);
            } else {
                // Fallback scenario
                await this.handleExtractionFallback(data.name);
            }
            
        } catch (error) {
            console.error('Error extracting info:', error);
            // On error, also trigger fallback
            await this.handleExtractionFallback('');
        }
    }
    
    async handleExtractionFallback(name) {
        try {
            // Show phone input popup immediately
            this.showPhoneInputPopup(name);
            
            // Play error audio in parallel (don't wait)
            this.app.uiController.updateStatus('processing', 'कृपया ध्यान से सुनें...');
            const audioUrl = '/api/voice/static_audio/extraction_error/hindi';
            this.app.audioManager.playAudioFromUrl(audioUrl).catch(err => {
                console.error('Error playing extraction error audio:', err);
            });
            
        } catch (error) {
            console.error('Error in extraction fallback:', error);
            // Show popup anyway
            this.showPhoneInputPopup(name);
        }
    }
    
    showPhoneInputPopup(name) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'phoneInputOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        // Create modal content
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            width: 90%;
        `;
        
        modal.innerHTML = `
            <h2 style="color: #16A34A; margin-bottom: 20px; text-align: center;">
                📱 फ़ोन नंबर दर्ज करें
            </h2>
            <p style="margin-bottom: 20px; text-align: center; color: #666;">
                कृपया अपना 10 अंकों का फ़ोन नंबर टाइप करें
            </p>
            <input 
                type="tel" 
                id="phoneInput" 
                placeholder="9876543210"
                maxlength="10"
                style="
                    width: 100%;
                    padding: 15px;
                    font-size: 18px;
                    border: 2px solid #16A34A;
                    border-radius: 8px;
                    text-align: center;
                    margin-bottom: 20px;
                    box-sizing: border-box;
                "
            />
            <button 
                id="submitPhone"
                style="
                    width: 100%;
                    padding: 15px;
                    background: #16A34A;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 18px;
                    cursor: pointer;
                    font-weight: bold;
                "
            >
                जारी रखें →
            </button>
            <p id="phoneError" style="color: #DC2626; margin-top: 10px; text-align: center; display: none;"></p>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Focus input
        const phoneInput = document.getElementById('phoneInput');
        const submitBtn = document.getElementById('submitPhone');
        const errorMsg = document.getElementById('phoneError');
        
        phoneInput.focus();
        
        // Handle submit
        const handleSubmit = () => {
            const phone = phoneInput.value.trim();
            
            // Validate phone number
            if (!/^[6-9]\d{9}$/.test(phone)) {
                errorMsg.textContent = 'कृपया सही 10 अंकों का फ़ोन नंबर दर्ज करें';
                errorMsg.style.display = 'block';
                return;
            }
            
            // Save phone and proceed
            this.app.stateManager.updateUserInfo('name', name || '');
            this.app.stateManager.updateUserInfo('phone', phone);
            
            this.app.elementManager.setElementContent('userName', name || 'उपयोगकर्ता');
            this.app.elementManager.setElementContent('userPhone', phone);
            
            // Remove popup
            document.body.removeChild(overlay);
            
            this.app.uiController.updateStatus('ready', 'जानकारी मिल गई!');
            
            // Proceed to language collection
            setTimeout(() => {
                this.app.startLanguageCollection();
            }, 1000);
        };
        
        submitBtn.addEventListener('click', handleSubmit);
        
        // Handle Enter key with event capture and stopPropagation
        phoneInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit();
            }
        });
        
        // Also handle on the overlay to catch any bubbled events
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit();
            }
        });
    }
    
    async detectLanguage(text, attempt = 1) {
        try {
            const response = await fetch('/api/voice/detect_language', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ 
                    text: text,
                    attempt: attempt 
                })
            });
            
            // Handle 401 errors
            if (response.status === 401) {
                await this.handleApiError(response, () => this.detectLanguage(text, attempt));
                return;
            }
            
            const data = await response.json();
            
            // Check if retry is needed
            if (data.retry && attempt < 3) {
                // Play error audio and retry
                await this.handleLanguageDetectionRetry(attempt);
                return;
            }
            
            if (data.language) {
                this.app.stateManager.updateUserInfo('language', data.language);
                this.app.elementManager.setElementContent('userLanguage', data.language);
                
                // Register user
                await this.registerUser();
                
                // Show user info with animation
                this.app.uiController.showUserInfoDisplay();
                
            } else {
                // Max retries reached or no language detected
                if (attempt >= 3) {
                    this.app.uiController.showError('भाषा पहचानना नहीं हो सकी। डिफ़ॉल्ट हिंदी का उपयोग किया जा रहा है।');
                    // Set default to Hindi
                    this.app.stateManager.updateUserInfo('language', 'hindi');
                    this.app.elementManager.setElementContent('userLanguage', 'hindi');
                    await this.registerUser();
                    this.app.uiController.showUserInfoDisplay();
                } else {
                    // Retry
                    await this.handleLanguageDetectionRetry(attempt);
                }
            }
            
        } catch (error) {
            console.error('Error detecting language:', error);
            if (attempt < 3) {
                await this.handleLanguageDetectionRetry(attempt);
            } else {
                this.app.uiController.showError('भाषा पहचानने में त्रुटि। डिफ़ॉल्ट हिंदी का उपयोग किया जा रहा है।');
                this.app.stateManager.updateUserInfo('language', 'hindi');
                this.app.elementManager.setElementContent('userLanguage', 'hindi');
                await this.registerUser();
                this.app.uiController.showUserInfoDisplay();
            }
        }
    }
    
    async handleLanguageDetectionRetry(attempt) {
        try {
            // Play error audio in Hindi
            this.app.uiController.updateStatus('processing', `पुन: प्रयास ${attempt + 1}/3...`);
            
            const audioUrl = '/api/voice/static_audio/language_error/hindi';
            await this.app.audioManager.playAudioFromUrl(audioUrl);
            
            // Auto-start recording again
            this.app.uiController.updateStatus('ready', 'भाषा बताएं...');
            
            // Store attempt number
            this.languageDetectionAttempt = attempt + 1;
            
            // Auto-start recording for next attempt
            setTimeout(() => {
                this.app.audioManager.startRecording();
            }, 500);
            
        } catch (error) {
            console.error('Error in language retry:', error);
            // Just retry recording
            this.languageDetectionAttempt = attempt + 1;
            setTimeout(() => {
                this.app.audioManager.startRecording();
            }, 1000);
        }
    }
    
    async registerUser() {
        try {
            const userInfo = this.app.stateManager.getUserInfo();
            
            const response = await fetch('/api/user/register', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    name: userInfo.name,
                    phone: userInfo.phone,
                    language: userInfo.language
                })
            });
            
            // Handle 401 errors
            if (response.status === 401) {
                await this.handleApiError(response, () => this.registerUser());
                return;
            }
            
            const data = await response.json();
            
            if (data.user_id) {
                this.app.stateManager.updateUserInfo('user_id', data.user_id);
                this.app.stateManager.updateUserInfo('session_id', data.session_id);
                console.log('User registered:', data);
            }
            
        } catch (error) {
            console.error('Error registering user:', error);
        }
    }
    
    async processConversation(text) {
        try {
            const userInfo = this.app.stateManager.getUserInfo();
            
            // Add user message to conversation
            this.app.conversationManager.addMessageToConversation(text, 'user');
            
            const response = await fetch('/api/voice/generate_response', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    text: text,
                    language: userInfo.language,
                    user_id: userInfo.user_id,
                    session_id: userInfo.session_id
                })
            });
            
            // Handle 401 errors
            if (response.status === 401) {
                await this.handleApiError(response, () => this.processConversation(text));
                return;
            }
            
            const data = await response.json();
            
            if (data.response) {
                // Add bot response to conversation
                this.app.conversationManager.addMessageToConversation(data.response, 'bot');
                
                // Convert to speech and play (status will be managed by playResponse method)
                await this.app.audioManager.playResponse(data.response, data.language);
            } else {
                this.app.uiController.showError('Could not generate response. Please try again.');
                this.app.uiController.updateStatus('ready', 'अगले संदेश के लिए तैयार - Enter दबाएं');
            }
            
        } catch (error) {
            this.app.uiController.showError('Error in conversation: ' + error.message);
            this.app.uiController.updateStatus('error', 'Conversation error');
        }
    }
}