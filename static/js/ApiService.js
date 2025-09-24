/**
 * ApiService.js
 * Handles all API calls and data processing
 */

class ApiService {
    constructor(app) {
        this.app = app;
    }
    
    async extractUserInfo(text) {
        try {
            const response = await fetch('/api/voice/extract_info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: text })
            });
            
            const data = await response.json();
            
            if (data.name && data.phone) {
                this.app.stateManager.updateUserInfo('name', data.name);
                this.app.stateManager.updateUserInfo('phone', data.phone);
                
                // Update UI
                this.app.elementManager.setElementContent('userName', data.name);
                this.app.elementManager.setElementContent('userPhone', data.phone);
                
                this.app.uiController.updateStatus('ready', 'जानकारी मिल गई!');
                
                // Auto-proceed to language collection
                setTimeout(() => {
                    this.app.startLanguageCollection();
                }, 1500);
            } else {
                this.app.uiController.showError('नाम और फोन नंबर नहीं मिल सके। कृपया स्पष्ट बोलें और पुन: प्रयास करें।');
                this.app.uiController.updateStatus('error', 'जानकारी विफल');
                this.app.audioManager.resetButtonState();
            }
            
        } catch (error) {
            this.app.uiController.showError('जानकारी निकालने में त्रुटि: ' + error.message);
            this.app.uiController.updateStatus('error', 'निकालने में त्रुटि');
            this.app.audioManager.resetButtonState();
        }
    }
    
    async detectLanguage(text) {
        try {
            const response = await fetch('/api/voice/detect_language', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: text })
            });
            
            const data = await response.json();
            
            if (data.language) {
                this.app.stateManager.updateUserInfo('language', data.language);
                this.app.elementManager.setElementContent('userLanguage', data.language);
                
                // Register user
                await this.registerUser();
                
                // Show user info with animation
                this.app.uiController.showUserInfoDisplay();
                
            } else {
                this.app.uiController.showError('भाषा पहचानना नहीं हो सकी। कृपया पुन: प्रयास करें।');
                this.app.uiController.updateStatus('error', 'भाषा पहचान विफल');
            }
            
        } catch (error) {
            this.app.uiController.showError('भाषा पहचानने में त्रुटि: ' + error.message);
            this.app.uiController.updateStatus('error', 'पहचान त्रुटि');
        }
    }
    
    async registerUser() {
        try {
            const userInfo = this.app.stateManager.getUserInfo();
            
            const response = await fetch('/api/user/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: userInfo.name,
                    phone: userInfo.phone,
                    language: userInfo.language
                })
            });
            
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
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    language: userInfo.language,
                    user_id: userInfo.user_id,
                    session_id: userInfo.session_id
                })
            });
            
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