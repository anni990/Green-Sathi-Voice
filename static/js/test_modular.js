/**
 * test_modular.js
 * Simple test file to verify modular architecture functionality
 */

// Test runner for modular voice bot
class ModularTester {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }
    
    // Add test case
    addTest(name, testFunction) {
        this.tests.push({ name, testFunction });
    }
    
    // Run all tests
    async runAllTests() {
        console.log('🧪 Starting Modular Architecture Tests...\n');
        
        for (const test of this.tests) {
            try {
                await test.testFunction();
                this.logSuccess(test.name);
                this.results.passed++;
            } catch (error) {
                this.logError(test.name, error.message);
                this.results.failed++;
            }
            this.results.total++;
        }
        
        this.printSummary();
    }
    
    logSuccess(testName) {
        console.log(`✅ ${testName} - PASSED`);
    }
    
    logError(testName, error) {
        console.log(`❌ ${testName} - FAILED: ${error}`);
    }
    
    printSummary() {
        console.log('\n📊 Test Results Summary:');
        console.log(`Total Tests: ${this.results.total}`);
        console.log(`Passed: ${this.results.passed}`);
        console.log(`Failed: ${this.results.failed}`);
        console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
        
        if (this.results.failed === 0) {
            console.log('🎉 All tests passed! Modular architecture is working correctly.');
        } else {
            console.log('⚠️ Some tests failed. Check implementation.');
        }
    }
}

// Test cases
function createTestSuite() {
    const tester = new ModularTester();
    
    // Test 1: Check if all modules are defined
    tester.addTest('Module Classes Defined', () => {
        const requiredClasses = [
            'ElementManager',
            'StateManager', 
            'UIController',
            'KeyboardHandler',
            'AudioManager',
            'ApiService',
            'ConversationManager'
        ];
        
        for (const className of requiredClasses) {
            if (typeof window[className] !== 'function') {
                throw new Error(`${className} is not defined`);
            }
        }
    });
    
    // Test 2: VoiceBotApp initialization
    tester.addTest('VoiceBotApp Initialization', () => {
        const app = new VoiceBotApp();
        
        if (!app.elementManager) throw new Error('ElementManager not initialized');
        if (!app.stateManager) throw new Error('StateManager not initialized');
        if (!app.uiController) throw new Error('UIController not initialized');
        if (!app.keyboardHandler) throw new Error('KeyboardHandler not initialized');
        if (!app.audioManager) throw new Error('AudioManager not initialized');
        if (!app.apiService) throw new Error('ApiService not initialized');
        if (!app.conversationManager) throw new Error('ConversationManager not initialized');
    });
    
    // Test 3: ElementManager functionality
    tester.addTest('ElementManager Element Access', () => {
        const elementManager = new ElementManager();
        const mainBtn = elementManager.get('mainBtn');
        
        if (!mainBtn) throw new Error('Could not get mainBtn element');
        if (mainBtn.id !== 'main-action-btn') throw new Error('Wrong element returned');
    });
    
    // Test 4: StateManager state transitions
    tester.addTest('StateManager State Management', () => {
        const stateManager = new StateManager();
        
        if (stateManager.getCurrentStep() !== 'welcome') {
            throw new Error('Initial state should be welcome');
        }
        
        stateManager.setStep('conversation');
        if (stateManager.getCurrentStep() !== 'conversation') {
            throw new Error('State transition failed');
        }
        
        if (!stateManager.isConversationStep()) {
            throw new Error('isConversationStep check failed');
        }
    });
    
    // Test 5: StateManager user info
    tester.addTest('StateManager User Info', () => {
        const stateManager = new StateManager();
        
        stateManager.updateUserInfo('name', 'Test User');
        stateManager.updateUserInfo('phone', '9876543210');
        
        const userInfo = stateManager.getUserInfo();
        if (userInfo.name !== 'Test User') {
            throw new Error('User name not updated correctly');
        }
        if (userInfo.phone !== '9876543210') {
            throw new Error('User phone not updated correctly');
        }
    });
    
    // Test 6: UIController status updates
    tester.addTest('UIController Status Updates', () => {
        const app = new VoiceBotApp();
        
        // Test status update (should not throw error)
        app.uiController.updateStatus('ready', 'Test Ready');
        
        const statusText = document.getElementById('status-text');
        if (statusText.textContent !== 'Test Ready') {
            throw new Error('Status text not updated correctly');
        }
    });
    
    // Test 7: ConversationManager message handling
    tester.addTest('ConversationManager Message Handling', () => {
        const app = new VoiceBotApp();
        
        // Clear any existing messages
        app.conversationManager.clearConversation();
        
        // Add test messages
        app.conversationManager.addMessageToConversation('Test user message', 'user');
        app.conversationManager.addMessageToConversation('Test bot response', 'bot');
        
        const conversationLength = app.conversationManager.getConversationLength();
        if (conversationLength !== 2) {
            throw new Error(`Expected 2 messages, got ${conversationLength}`);
        }
    });
    
    // Test 8: Backward compatibility
    tester.addTest('Backward Compatibility', () => {
        const app = new VoiceBotApp();
        
        // Test direct access methods (backward compatibility)
        if (typeof app.currentStep !== 'string') {
            throw new Error('currentStep getter not working');
        }
        
        if (typeof app.userInfo !== 'object') {
            throw new Error('userInfo getter not working');
        }
        
        // Test method delegation
        app.updateStatus('test', 'Test Status');
        app.showError('Test Error');
    });
    
    // Test 9: KeyboardHandler initialization
    tester.addTest('KeyboardHandler Initialization', () => {
        const app = new VoiceBotApp();
        
        if (!app.keyboardHandler) {
            throw new Error('KeyboardHandler not initialized');
        }
        
        // Check if keyboard shortcuts are logged (should be in console)
        // This is a basic check - the actual functionality would need user interaction to test
    });
    
    // Test 10: Module communication
    tester.addTest('Module Communication', () => {
        const app = new VoiceBotApp();
        
        // Test that modules can access the app instance
        if (app.uiController.app !== app) {
            throw new Error('UIController app reference incorrect');
        }
        
        if (app.audioManager.app !== app) {
            throw new Error('AudioManager app reference incorrect');
        }
        
        if (app.apiService.app !== app) {
            throw new Error('ApiService app reference incorrect');
        }
    });
    
    return tester;
}

// Auto-run tests when this file is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a moment for the app to initialize
    setTimeout(() => {
        const tester = createTestSuite();
        tester.runAllTests();
    }, 1000);
});

// Export for manual testing
if (typeof window !== 'undefined') {
    window.ModularTester = ModularTester;
    window.createTestSuite = createTestSuite;
}