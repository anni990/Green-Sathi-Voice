/**
 * ElementManager.js
 * Handles DOM element initialization and references
 * ES5 Compatible - No classes or arrow functions
 */

function ElementManager() {
    this.elements = {};
    this.initializeElements();
}

ElementManager.prototype.initializeElements = function() {
    // Main elements
    this.elements.mainBtn = document.getElementById('main-action-btn');
    this.elements.desktopMainBtn = document.getElementById('desktop-main-action-btn');
    this.elements.bottomBtn = document.getElementById('bottom-action-btn');
    this.elements.desktopBottomBtn = document.getElementById('desktop-bottom-action-btn');
    this.elements.mobileConversationBtn = document.getElementById('mobile-conversation-btn');
    this.elements.exitBtn = document.getElementById('exit-btn');
    this.elements.desktopExitBtn = document.getElementById('desktop-exit-btn');
    this.elements.centerButtonContainer = document.getElementById('center-button-container');
    this.elements.bottomButtonContainer = document.getElementById('bottom-button-container');
    this.elements.exitContainer = document.getElementById('exit-container');
    this.elements.mainContent = document.getElementById('main-content');
    this.elements.statusIndicator = document.getElementById('status-indicator');
    this.elements.statusText = document.getElementById('status-text');
    this.elements.actionInstruction = document.getElementById('action-instruction');
    this.elements.voiceAnimation = document.getElementById('voice-animation');
    this.elements.loadingSpinner = document.getElementById('loading-spinner');
    this.elements.errorMessage = document.getElementById('error-message');
    this.elements.errorText = document.getElementById('error-text');
    
    // Keyboard shortcuts info
    this.elements.keyboardShortcutsMobile = document.getElementById('keyboard-shortcuts-mobile');
    this.elements.keyboardShortcutsDesktop = document.getElementById('keyboard-shortcuts-desktop');
    
    // User info elements
    this.elements.userInfoDiv = document.getElementById('user-info');
    this.elements.userName = document.getElementById('user-name');
    this.elements.userPhone = document.getElementById('user-phone');
    this.elements.userLanguage = document.getElementById('user-language');
    
    // Conversation elements
    this.elements.conversationContainer = document.getElementById('conversation-container');
    this.elements.conversationHistory = document.getElementById('conversation-history');
    
    // Audio elements
    this.elements.audioPlayer = document.getElementById('audio-player');
    this.elements.staticAudio = document.getElementById('static-audio');
};

ElementManager.prototype.get = function(elementName) {
    return this.elements[elementName];
};

ElementManager.prototype.getAll = function() {
    return this.elements;
};

// Helper methods for common element operations
ElementManager.prototype.showElement = function(elementName) {
    var element = this.elements[elementName];
    if (element) {
        element.classList.remove('hidden');
    }
};

ElementManager.prototype.hideElement = function(elementName) {
    var element = this.elements[elementName];
    if (element) {
        element.classList.add('hidden');
    }
};

ElementManager.prototype.toggleElement = function(elementName) {
    var element = this.elements[elementName];
    if (element) {
        element.classList.toggle('hidden');
    }
};

ElementManager.prototype.setElementContent = function(elementName, content) {
    var element = this.elements[elementName];
    if (element) {
        if (typeof content === 'string') {
            element.textContent = content;
        } else {
            element.innerHTML = content;
        }
    }
};

ElementManager.prototype.addClassToElement = function(elementName, className) {
    var element = this.elements[elementName];
    if (element) {
        element.classList.add(className);
    }
};

ElementManager.prototype.removeClassFromElement = function(elementName, className) {
    var element = this.elements[elementName];
    if (element) {
        element.classList.remove(className);
    }
};