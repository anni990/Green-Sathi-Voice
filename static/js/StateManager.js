/**
 * StateManager.js
 * Manages application state and flow control
 */

class StateManager {
    constructor() {
        this.currentStep = 'welcome'; // welcome, name_phone, language_detection, info_display, conversation
        this.userInfo = {
            user_id: null,
            session_id: null,
            name: null,
            phone: null,
            language: null,
            device_id: null,
            device_name: null
        };
        
        // Load device info from deviceAuth if available
        if (window.deviceAuth) {
            const deviceInfo = window.deviceAuth.getDeviceInfo();
            this.userInfo.device_id = deviceInfo.deviceId;
            this.userInfo.device_name = deviceInfo.deviceName;
        }
    }
    
    setStep(step) {
        this.currentStep = step;
        console.log(`State changed to: ${step}`);
    }
    
    getCurrentStep() {
        return this.currentStep;
    }
    
    updateUserInfo(field, value) {
        if (this.userInfo.hasOwnProperty(field)) {
            this.userInfo[field] = value;
            console.log(`User info updated: ${field} = ${value}`);
        }
    }
    
    getUserInfo() {
        return this.userInfo;
    }
    
    resetUserInfo() {
        // Keep device info when resetting
        const deviceId = this.userInfo.device_id;
        const deviceName = this.userInfo.device_name;
        
        this.userInfo = {
            user_id: null,
            session_id: null,
            name: null,
            phone: null,
            language: null,
            device_id: deviceId,
            device_name: deviceName
        };
    }
    
    isInStep(step) {
        return this.currentStep === step;
    }
    
    canProceedToNextStep() {
        switch (this.currentStep) {
            case 'welcome':
                return true;
            case 'name_phone':
                return this.userInfo.name && this.userInfo.phone;
            case 'language_detection':
                return this.userInfo.language;
            case 'info_display':
                return this.userInfo.user_id && this.userInfo.session_id;
            case 'conversation':
                return true;
            default:
                return false;
        }
    }
    
    getNextStep() {
        const stepFlow = {
            'welcome': 'name_phone',
            'name_phone': 'language_detection',
            'language_detection': 'info_display',
            'info_display': 'conversation',
            'conversation': 'conversation' // Stay in conversation
        };
        
        return stepFlow[this.currentStep] || this.currentStep;
    }
    
    reset() {
        this.currentStep = 'welcome';
        this.resetUserInfo();
        console.log('State reset to initial state');
    }
    
    // State validation methods
    isWelcomeStep() {
        return this.currentStep === 'welcome';
    }
    
    isNamePhoneStep() {
        return this.currentStep === 'name_phone';
    }
    
    isLanguageDetectionStep() {
        return this.currentStep === 'language_detection';
    }
    
    isInfoDisplayStep() {
        return this.currentStep === 'info_display';
    }
    
    isConversationStep() {
        return this.currentStep === 'conversation';
    }
    
    // User info getters
    get isRecording() {
        return this._isRecording || false;
    }
    
    set isRecording(value) {
        this._isRecording = value;
    }
}