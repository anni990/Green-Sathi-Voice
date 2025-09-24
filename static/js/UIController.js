/**
 * UIController.js
 * Handles UI updates, status management, and visual effects
 */

class UIController {
    constructor(app) {
        this.app = app;
    }
    
    setupInitialState() {
        this.updateStatus('ready', 'तैयार है शुरू करने के लिए');
        
        const elements = this.app.elementManager.getAll();
        elements.mainBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        elements.actionInstruction.textContent = 'आवाज़ सहायक शुरू करने के लिए क्लिक करें (Enter दबाएं)';
        
        this.app.keyboardHandler.setupButtonAccessibility();
        elements.mobileConversationBtn.classList.add('hidden');
    }
    
    showUserInfoDisplay() {
        const elements = this.app.elementManager.getAll();
        
        // Show user info
        elements.userInfoDiv.classList.remove('hidden');
        
        // Add slide transition
        elements.userInfoDiv.classList.add('slide-in-right');
        setTimeout(() => {
            elements.userInfoDiv.classList.remove('slide-in-right');
        }, 100);
        
        // Auto-start conversation after showing user info
        setTimeout(() => {
            this.app.startConversation();
        }, 2000); // 2 second delay to show the info
    }
    
    showExitButton() {
        this.app.elementManager.showElement('exitContainer');
    }
    
    hideExitButton() {
        this.app.elementManager.hideElement('exitContainer');
    }
    
    resetToInitialLayout() {
        const elements = this.app.elementManager.getAll();
        
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
        const desktopSidebarButton = document.getElementById('desktop-sidebar-button');
        if (desktopSidebarButton) {
            desktopSidebarButton.remove();
        }
        
        // Reset main content
        elements.mainContent.innerHTML = `
            <p id="action-instruction" class="text-base lg:text-lg text-gray-700 font-medium mb-6 lg:mb-8">
                आवाज़ सहायक शुरू करने के लिए क्लिक करें (Enter दबाएं)
            </p>
        `;
        
        // Re-initialize action instruction element
        this.app.elementManager.elements.actionInstruction = document.getElementById('action-instruction');
    }
    
    setupConversationLayout() {
        const elements = this.app.elementManager.getAll();
        
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
        
        elements.mainContent.innerHTML = `
            <div class="text-center">
                <p class="text-base lg:text-lg text-gray-700 font-medium mb-4">आपकी जानकारी सहेज ली गई है</p>
                <div class="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 lg:hidden">
                    <p class="font-semibold mb-2 flex items-center"><i class="fas fa-check-circle mr-2"></i>तैयार!</p>
                    <p class="text-xs">अब आप बात कर सकते हैं।</p>
                </div>
            </div>
        `;
        
        this.updateStatus('ready', 'बातचीत शुरू! रिकॉर्ड बटन दबाकर बोलें');
    }
    
    showVoiceAnimation(show) {
        const elements = this.app.elementManager.getAll();
        
        if (show) {
            elements.voiceAnimation.classList.remove('hidden');
        } else {
            elements.voiceAnimation.classList.add('hidden');
        }
    }
    
    updateStatus(status, text) {
        const elements = this.app.elementManager.getAll();
        
        elements.statusIndicator.className = `status-indicator status-${status}`;
        elements.statusText.textContent = text;
    }
    
    showError(message) {
        const elements = this.app.elementManager.getAll();
        
        elements.errorText.textContent = message;
        elements.errorMessage.classList.remove('hidden');
        
        setTimeout(() => {
            elements.errorMessage.classList.add('hidden');
        }, 5000);
    }
    
    updateActionInstruction(text) {
        const elements = this.app.elementManager.getAll();
        
        if (elements.actionInstruction) {
            elements.actionInstruction.textContent = text;
        }
    }
    
    setMainButtonIcon(iconHtml) {
        const elements = this.app.elementManager.getAll();
        
        if (elements.mainBtn) {
            elements.mainBtn.innerHTML = iconHtml;
        }
    }
    
    // Layout management methods
    showMobileLayout() {
        // Implementation for mobile-specific layout adjustments
        const elements = this.app.elementManager.getAll();
        
        if (elements.keyboardShortcutsMobile) {
            elements.keyboardShortcutsMobile.classList.remove('hidden');
        }
    }
    
    showDesktopLayout() {
        // Implementation for desktop-specific layout adjustments
        const elements = this.app.elementManager.getAll();
        
        if (elements.keyboardShortcutsDesktop) {
            elements.keyboardShortcutsDesktop.classList.remove('hidden');
        }
    }
    
    // Responsive layout management
    handleResponsiveLayout() {
        if (window.innerWidth >= 1024) {
            this.showDesktopLayout();
        } else {
            this.showMobileLayout();
        }
    }
}