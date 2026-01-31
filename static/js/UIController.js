/**
 * UIController.js
 * Handles UI updates, status management, and visual effects
 * ES5 Compatible - No classes, arrow functions, or template literals
 */

function UIController(app) {
    this.app = app;
}

UIController.prototype.setupInitialState = function() {
    this.updateStatus('ready', 'तैयार है शुरू करने के लिए');
    
    var elements = this.app.elementManager.getAll();
    elements.mainBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    elements.actionInstruction.textContent = 'आवाज़ सहायक शुरू करने के लिए क्लिक करें (Enter दबाएं)';
    
    this.app.keyboardHandler.setupButtonAccessibility();
    elements.mobileConversationBtn.classList.add('hidden');
};

UIController.prototype.showUserInfoDisplay = function() {
    var self = this;
    var elements = this.app.elementManager.getAll();
    
    // Show user info
    elements.userInfoDiv.classList.remove('hidden');
    
    // Add slide transition
    elements.userInfoDiv.classList.add('slide-in-right');
    setTimeout(function() {
        elements.userInfoDiv.classList.remove('slide-in-right');
    }, 100);
    
    // Auto-start conversation after showing user info
    setTimeout(function() {
        self.app.startConversation();
    }, 2000); // 2 second delay to show the info
};

UIController.prototype.showExitButton = function() {
    this.app.elementManager.showElement('exitContainer');
};

UIController.prototype.hideExitButton = function() {
    this.app.elementManager.hideElement('exitContainer');
};

UIController.prototype.resetToInitialLayout = function() {
    var elements = this.app.elementManager.getAll();
    
    // Reset step and show appropriate buttons
    this.app.stateManager.setStep('welcome');
    elements.centerButtonContainer.classList.remove('hidden');
    elements.bottomButtonContainer.classList.add('hidden');
    this.hideExitButton();
    
    // Hide desktop main button on reset
    if (elements.desktopMainBtn) {
        elements.desktopMainBtn.classList.add('hidden');
    }
    
    // Remove any dynamically created buttons
    var desktopSidebarButton = document.getElementById('desktop-sidebar-button');
    if (desktopSidebarButton) {
        desktopSidebarButton.remove();
    }
    
    // Reset main content
    elements.mainContent.innerHTML = 
        '<p id="action-instruction" class="text-base lg:text-lg text-gray-700 font-medium mb-6 lg:mb-8">' +
        'आवाज़ सहायक शुरू करने के लिए क्लिक करें (Enter दबाएं)' +
        '</p>';
    
    // Re-initialize action instruction element
    this.app.elementManager.elements.actionInstruction = document.getElementById('action-instruction');
};

UIController.prototype.setupConversationLayout = function() {
    var elements = this.app.elementManager.getAll();
    
    // Hide mobile buttons and show conversation container
    elements.centerButtonContainer.classList.add('hidden');
    elements.bottomButtonContainer.classList.add('hidden');
    elements.conversationContainer.classList.remove('hidden');
    elements.mobileConversationBtn.classList.remove('hidden');
    this.showExitButton();
    
    // Show desktop main button for conversation on desktop
    if (window.innerWidth >= 1024 && elements.desktopMainBtn) {
        elements.desktopMainBtn.classList.remove('hidden');
    }
    
    // Show keyboard shortcuts for mobile and desktop
    // elements.keyboardShortcutsDesktop?.classList.remove('hidden');
    
    elements.mainContent.innerHTML = 
        '<div class="text-center">' +
        '<p class="text-base lg:text-lg text-gray-700 font-medium mb-4">आपकी जानकारी सहेज ली गई है</p>' +
        '<div class="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 lg:hidden">' +
        '<p class="font-semibold mb-2 flex items-center"><i class="fas fa-check-circle mr-2"></i>तैयार!</p>' +
        '<p class="text-xs">अब आप बात कर सकते हैं।</p>' +
        '</div>' +
        '</div>';
    
    this.updateStatus('ready', 'बातचीत शुरू! रिकॉर्ड बटन दबाकर बोलें');
};

UIController.prototype.showVoiceAnimation = function(show) {
    var elements = this.app.elementManager.getAll();
    
    if (show) {
        elements.voiceAnimation.classList.remove('hidden');
    } else {
        elements.voiceAnimation.classList.add('hidden');
    }
};

UIController.prototype.updateStatus = function(status, text) {
    var elements = this.app.elementManager.getAll();
    
    elements.statusIndicator.className = 'status-indicator status-' + status;
    elements.statusText.textContent = text;
};

UIController.prototype.showError = function(message) {
    var elements = this.app.elementManager.getAll();
    
    elements.errorText.textContent = message;
    elements.errorMessage.classList.remove('hidden');
    
    setTimeout(function() {
        elements.errorMessage.classList.add('hidden');
    }, 5000);
};

UIController.prototype.updateActionInstruction = function(text) {
    var elements = this.app.elementManager.getAll();
    
    if (elements.actionInstruction) {
        elements.actionInstruction.textContent = text;
    }
};

UIController.prototype.setMainButtonIcon = function(iconHtml) {
    var elements = this.app.elementManager.getAll();
    
    if (elements.mainBtn) {
        elements.mainBtn.innerHTML = iconHtml;
    }
};

// Layout management methods
UIController.prototype.showMobileLayout = function() {
    // Implementation for mobile-specific layout adjustments
    var elements = this.app.elementManager.getAll();
    
    if (elements.keyboardShortcutsMobile) {
        elements.keyboardShortcutsMobile.classList.remove('hidden');
    }
};

UIController.prototype.showDesktopLayout = function() {
    // Implementation for desktop-specific layout adjustments
    var elements = this.app.elementManager.getAll();
    
    if (elements.keyboardShortcutsDesktop) {
        elements.keyboardShortcutsDesktop.classList.remove('hidden');
    }
};

// Responsive layout management
UIController.prototype.handleResponsiveLayout = function() {
    if (window.innerWidth >= 1024) {
        this.showDesktopLayout();
    } else {
        this.showMobileLayout();
    }
};