/**
 * KeyboardHandler.js
 * Handles keyboard accessibility and shortcuts
 * ES5 Compatible - No classes or arrow functions
 */

function KeyboardHandler(app) {
    this.app = app;
    this.setupKeyboardListeners();
    this.logKeyboardShortcuts();
}

KeyboardHandler.prototype.setupKeyboardListeners = function() {
    var self = this;
    // Global keyboard event listener
    document.addEventListener('keydown', function(e) {
        self.handleKeyboardInput(e);
    });
};

KeyboardHandler.prototype.handleKeyboardInput = function(event) {
    // Check if phone input popup is open - give it priority
    var phonePopup = document.getElementById('phoneInputOverlay');
    if (phonePopup) {
        // Let the popup handle its own Enter/input events
        return;
    }
    
    // Don't handle keyboard input on landing page - let index.html handle it
    var landingPage = document.getElementById('landing-page');
    if (landingPage && landingPage.style.display !== 'none') {
        return;
    }
    
    // Don't handle keyboard input when login popup is visible
    var loginPopup = document.getElementById('login-popup');
    if (loginPopup && !loginPopup.classList.contains('hidden')) {
        return;
    }
    
    // Prevent keyboard actions when recording is in progress or audio is being processed
    if (this.app.stateManager.getIsRecording()) {
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
};

KeyboardHandler.prototype.handleEnterKey = function() {
    var currentStep = this.app.stateManager.currentStep;
    var elements = this.app.elementManager.getAll();
    
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
};

KeyboardHandler.prototype.handleBackspaceKey = function(event) {
    var elements = this.app.elementManager.getAll();
    
    // Only trigger exit if we're in conversation mode and exit button is visible
    if (!elements.exitContainer.classList.contains('hidden')) {
        event.preventDefault(); // Prevent browser back navigation
        console.log('Backspace pressed - exiting conversation and refreshing page');
        this.app.exitSession();
        // Refresh page after a short delay
        setTimeout(function() {
            window.location.reload();
        }, 500);
    }
};

KeyboardHandler.prototype.setupButtonAccessibility = function() {
    var elements = this.app.elementManager.getAll();
    
    // Make buttons keyboard accessible
    elements.mainBtn.setAttribute('tabindex', '0');
    elements.bottomBtn.setAttribute('tabindex', '0');
    if (elements.desktopBottomBtn) {
        elements.desktopBottomBtn.setAttribute('tabindex', '0');
    }
    if (elements.mobileConversationBtn) {
        elements.mobileConversationBtn.setAttribute('tabindex', '0');
    }
    elements.exitBtn.setAttribute('tabindex', '0');
    if (elements.desktopExitBtn) {
        elements.desktopExitBtn.setAttribute('tabindex', '0');
    }
    
    // Add ARIA labels for better accessibility
    elements.mainBtn.setAttribute('aria-label', 'मुख्य रिकॉर्डिंग बटन - Enter दबाएं');
    if (elements.desktopMainBtn) {
        elements.desktopMainBtn.setAttribute('aria-label', 'मुख्य रिकॉर्डिंग बटन - Enter दबाएं');
    }
    elements.bottomBtn.setAttribute('aria-label', 'बातचीत रिकॉर्डिंग बटन - Enter दबाएं');
    if (elements.desktopBottomBtn) {
        elements.desktopBottomBtn.setAttribute('aria-label', 'बातचीत रिकॉर्डिंग बटन - Enter दबाएं');
    }
    if (elements.mobileConversationBtn) {
        elements.mobileConversationBtn.setAttribute('aria-label', 'बातचीत रिकॉर्डिंग बटन - Enter दबाएं');
    }
    elements.exitBtn.setAttribute('aria-label', 'बाहर निकलें - Backspace दबाएं');
    if (elements.desktopExitBtn) {
        elements.desktopExitBtn.setAttribute('aria-label', 'बाहर निकलें - Backspace दबाएं');
    }
    
    // Add keyboard event listeners directly to buttons as backup
    this.setupIndividualButtonListeners(elements);
};

KeyboardHandler.prototype.setupIndividualButtonListeners = function(elements) {
    var self = this;
    
    elements.mainBtn.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            self.app.handleMainAction();
        }
    });
    
    if (elements.desktopMainBtn) {
        elements.desktopMainBtn.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                self.app.handleMainAction();
            }
        });
    }
    
    elements.bottomBtn.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            self.app.handleConversationRecording();
        }
    });
    
    if (elements.desktopBottomBtn) {
        elements.desktopBottomBtn.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                self.app.handleConversationRecording();
            }
        });
    }
    
    if (elements.mobileConversationBtn) {
        elements.mobileConversationBtn.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                self.app.handleConversationRecording();
            }
        });
    }
    
    elements.exitBtn.addEventListener('keydown', function(e) {
        if ((e.key === 'Enter' || e.keyCode === 13) || (e.key === 'Backspace' || e.keyCode === 8)) {
            e.preventDefault();
            self.app.exitSession();
        }
    });
    
    if (elements.desktopExitBtn) {
        elements.desktopExitBtn.addEventListener('keydown', function(e) {
            if ((e.key === 'Enter' || e.keyCode === 13) || (e.key === 'Backspace' || e.keyCode === 8)) {
                e.preventDefault();
                self.app.exitSession();
            }
        });
    }
};

KeyboardHandler.prototype.logKeyboardShortcuts = function() {
    // Log keyboard shortcuts for developers
    console.log('🎤 Voice Bot Keyboard Shortcuts:');
    console.log('• Enter: Start/Continue Recording');
    console.log('• Backspace: Exit (only in conversation mode)');
    console.log('• All buttons are also clickable with mouse');
};