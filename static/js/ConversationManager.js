/**
 * ConversationManager.js
 * Handles conversation flow and message display
 */

class ConversationManager {
    constructor(app) {
        this.app = app;
    }
    
    addMessageToConversation(message, type) {
        const elements = this.app.elementManager.getAll();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `conversation-bubble flex ${type === 'user' ? 'justify-end' : 'justify-start'} mb-4`;
        
        const bubble = document.createElement('div');
        bubble.className = `max-w-xs lg:max-w-md px-4 lg:px-5 py-2 lg:py-3 rounded-2xl font-medium text-sm lg:text-base ${
            type === 'user' 
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white rounded-br-md shadow-md' 
                : 'bg-gradient-to-r from-orange-100 to-orange-200 text-gray-800 rounded-bl-md border border-orange-300'
        }`;
        
        bubble.textContent = message;
        messageDiv.appendChild(bubble);
        
        elements.conversationHistory.appendChild(messageDiv);
        elements.conversationHistory.scrollTop = elements.conversationHistory.scrollHeight;
    }
    
    clearConversation() {
        const elements = this.app.elementManager.getAll();
        elements.conversationHistory.innerHTML = '';
    }
    
    scrollToBottom() {
        const elements = this.app.elementManager.getAll();
        elements.conversationHistory.scrollTop = elements.conversationHistory.scrollHeight;
    }
    
    getConversationLength() {
        const elements = this.app.elementManager.getAll();
        return elements.conversationHistory.children.length;
    }
    
    addTypingIndicator() {
        const elements = this.app.elementManager.getAll();
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'conversation-bubble flex justify-start mb-4 typing-indicator';
        typingDiv.id = 'typing-indicator';
        
        const bubble = document.createElement('div');
        bubble.className = 'max-w-xs lg:max-w-md px-4 lg:px-5 py-2 lg:py-3 rounded-2xl font-medium text-sm lg:text-base bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 rounded-bl-md border border-gray-300';
        
        bubble.innerHTML = `
            <div class="flex items-center space-x-1">
                <div class="flex space-x-1">
                    <div class="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                    <div class="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style="animation-delay: 0.1s"></div>
                    <div class="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
                </div>
                <span class="ml-2 text-xs">टाइप कर रहा है...</span>
            </div>
        `;
        
        typingDiv.appendChild(bubble);
        elements.conversationHistory.appendChild(typingDiv);
        elements.conversationHistory.scrollTop = elements.conversationHistory.scrollHeight;
    }
    
    removeTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    addSystemMessage(message) {
        const elements = this.app.elementManager.getAll();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'conversation-bubble flex justify-center mb-4';
        
        const bubble = document.createElement('div');
        bubble.className = 'px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600 border border-gray-200';
        bubble.textContent = message;
        
        messageDiv.appendChild(bubble);
        elements.conversationHistory.appendChild(messageDiv);
        elements.conversationHistory.scrollTop = elements.conversationHistory.scrollHeight;
    }
    
    // Message formatting utilities
    formatUserMessage(message) {
        // Add any user message formatting logic here
        return message.trim();
    }
    
    formatBotMessage(message) {
        // Add any bot message formatting logic here
        return message.trim();
    }
    
    // Export conversation for debugging or saving
    exportConversation() {
        const elements = this.app.elementManager.getAll();
        const messages = [];
        
        const bubbles = elements.conversationHistory.querySelectorAll('.conversation-bubble');
        bubbles.forEach(bubble => {
            const isUser = bubble.classList.contains('justify-end');
            const messageText = bubble.querySelector('div').textContent;
            messages.push({
                type: isUser ? 'user' : 'bot',
                message: messageText,
                timestamp: new Date().toISOString()
            });
        });
        
        return messages;
    }
}