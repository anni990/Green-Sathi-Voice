/**
 * KeyboardHandler.js
 * Handles keyboard accessibility and shortcuts
 */

class KeyboardHandler {
    constructor(app) {
        this.app = app;
        this.setupKeyboardListeners();
        this.logKeyboardShortcuts();
    }
    
    setupKeyboardListeners() {
        // Global keyboard event listener
        document.addEventListener('keydown', (e) => this.handleKeyboardInput(e));
    }
    
    handleKeyboardInput(event) {
        // Check if phone input popup is open - give it priority
        const phonePopup = document.getElementById('phoneInputOverlay');
        if (phonePopup) {
            // Let the popup handle its own Enter/input events
            return;
        }
        
        // Don't handle keyboard input on landing page - let index.html handle it
        if (document.getElementById('landing-page') && document.getElementById('landing-page').style.display !== 'none') {
            return;
        }
        
        // Don't handle keyboard input when login popup is visible
        if (document.getElementById('login-popup') && !document.getElementById('login-popup').classList.contains('hidden')) {
            return;
        }
        
        // Prevent keyboard actions when recording is in progress or audio is being processed
        if (this.app.stateManager.isRecording) {
            return;
        }
        
        // Prevent default browser behavior for these keys
        if (event.key === 'Enter' || event.key === 'Backspace') {
            // Don't prevent backspace in input fields
            if (event.key === 'Backspace' && event.target.tagName === 'INPUT') {
                return;
            }
        }
        
        // Handle Enter key for main action buttons
        if (event.key === 'Enter' || event.keyCode === 13) {
            event.preventDefault();
            this.handleEnterKey();
        }
        
        // Handle Backspace key for exit button (only in conversation mode)
        else if ((event.key === 'Backspace' || event.keyCode === 8) && this.app.stateManager.currentStep === 'conversation') {
            this.handleBackspaceKey(event);
        }
    }
    
    handleEnterKey() {
        const currentStep = this.app.stateManager.currentStep;
        const elements = this.app.elementManager.getAll();
        
        // Determine which button action to trigger based on current step
        if (currentStep === 'conversation') {
            // In conversation mode, use desktop main button on desktop, mobile conversation button on mobile
            if (window.innerWidth >= 1024 && elements.desktopMainBtn && !elements.desktopMainBtn.classList.contains('hidden')) {
                console.log('Enter pressed - triggering desktop conversation recording');
                this.app.handleMainAction(); // Desktop main button uses handleMainAction
            } else if (elements.mobileConversationBtn && !elements.conversationContainer.classList.contains('hidden')) {
                console.log('Enter pressed - triggering mobile conversation recording');
                this.app.handleConversationRecording();
            }
        } else {
            // In other modes, use main button
            if (!elements.centerButtonContainer.classList.contains('hidden')) {
                console.log('Enter pressed - triggering main action');
                this.app.handleMainAction();
            }
        }
    }
    
    handleBackspaceKey(event) {
        const elements = this.app.elementManager.getAll();
        
        // Only trigger exit if we're in conversation mode and exit button is visible
        if (!elements.exitContainer.classList.contains('hidden')) {
            event.preventDefault(); // Prevent browser back navigation
            console.log('Backspace pressed - exiting conversation and refreshing page');
            this.app.exitSession();
            // Refresh page after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
    }
    
    setupButtonAccessibility() {
        const elements = this.app.elementManager.getAll();
        
        // Make buttons keyboard accessible
        elements.mainBtn.setAttribute('tabindex', '0');
        elements.bottomBtn.setAttribute('tabindex', '0');
        elements.desktopBottomBtn?.setAttribute('tabindex', '0');
        elements.mobileConversationBtn?.setAttribute('tabindex', '0');
        elements.exitBtn.setAttribute('tabindex', '0');
        elements.desktopExitBtn?.setAttribute('tabindex', '0');
        
        // Add ARIA labels for better accessibility
        elements.mainBtn.setAttribute('aria-label', 'मुख्य रिकॉर्डिंग बटन - Enter दबाएं');
        elements.desktopMainBtn?.setAttribute('aria-label', 'मुख्य रिकॉर्डिंग बटन - Enter दबाएं');
        elements.bottomBtn.setAttribute('aria-label', 'बातचीत रिकॉर्डिंग बटन - Enter दबाएं');
        elements.desktopBottomBtn?.setAttribute('aria-label', 'बातचीत रिकॉर्डिंग बटन - Enter दबाएं');
        elements.mobileConversationBtn?.setAttribute('aria-label', 'बातचीत रिकॉर्डिंग बटन - Enter दबाएं');
        elements.exitBtn.setAttribute('aria-label', 'बाहर निकलें - Backspace दबाएं');
        elements.desktopExitBtn?.setAttribute('aria-label', 'बाहर निकलें - Backspace दबाएं');
        
        // Add keyboard event listeners directly to buttons as backup
        this.setupIndividualButtonListeners(elements);
    }
    
    setupIndividualButtonListeners(elements) {
        elements.mainBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                this.app.handleMainAction();
            }
        });
        
        elements.desktopMainBtn?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                this.app.handleMainAction();
            }
        });
        
        elements.bottomBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                this.app.handleConversationRecording();
            }
        });
        
        elements.desktopBottomBtn?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                this.app.handleConversationRecording();
            }
        });
        
        elements.mobileConversationBtn?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                this.app.handleConversationRecording();
            }
        });
        
        elements.exitBtn.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.keyCode === 13) || (e.key === 'Backspace' || e.keyCode === 8)) {
                e.preventDefault();
                this.app.exitSession();
            }
        });
        
        elements.desktopExitBtn?.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.keyCode === 13) || (e.key === 'Backspace' || e.keyCode === 8)) {
                e.preventDefault();
                this.app.exitSession();
            }
        });
    }
    
    logKeyboardShortcuts() {
        // Log keyboard shortcuts for developers
        console.log('🎤 Voice Bot Keyboard Shortcuts:');
        console.log('• Enter: Start/Continue Recording');
        console.log('• Backspace: Exit (only in conversation mode)');
        console.log('• All buttons are also clickable with mouse');
    }
}