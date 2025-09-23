class VoiceBotApp {
    constructor() {
        this.currentStep = 'welcome'; // welcome, name_phone, language_detection, info_display, conversation
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.isAudioPlaying = false;
        this.autoRecordAfterAudio = false;
        this.userInfo = {
            user_id: null,
            session_id: null,
            name: null,
            phone: null,
            language: null
        };
        
        this.initializeElements();
        this.bindEvents();
        this.setupInitialState();
        this.checkMicrophonePermission();
        
        // Log keyboard shortcuts for developers
        console.log('🎤 Voice Bot Keyboard Shortcuts:');
        console.log('• Enter: Start/Continue Recording');
        console.log('• Backspace: Exit (only in conversation mode)');
        console.log('• All buttons are also clickable with mouse');
    }
    
    initializeElements() {
        // Main elements
        this.mainBtn = document.getElementById('main-action-btn');
        this.desktopMainBtn = document.getElementById('desktop-main-action-btn');
        this.bottomBtn = document.getElementById('bottom-action-btn');
        this.desktopBottomBtn = document.getElementById('desktop-bottom-action-btn');
        this.mobileConversationBtn = document.getElementById('mobile-conversation-btn');
        this.exitBtn = document.getElementById('exit-btn');
        this.desktopExitBtn = document.getElementById('desktop-exit-btn');
        this.centerButtonContainer = document.getElementById('center-button-container');
        this.bottomButtonContainer = document.getElementById('bottom-button-container');
        this.exitContainer = document.getElementById('exit-container');
        this.mainContent = document.getElementById('main-content');
        this.statusIndicator = document.getElementById('status-indicator');
        this.statusText = document.getElementById('status-text');
        this.actionInstruction = document.getElementById('action-instruction');
        this.voiceAnimation = document.getElementById('voice-animation');
        this.loadingSpinner = document.getElementById('loading-spinner');
        this.errorMessage = document.getElementById('error-message');
        this.errorText = document.getElementById('error-text');
        
        // Keyboard shortcuts info
        this.keyboardShortcutsMobile = document.getElementById('keyboard-shortcuts-mobile');
        this.keyboardShortcutsDesktop = document.getElementById('keyboard-shortcuts-desktop');
        
        // User info elements
        this.userInfoDiv = document.getElementById('user-info');
        this.userName = document.getElementById('user-name');
        this.userPhone = document.getElementById('user-phone');
        this.userLanguage = document.getElementById('user-language');
        
        // Conversation elements
        this.conversationContainer = document.getElementById('conversation-container');
        this.conversationHistory = document.getElementById('conversation-history');
        
        // Audio elements
        this.audioPlayer = document.getElementById('audio-player');
        this.staticAudio = document.getElementById('static-audio');
    }
    
    bindEvents() {
        this.mainBtn.addEventListener('click', () => this.handleMainAction());
        this.desktopMainBtn?.addEventListener('click', () => this.handleMainAction());
        this.bottomBtn.addEventListener('click', () => this.handleConversationRecording());
        this.desktopBottomBtn?.addEventListener('click', () => this.handleConversationRecording());
        this.mobileConversationBtn?.addEventListener('click', () => this.handleConversationRecording());
        this.exitBtn.addEventListener('click', () => this.exitSession());
        this.desktopExitBtn?.addEventListener('click', () => this.exitSession());
        
        // Keyboard event listeners
        document.addEventListener('keydown', (e) => this.handleKeyboardInput(e));
        
        // Audio event listeners
        this.audioPlayer.addEventListener('ended', () => this.onAudioEnded());
        this.staticAudio.addEventListener('ended', () => this.onStaticAudioEnded());
    }
    
    handleKeyboardInput(event) {
        // Prevent keyboard actions when recording is in progress or audio is being processed
        if (this.isRecording) {
            return;
        }
        
        // Prevent default browser behavior for these keys
        if (event.key === 'Enter' || event.key === 'Backspace') {
            // Don't prevent backspace in input fields (though we don't have any currently)
            if (event.key === 'Backspace' && event.target.tagName === 'INPUT') {
                return;
            }
        }
        
        // Handle Enter key for main action buttons
        if (event.key === 'Enter' || event.keyCode === 13) {
            event.preventDefault();
            
            // Determine which button action to trigger based on current step
            if (this.currentStep === 'conversation') {
                // In conversation mode, use desktop main button on desktop, mobile conversation button on mobile
                if (window.innerWidth >= 1024 && this.desktopMainBtn && !this.desktopMainBtn.classList.contains('hidden')) {
                    console.log('Enter pressed - triggering desktop conversation recording');
                    this.handleMainAction(); // Desktop main button uses handleMainAction
                } else if (this.mobileConversationBtn && !this.conversationContainer.classList.contains('hidden')) {
                    console.log('Enter pressed - triggering mobile conversation recording');
                    this.handleConversationRecording();
                }
            } else {
                // In other modes, use main button
                if (!this.centerButtonContainer.classList.contains('hidden')) {
                    console.log('Enter pressed - triggering main action');
                    this.handleMainAction();
                }
            }
        }
        
        // Handle Backspace key for exit button (only in conversation mode)
        else if ((event.key === 'Backspace' || event.keyCode === 8) && this.currentStep === 'conversation') {
            // Only trigger exit if we're in conversation mode and exit button is visible
            if (!this.exitContainer.classList.contains('hidden')) {
                event.preventDefault(); // Prevent browser back navigation
                console.log('Backspace pressed - exiting conversation and refreshing page');
                this.exitSession();
                // Refresh page after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
        }
    }
    
    setupInitialState() {
        this.updateStatus('ready', 'तैयार है शुरू करने के लिए');
        this.mainBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        this.actionInstruction.textContent = 'आवाज़ सहायक शुरू करने के लिए क्लिक करें (Enter दबाएं)';
        this.setupButtonAccessibility();
    }
    
    setupButtonAccessibility() {
        // Make buttons keyboard accessible
        this.mainBtn.setAttribute('tabindex', '0');
        this.bottomBtn.setAttribute('tabindex', '0');
        this.desktopBottomBtn?.setAttribute('tabindex', '0');
        this.mobileConversationBtn?.setAttribute('tabindex', '0');
        this.exitBtn.setAttribute('tabindex', '0');
        this.desktopExitBtn?.setAttribute('tabindex', '0');
        
        // Add ARIA labels for better accessibility
        this.mainBtn.setAttribute('aria-label', 'मुख्य रिकॉर्डिंग बटन - Enter दबाएं');
        this.desktopMainBtn?.setAttribute('aria-label', 'मुख्य रिकॉर्डिंग बटन - Enter दबाएं');
        this.bottomBtn.setAttribute('aria-label', 'बातचीत रिकॉर्डिंग बटन - Enter दबाएं');
        this.desktopBottomBtn?.setAttribute('aria-label', 'बातचीत रिकॉर्डिंग बटन - Enter दबाएं');
        this.mobileConversationBtn?.setAttribute('aria-label', 'बातचीत रिकॉर्डिंग बटन - Enter दबाएं');
        this.exitBtn.setAttribute('aria-label', 'बाहर निकलें - Backspace दबाएं');
        this.desktopExitBtn?.setAttribute('aria-label', 'बाहर निकलें - Backspace दबाएं');
        
        // Add keyboard event listeners directly to buttons as backup
        this.mainBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                this.handleMainAction();
            }
        });
        
        this.desktopMainBtn?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                this.handleMainAction();
            }
        });
        
        this.bottomBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                this.handleConversationRecording();
            }
        });
        
        this.desktopBottomBtn?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                this.handleConversationRecording();
            }
        });
        
        this.mobileConversationBtn?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                this.handleConversationRecording();
            }
        });
        
        this.exitBtn.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.keyCode === 13) || (e.key === 'Backspace' || e.keyCode === 8)) {
                e.preventDefault();
                this.exitSession();
            }
        });
        
        this.desktopExitBtn?.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.keyCode === 13) || (e.key === 'Backspace' || e.keyCode === 8)) {
                e.preventDefault();
                this.exitSession();
            }
        });
    }
    
    async checkMicrophonePermission() {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            this.updateStatus('ready', 'Ready to start');
        } catch (error) {
            this.showError('Microphone permission is required for voice interaction');
            this.updateStatus('error', 'Microphone access denied');
        }
    }
    
    handleMainAction() {
        switch (this.currentStep) {
            case 'welcome':
                this.startNamePhoneCollection();
                break;
            case 'name_phone':
                this.stopAllAudio();
                this.startRecording();
                break;
            case 'conversation':
                // For conversation, desktop main button should work
                this.stopAllAudio();
                this.startRecording();
                break;
        }
    }
    
    exitSession() {
        // Reset to initial state
        this.currentStep = 'welcome';
        this.userInfo = {
            user_id: null,
            session_id: null,
            name: null,
            phone: null,
            language: null
        };
        
        // Hide all sections
        this.userInfoDiv.classList.add('hidden');
        this.conversationContainer.classList.add('hidden');
        this.keyboardShortcutsMobile?.classList.add('hidden');
        this.keyboardShortcutsDesktop?.classList.add('hidden');
        this.resetToInitialLayout();
        
        // Reset UI
        this.setupInitialState();
        
        // Clear conversation
        this.conversationHistory.innerHTML = '';
        
        // Refresh page after exit
        setTimeout(() => {
            window.location.reload();
        }, 300);
    }
    
    async startNamePhoneCollection() {
        this.currentStep = 'name_phone';
        this.updateStatus('processing', 'ऑडियो चला रहा है...');
        this.actionInstruction.textContent = 'कृपया अपना नाम और फोन नंबर बताएं (Enter दबाकर रिकॉर्ड करें)';
        this.mainBtn.classList.add('recording');
        
        // Set flag to auto-record after audio ends
        this.autoRecordAfterAudio = true;
        
        // Play static audio prompt in Hindi
        await this.playStaticAudio('name_phone', 'hi');
    }
    
    async startLanguageCollection() {
        this.currentStep = 'language_detection';
        this.updateStatus('processing', 'भाषा चयन ऑडियो...');
        this.actionInstruction.textContent = 'अपनी पसंदीदा भाषा बताएं';
        
        // Set flag to auto-record after audio ends
        this.autoRecordAfterAudio = true;
        
        // Play static audio prompt in Hindi
        await this.playStaticAudio('language_selection', 'hi');
    }
    
    async startConversation() {
        this.currentStep = 'conversation';
        
        // Hide mobile buttons and show conversation container
        this.centerButtonContainer.classList.add('hidden');
        this.bottomButtonContainer.classList.add('hidden');
        this.conversationContainer.classList.remove('hidden');
        this.showExitButton();
        
        // Show desktop main button for conversation on desktop
        if (window.innerWidth >= 1024 && this.desktopMainBtn) {
            this.desktopMainBtn.classList.remove('hidden');
        }
        
        // Show keyboard shortcuts for mobile and desktop
        this.keyboardShortcutsDesktop?.classList.remove('hidden');
        
        this.mainContent.innerHTML = `
            <div class="text-center">
                <p class="text-base lg:text-lg text-gray-700 font-medium mb-4">आपकी जानकारी सहेज ली गई है</p>
                <div class="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 lg:hidden">
                    <p class="font-semibold mb-2 flex items-center"><i class="fas fa-check-circle mr-2"></i>तैयार!</p>
                    <p class="text-xs">अब आप बात कर सकते हैं।</p>
                </div>
            </div>
        `;
        
        this.updateStatus('ready', 'बातचीत शुरू! रिकॉर्ड बटन दबाकर बोलें');
        
        // Play conversation start audio in user's language
        await this.playStaticAudio('conversation_start', this.userInfo.language || 'hi');
    }
    
    handleConversationRecording() {
        if (this.currentStep === 'conversation') {
            // Stop any playing audio before starting recording
            this.stopAllAudio();
            this.startRecording();
        }
    }
    
    stopAllAudio() {
        let audioWasStopped = false;
        
        // Stop audio player if playing
        if (this.audioPlayer && !this.audioPlayer.paused) {
            this.audioPlayer.pause();
            this.audioPlayer.currentTime = 0;
            audioWasStopped = true;
            console.log('Stopped audio player for recording');
        }
        
        // Stop static audio if playing
        if (this.staticAudio && !this.staticAudio.paused) {
            this.staticAudio.pause();
            this.staticAudio.currentTime = 0;
            audioWasStopped = true;
            console.log('Stopped static audio for recording');
        }
        
        // Reset audio playing flag
        this.isAudioPlaying = false;
        
        // Cancel auto-record flag if set
        this.autoRecordAfterAudio = false;
        
        // Update status immediately when audio is stopped for recording
        if (audioWasStopped) {
            this.updateStatus('listening', 'सुन रहा हूँ...');
            console.log('Audio interrupted by user - starting recording');
        }
    }
    
    showExitButton() {
        this.exitContainer.classList.remove('hidden');
    }
    
    hideExitButton() {
        this.exitContainer.classList.add('hidden');
    }
    
    resetToInitialLayout() {
        // Reset step and show appropriate buttons
        this.currentStep = 'welcome';
        this.centerButtonContainer.classList.remove('hidden');
        this.bottomButtonContainer.classList.add('hidden');
        this.hideExitButton();
        
        // Hide desktop main button on reset
        if (this.desktopMainBtn) {
            this.desktopMainBtn.classList.add('hidden');
        }
        
        // Remove any dynamically created buttons
        const desktopSidebarButton = document.getElementById('desktop-sidebar-button');
        if (desktopSidebarButton) {
            desktopSidebarButton.remove();
        }
        
        // Reset main content
        this.mainContent.innerHTML = `
            <p id="action-instruction" class="text-base lg:text-lg text-gray-700 font-medium mb-6 lg:mb-8">
                आवाज़ सहायक शुरू करने के लिए क्लिक करें (Enter दबाएं)
            </p>
        `;
        this.actionInstruction = document.getElementById('action-instruction');
    }
    
    async startRecording() {
        try {
            // Stop any playing audio immediately when recording starts
            this.stopAllAudio();
            
            this.updateStatus('listening', 'सुन रहा हूँ...');
            this.showVoiceAnimation(true);
            this.isRecording = true;
            this.audioChunks = [];
            
            // Update button state based on current step
            if (this.currentStep === 'conversation') {
                // For conversation, use desktop main button on desktop, mobile conversation button on mobile
                if (window.innerWidth >= 1024 && this.desktopMainBtn) {
                    this.desktopMainBtn.classList.add('recording');
                    this.desktopMainBtn.innerHTML = '<i class="fas fa-stop-circle text-red-500"></i>';
                } else {
                    if (this.mobileConversationBtn) {
                        this.mobileConversationBtn.classList.add('recording');
                        this.mobileConversationBtn.innerHTML = '<i class="fas fa-stop-circle text-red-500"></i>';
                    }
                }
            } else {
                // For other steps, use main button
                this.mainBtn.classList.add('recording');
                this.mainBtn.innerHTML = '<i class="fas fa-stop-circle text-red-500"></i>';
                if (this.desktopMainBtn) {
                    this.desktopMainBtn.classList.add('recording');
                    this.desktopMainBtn.innerHTML = '<i class="fas fa-stop-circle text-red-500"></i>';
                }
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.processRecording();
            };
            
            this.mediaRecorder.start();
            
            // Auto-stop after 12 seconds
            setTimeout(() => {
                if (this.isRecording) {
                    this.stopRecording();
                }
            }, 12000);
            
        } catch (error) {
            this.showError('रिकॉर्डिंग शुरू करने में विफल: ' + error.message);
            this.updateStatus('error', 'रिकॉर्डिंग विफल');
            this.resetButtonState();
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            this.showVoiceAnimation(false);
            this.updateStatus('processing', 'प्रसंस्करण...');
            this.resetButtonState();
        }
    }
    
    resetButtonState() {
        // Remove recording class from all buttons
        this.mainBtn.classList.remove('recording');
        this.desktopMainBtn?.classList.remove('recording');
        this.bottomBtn.classList.remove('recording');
        this.desktopBottomBtn?.classList.remove('recording');
        this.mobileConversationBtn?.classList.remove('recording');
        
        if (this.currentStep === 'conversation') {
            // For conversation, reset appropriate button based on screen size
            if (window.innerWidth >= 1024 && this.desktopMainBtn) {
                this.desktopMainBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            } else {
                this.bottomBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                if (this.mobileConversationBtn) {
                    this.mobileConversationBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                }
            }
        } else {
            // For other steps, reset main buttons
            this.mainBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            if (this.desktopMainBtn) {
                this.desktopMainBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            }
        }
    }
    
    async processRecording() {
        try {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');
            
        // Add current language to form data
        const currentLanguage = this.userInfo.language || 'hindi';
        formData.append('language', currentLanguage);
        
        // Send audio for processing
        const response = await fetch('/api/voice/process_audio', {
            method: 'POST',
            body: formData
        });            const data = await response.json();
            
            if (data.text) {
                await this.handleTranscribedText(data.text);
            } else {
                this.showError('Could not understand the audio. Please try again.');
                this.updateStatus('error', 'Processing failed');
            }
            
        } catch (error) {
            this.showError('Error processing audio: ' + error.message);
            this.updateStatus('error', 'Processing error');
        }
    }
    
    async handleTranscribedText(text) {
        console.log('Transcribed text:', text);
        
        switch (this.currentStep) {
            case 'name_phone':
                await this.extractUserInfo(text);
                break;
            case 'language_detection':
                await this.detectLanguage(text);
                break;
            case 'conversation':
                await this.processConversation(text);
                break;
        }
    }
    
    async extractUserInfo(text) {
        try {
            const response = await fetch('/api/voice/extract_info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: text })
            });
            
            const data = await response.json();
            
            if (data.name && data.phone) {
                this.userInfo.name = data.name;
                this.userInfo.phone = data.phone;
                
                // Update UI
                this.userName.textContent = data.name;
                this.userPhone.textContent = data.phone;
                
                this.updateStatus('ready', 'जानकारी मिल गई!');
                
                // Auto-proceed to language collection
                setTimeout(() => {
                    this.startLanguageCollection();
                }, 1500);
            } else {
                this.showError('नाम और फोन नंबर नहीं मिल सके। कृपया स्पष्ट बोलें और पुन: प्रयास करें।');
                this.updateStatus('error', 'जानकारी विफल');
                this.resetButtonState();
            }
            
        } catch (error) {
            this.showError('जानकारी निकालने में त्रुटि: ' + error.message);
            this.updateStatus('error', 'निकालने में त्रुटि');
            this.resetButtonState();
        }
    }
    
    async detectLanguage(text) {
        try {
            const response = await fetch('/api/voice/detect_language', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: text })
            });
            
            const data = await response.json();
            
            if (data.language) {
                this.userInfo.language = data.language;
                this.userLanguage.textContent = data.language;
                
                // Register user
                await this.registerUser();
                
                // Show user info with animation
                this.showUserInfoDisplay();
                
            } else {
                this.showError('भाषा पहचानना नहीं हो सकी। कृपया पुन: प्रयास करें।');
                this.updateStatus('error', 'भाषा पहचान विफल');
            }
            
        } catch (error) {
            this.showError('भाषा पहचानने में त्रुटि: ' + error.message);
            this.updateStatus('error', 'पहचान त्रुटि');
        }
    }
    
    showUserInfoDisplay() {
        // Show user info
        this.userInfoDiv.classList.remove('hidden');
        
        // Add slide transition
        this.userInfoDiv.classList.add('slide-in-right');
        setTimeout(() => {
            this.userInfoDiv.classList.remove('slide-in-right');
        }, 100);
        
        // Auto-start conversation after showing user info
        setTimeout(() => {
            this.startConversation();
        }, 2000); // 2 second delay to show the info
    }
    
    async registerUser() {
        try {
            const response = await fetch('/api/user/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: this.userInfo.name,
                    phone: this.userInfo.phone,
                    language: this.userInfo.language
                })
            });
            
            const data = await response.json();
            
            if (data.user_id) {
                this.userInfo.user_id = data.user_id;
                this.userInfo.session_id = data.session_id;
                console.log('User registered:', data);
            }
            
        } catch (error) {
            console.error('Error registering user:', error);
        }
    }
    
    async processConversation(text) {
        try {
            // Add user message to conversation
            this.addMessageToConversation(text, 'user');
            
            const response = await fetch('/api/voice/generate_response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    language: this.userInfo.language,
                    user_id: this.userInfo.user_id,
                    session_id: this.userInfo.session_id
                })
            });
            
            const data = await response.json();
            
            if (data.response) {
                // Add bot response to conversation
                this.addMessageToConversation(data.response, 'bot');
                
                // Convert to speech and play (status will be managed by playResponse method)
                await this.playResponse(data.response, data.language);
            } else {
                this.showError('Could not generate response. Please try again.');
                this.updateStatus('ready', 'अगले संदेश के लिए तैयार - Enter दबाएं');
            }
            
        } catch (error) {
            this.showError('Error in conversation: ' + error.message);
            this.updateStatus('error', 'Conversation error');
        }
    }
    
    async playResponse(text, language) {
        try {
            // Show processing status while waiting for TTS response
            this.updateStatus('processing', 'आवाज़ तैयार कर रहा है...');
            
            const response = await fetch('/api/voice/text_to_speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    language: language
                })
            });
            
            if (response.ok) {
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                this.audioPlayer.src = audioUrl;
                
                // Add event listeners for proper status management
                this.audioPlayer.onloadstart = () => {
                    this.updateStatus('speaking', 'बोल रहा है... (Enter दबाकर रोकें)');
                };
                
                this.audioPlayer.onplay = () => {
                    this.isAudioPlaying = true;
                    this.updateStatus('speaking', 'बोल रहा है... (Enter दबाकर रोकें)');
                };
                
                this.audioPlayer.onended = () => {
                    this.isAudioPlaying = false;
                    if (this.currentStep === 'conversation') {
                        this.updateStatus('ready', 'अगले संदेश के लिए तैयार - Enter दबाएं');
                    } else {
                        this.updateStatus('ready', 'तैयार - Enter दबाएं');
                    }
                };
                
                this.audioPlayer.onpause = () => {
                    this.isAudioPlaying = false;
                    if (this.currentStep === 'conversation') {
                        this.updateStatus('ready', 'अगले संदेश के लिए तैयार - Enter दबाएं');
                    } else {
                        this.updateStatus('ready', 'तैयार - Enter दबाएं');
                    }
                };
                
                this.audioPlayer.onerror = () => {
                    this.isAudioPlaying = false;
                    this.updateStatus('error', 'आवाज़ चलाने में त्रुटि');
                };
                
                await this.audioPlayer.play();
            } else {
                this.updateStatus('error', 'आवाज़ तैयार करने में त्रुटि');
            }
            
        } catch (error) {
            console.error('Error playing response:', error);
            this.isAudioPlaying = false;
            this.updateStatus('error', 'आवाज़ चलाने में त्रुटि');
        }
    }
    
    async playStaticAudio(promptType, language) {
        try {
            // Don't change status for static audio during initial setup
            // Status is already managed by the calling method
            
            const response = await fetch(`/api/voice/static_audio/${promptType}/${language}`);
            
            if (response.ok) {
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                this.staticAudio.src = audioUrl;
                
                // Add event listeners for static audio state tracking
                this.staticAudio.onplay = () => {
                    this.isAudioPlaying = true;
                    // Only update status if we're in conversation mode
                    if (this.currentStep === 'conversation') {
                        this.updateStatus('speaking', 'बोल रहा है...');
                    }
                };
                
                this.staticAudio.onended = () => {
                    this.isAudioPlaying = false;
                    // Status will be managed by onStaticAudioEnded method
                };
                
                this.staticAudio.onpause = () => {
                    this.isAudioPlaying = false;
                    if (this.currentStep === 'conversation') {
                        this.updateStatus('ready', 'अगले संदेश के लिए तैयार - Enter दबाएं');
                    }
                };
                
                this.staticAudio.onerror = () => {
                    this.isAudioPlaying = false;
                    this.updateStatus('error', 'आवाज़ चलाने में त्रुटि');
                };
                
                await this.staticAudio.play();
            }
            
        } catch (error) {
            console.error('Error playing static audio:', error);
            this.isAudioPlaying = false;
            this.updateStatus('error', 'आवाज़ चलाने में त्रुटि');
        }
    }
    

    
    addMessageToConversation(message, type) {
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
        
        this.conversationHistory.appendChild(messageDiv);
        this.conversationHistory.scrollTop = this.conversationHistory.scrollHeight;
    }
    
    showVoiceAnimation(show) {
        if (show) {
            this.voiceAnimation.classList.remove('hidden');
        } else {
            this.voiceAnimation.classList.add('hidden');
        }
    }
    
    updateStatus(status, text) {
        this.statusIndicator.className = `status-indicator status-${status}`;
        this.statusText.textContent = text;
    }
    
    showError(message) {
        this.errorText.textContent = message;
        this.errorMessage.classList.remove('hidden');
        
        setTimeout(() => {
            this.errorMessage.classList.add('hidden');
        }, 5000);
    }
    
    onAudioEnded() {
        // This method is now handled by the audio event listeners in playResponse
        // Keep it for compatibility but don't duplicate status updates
        this.isAudioPlaying = false;
        console.log('Audio ended - status managed by audio event listeners');
    }
    
    onStaticAudioEnded() {
        // Static audio finished playing
        this.isAudioPlaying = false;
        console.log('Static audio ended');
        
        // Auto-start recording if flag is set
        if (this.autoRecordAfterAudio) {
            this.autoRecordAfterAudio = false;
            setTimeout(() => {
                this.startRecording();
            }, 1000); // 1 second delay before auto-recording
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VoiceBotApp();
});