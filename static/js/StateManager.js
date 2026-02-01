/**
 * StateManager.js
 * Manages application state and flow control
 * ES5 Compatible - No classes or arrow functions
 */

function StateManager() {
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
    this._isRecording = false;
    
    // Load device info from deviceAuth if available
    if (window.deviceAuth) {
        var deviceInfo = window.deviceAuth.getDeviceInfo();
        this.userInfo.device_id = deviceInfo.deviceId;
        this.userInfo.device_name = deviceInfo.deviceName;
    }
}

StateManager.prototype.setStep = function(step) {
    this.currentStep = step;
    console.log('State changed to: ' + step);
};

StateManager.prototype.getCurrentStep = function() {
    return this.currentStep;
};

StateManager.prototype.updateUserInfo = function(field, value) {
    if (this.userInfo.hasOwnProperty(field)) {
        this.userInfo[field] = value;
        console.log('User info updated: ' + field + ' = ' + value);
    }
};

StateManager.prototype.getUserInfo = function() {
    return this.userInfo;
};

StateManager.prototype.resetUserInfo = function() {
    // Keep device info when resetting
    var deviceId = this.userInfo.device_id;
    var deviceName = this.userInfo.device_name;
    
    this.userInfo = {
        user_id: null,
        session_id: null,
        name: null,
        phone: null,
        language: null,
        device_id: deviceId,
        device_name: deviceName
    };
};

StateManager.prototype.isInStep = function(step) {
    return this.currentStep === step;
};

StateManager.prototype.canProceedToNextStep = function() {
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
};

StateManager.prototype.getNextStep = function() {
    var stepFlow = {
        'welcome': 'name_phone',
        'name_phone': 'language_detection',
        'language_detection': 'info_display',
        'info_display': 'conversation',
        'conversation': 'conversation' // Stay in conversation
    };
    
    return stepFlow[this.currentStep] || this.currentStep;
};

StateManager.prototype.reset = function() {
    this.currentStep = 'welcome';
    this.resetUserInfo();
    console.log('State reset to initial state');
};

// State validation methods
StateManager.prototype.isWelcomeStep = function() {
    return this.currentStep === 'welcome';
};

StateManager.prototype.isNamePhoneStep = function() {
    return this.currentStep === 'name_phone';
};

StateManager.prototype.isLanguageDetectionStep = function() {
    return this.currentStep === 'language_detection';
};

StateManager.prototype.isInfoDisplayStep = function() {
    return this.currentStep === 'info_display';
};

StateManager.prototype.isConversationStep = function() {
    return this.currentStep === 'conversation';
};

// User info getters/setters using prototype methods (no ES6 getters/setters)
StateManager.prototype.getIsRecording = function() {
    return this._isRecording || false;
};

StateManager.prototype.setIsRecording = function(value) {
    this._isRecording = value;
};