/**
 * app_modular.js - Main Application File (ES5 Compatible)
 * Orchestrates all modules and handles the main application flow
 * ES5 Compatible - No classes, async/await, arrow functions, or template literals
 */

function VoiceBotApp() {
    // Initialize all managers
    this.elementManager = new ElementManager();
    this.stateManager = new StateManager();
    this.uiController = new UIController(this);
    this.keyboardHandler = new KeyboardHandler(this);
    this.audioManager = new AudioManager(this);
    this.apiService = new ApiService(this);
    this.conversationManager = new ConversationManager(this);
    
    // Initialize the application
    this.initialize();
}

VoiceBotApp.prototype.initialize = function() {
    this.bindEvents();
    this.uiController.setupInitialState();
    this.audioManager.checkMicrophonePermission();
};

VoiceBotApp.prototype.bindEvents = function() {
    var self = this;
    var elements = this.elementManager.getAll();
    
    // Main action buttons
    elements.mainBtn.addEventListener('click', function() {
        self.handleMainAction();
    });
    
    if (elements.desktopMainBtn) {
        elements.desktopMainBtn.addEventListener('click', function() {
            self.handleMainAction();
        });
    }
    
    // Conversation buttons
    elements.bottomBtn.addEventListener('click', function() {
        self.handleConversationRecording();
    });
    
    if (elements.desktopBottomBtn) {
        elements.desktopBottomBtn.addEventListener('click', function() {
            self.handleConversationRecording();
        });
    }
    
    if (elements.mobileConversationBtn) {
        elements.mobileConversationBtn.addEventListener('click', function() {
            self.handleConversationRecording();
        });
    }
    
    // Exit buttons
    elements.exitBtn.addEventListener('click', function() {
        self.exitSession();
    });
    
    if (elements.desktopExitBtn) {
        elements.desktopExitBtn.addEventListener('click', function() {
            self.exitSession();
        });
    }
};

// Main action handlers
VoiceBotApp.prototype.handleMainAction = function() {
    var currentStep = this.stateManager.getCurrentStep();
    
    switch (currentStep) {
        case 'welcome':
            this.startNamePhoneCollection();
            break;
        case 'name_phone':
            this.audioManager.stopAllAudio();
            this.audioManager.startRecording();
            break;
        case 'conversation':
            // For conversation, desktop main button should work
            this.audioManager.stopAllAudio();
            this.audioManager.startRecording();
            break;
    }
};

VoiceBotApp.prototype.handleConversationRecording = function() {
    if (this.stateManager.isConversationStep()) {
        // Stop any playing audio before starting recording
        this.audioManager.stopAllAudio();
        this.audioManager.startRecording();
    }
};

VoiceBotApp.prototype.exitSession = function() {
    var self = this;
    
    // Reset to initial state
    this.stateManager.reset();
    
    var elements = this.elementManager.getAll();
    
    // Hide all sections
    elements.userInfoDiv.classList.add('hidden');
    elements.conversationContainer.classList.add('hidden');
    
    if (elements.keyboardShortcutsMobile) {
        elements.keyboardShortcutsMobile.classList.add('hidden');
    }
    
    if (elements.keyboardShortcutsDesktop) {
        elements.keyboardShortcutsDesktop.classList.add('hidden');
    }
    
    this.uiController.resetToInitialLayout();
    
    // Reset UI
    this.uiController.setupInitialState();
    
    // Clear conversation
    this.conversationManager.clearConversation();
    
    // Refresh page after exit
    setTimeout(function() {
        window.location.reload();
    }, 300);
};

// Flow control methods
VoiceBotApp.prototype.startNamePhoneCollection = function() {
    this.stateManager.setStep('name_phone');
    this.uiController.updateStatus('processing', 'ऑडियो चला रहा है...');
    this.uiController.updateActionInstruction('कृपया अपना नाम और फोन नंबर बताएं (Enter दबाकर रिकॉर्ड करें)');
    
    var elements = this.elementManager.getAll();
    elements.mainBtn.classList.add('recording');
    
    // Set flag to auto-record after audio ends
    this.audioManager.autoRecordAfterAudio = true;
    
    // Play static audio prompt in Hindi
    return this.audioManager.playStaticAudio('name_phone', 'hi');
};

VoiceBotApp.prototype.startLanguageCollection = function() {
    this.stateManager.setStep('language_detection');
    this.uiController.updateStatus('processing', 'भाषा चयन ऑडियो...');
    this.uiController.updateActionInstruction('अपनी पसंदीदा भाषा बताएं');
    
    // Set flag to auto-record after audio ends
    this.audioManager.autoRecordAfterAudio = true;
    
    // Play static audio prompt in Hindi
    return this.audioManager.playStaticAudio('language_selection', 'hi');
};

VoiceBotApp.prototype.startConversation = function() {
    this.stateManager.setStep('conversation');
    
    // Setup conversation layout
    this.uiController.setupConversationLayout();
    
    var elements = this.elementManager.getAll();
    
    // Show desktop main button for conversation on desktop
    if (window.innerWidth >= 1024 && elements.desktopMainBtn) {
        elements.desktopMainBtn.classList.remove('hidden');
    }
    
    // Play conversation start audio in user's language
    var userInfo = this.stateManager.getUserInfo();
    return this.audioManager.playStaticAudio('conversation_start', userInfo.language || 'hi');
};

// Text processing handlers
VoiceBotApp.prototype.handleTranscribedText = function(text) {
    console.log('Transcribed text:', text);
    
    var currentStep = this.stateManager.getCurrentStep();
    
    switch (currentStep) {
        case 'name_phone':
            return this.apiService.extractUserInfo(text);
        case 'language_detection':
            // Get current attempt number from apiService
            var attempt = this.apiService.languageDetectionAttempt || 1;
            return this.apiService.detectLanguage(text, attempt);
        case 'conversation':
            return this.apiService.processConversation(text);
    }
    
    return Promise.resolve();
};

// Utility methods for backward compatibility
VoiceBotApp.prototype.getCurrentStep = function() {
    return this.stateManager.getCurrentStep();
};

VoiceBotApp.prototype.getUserInfo = function() {
    return this.stateManager.getUserInfo();
};

VoiceBotApp.prototype.getIsRecording = function() {
    return this.audioManager.isRecording;
};

VoiceBotApp.prototype.getIsAudioPlaying = function() {
    return this.audioManager.isAudioPlaying;
};

// Direct access to manager methods for backward compatibility
VoiceBotApp.prototype.updateStatus = function(status, text) {
    this.uiController.updateStatus(status, text);
};

VoiceBotApp.prototype.showError = function(message) {
    this.uiController.showError(message);
};

VoiceBotApp.prototype.showVoiceAnimation = function(show) {
    this.uiController.showVoiceAnimation(show);
};

VoiceBotApp.prototype.addMessageToConversation = function(message, type) {
    this.conversationManager.addMessageToConversation(message, type);
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.app = new VoiceBotApp();
});
