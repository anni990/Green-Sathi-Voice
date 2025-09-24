/**
 * app.js - Main Application File
 * Orchestrates all modules and handles the main application flow
 */

class VoiceBotApp {
    constructor() {
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
    
    initialize() {
        this.bindEvents();
        this.uiController.setupInitialState();
        this.audioManager.checkMicrophonePermission();
    }
    
    bindEvents() {
        const elements = this.elementManager.getAll();
        
        // Main action buttons
        elements.mainBtn.addEventListener('click', () => this.handleMainAction());
        elements.desktopMainBtn?.addEventListener('click', () => this.handleMainAction());
        
        // Conversation buttons
        elements.bottomBtn.addEventListener('click', () => this.handleConversationRecording());
        elements.desktopBottomBtn?.addEventListener('click', () => this.handleConversationRecording());
        elements.mobileConversationBtn?.addEventListener('click', () => this.handleConversationRecording());
        
        // Exit buttons
        elements.exitBtn.addEventListener('click', () => this.exitSession());
        elements.desktopExitBtn?.addEventListener('click', () => this.exitSession());
    }
    
    // Main action handlers
    handleMainAction() {
        const currentStep = this.stateManager.getCurrentStep();
        
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
    }
    
    handleConversationRecording() {
        if (this.stateManager.isConversationStep()) {
            // Stop any playing audio before starting recording
            this.audioManager.stopAllAudio();
            this.audioManager.startRecording();
        }
    }
    
    exitSession() {
        // Reset to initial state
        this.stateManager.reset();
        
        const elements = this.elementManager.getAll();
        
        // Hide all sections
        elements.userInfoDiv.classList.add('hidden');
        elements.conversationContainer.classList.add('hidden');
        elements.keyboardShortcutsMobile?.classList.add('hidden');
        elements.keyboardShortcutsDesktop?.classList.add('hidden');
        this.uiController.resetToInitialLayout();
        
        // Reset UI
        this.uiController.setupInitialState();
        
        // Clear conversation
        this.conversationManager.clearConversation();
        
        // Refresh page after exit
        setTimeout(() => {
            window.location.reload();
        }, 300);
    }
    
    // Flow control methods
    async startNamePhoneCollection() {
        this.stateManager.setStep('name_phone');
        this.uiController.updateStatus('processing', 'ऑडियो चला रहा है...');
        this.uiController.updateActionInstruction('कृपया अपना नाम और फोन नंबर बताएं (Enter दबाकर रिकॉर्ड करें)');
        
        const elements = this.elementManager.getAll();
        elements.mainBtn.classList.add('recording');
        
        // Set flag to auto-record after audio ends
        this.audioManager.autoRecordAfterAudio = true;
        
        // Play static audio prompt in Hindi
        await this.audioManager.playStaticAudio('name_phone', 'hi');
    }
    
    async startLanguageCollection() {
        this.stateManager.setStep('language_detection');
        this.uiController.updateStatus('processing', 'भाषा चयन ऑडियो...');
        this.uiController.updateActionInstruction('अपनी पसंदीदा भाषा बताएं');
        
        // Set flag to auto-record after audio ends
        this.audioManager.autoRecordAfterAudio = true;
        
        // Play static audio prompt in Hindi
        await this.audioManager.playStaticAudio('language_selection', 'hi');
    }
    
    async startConversation() {
        this.stateManager.setStep('conversation');
        
        // Setup conversation layout
        this.uiController.setupConversationLayout();
        
        const elements = this.elementManager.getAll();
        
        // Show desktop main button for conversation on desktop
        if (window.innerWidth >= 1024 && elements.desktopMainBtn) {
            elements.desktopMainBtn.classList.remove('hidden');
        }
        
        // Play conversation start audio in user's language
        const userInfo = this.stateManager.getUserInfo();
        await this.audioManager.playStaticAudio('conversation_start', userInfo.language || 'hi');
    }
    
    // Text processing handlers
    async handleTranscribedText(text) {
        console.log('Transcribed text:', text);
        
        const currentStep = this.stateManager.getCurrentStep();
        
        switch (currentStep) {
            case 'name_phone':
                await this.apiService.extractUserInfo(text);
                break;
            case 'language_detection':
                await this.apiService.detectLanguage(text);
                break;
            case 'conversation':
                await this.apiService.processConversation(text);
                break;
        }
    }
    
    // Utility methods for backward compatibility
    get currentStep() {
        return this.stateManager.getCurrentStep();
    }
    
    get userInfo() {
        return this.stateManager.getUserInfo();
    }
    
    get isRecording() {
        return this.audioManager.isRecording;
    }
    
    get isAudioPlaying() {
        return this.audioManager.isAudioPlaying;
    }
    
    // Direct access to manager methods for backward compatibility
    updateStatus(status, text) {
        this.uiController.updateStatus(status, text);
    }
    
    showError(message) {
        this.uiController.showError(message);
    }
    
    showVoiceAnimation(show) {
        this.uiController.showVoiceAnimation(show);
    }
    
    addMessageToConversation(message, type) {
        this.conversationManager.addMessageToConversation(message, type);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VoiceBotApp();
});