/**
 * AudioManager.js
 * Handles audio recording, playback, and audio state management
 */

class AudioManager {
    constructor(app) {
        this.app = app;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.isAudioPlaying = false;
        this.autoRecordAfterAudio = false;
        
        this.setupAudioEventListeners();
    }
    
    setupAudioEventListeners() {
        const elements = this.app.elementManager.getAll();
        
        // Audio event listeners
        elements.audioPlayer.addEventListener('ended', () => this.onAudioEnded());
        elements.staticAudio.addEventListener('ended', () => this.onStaticAudioEnded());
    }
    
    async checkMicrophonePermission() {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            this.app.uiController.updateStatus('ready', 'Ready to start');
        } catch (error) {
            this.app.uiController.showError('Microphone permission is required for voice interaction');
            this.app.uiController.updateStatus('error', 'Microphone access denied');
        }
    }
    
    stopAllAudio() {
        const elements = this.app.elementManager.getAll();
        let audioWasStopped = false;
        
        // Stop audio player if playing
        if (elements.audioPlayer && !elements.audioPlayer.paused) {
            elements.audioPlayer.pause();
            elements.audioPlayer.currentTime = 0;
            audioWasStopped = true;
            console.log('Stopped audio player for recording');
        }
        
        // Stop static audio if playing
        if (elements.staticAudio && !elements.staticAudio.paused) {
            elements.staticAudio.pause();
            elements.staticAudio.currentTime = 0;
            audioWasStopped = true;
            console.log('Stopped static audio for recording');
        }
        
        // Reset audio playing flag
        this.isAudioPlaying = false;
        
        // Cancel auto-record flag if set
        this.autoRecordAfterAudio = false;
        
        // Update status immediately when audio is stopped for recording
        if (audioWasStopped) {
            this.app.uiController.updateStatus('listening', 'सुन रहा हूँ...');
            console.log('Audio interrupted by user - starting recording');
        }
    }
    
    async startRecording() {
        try {
            // Stop any playing audio immediately when recording starts
            this.stopAllAudio();
            
            this.app.uiController.updateStatus('listening', 'सुन रहा हूँ...');
            this.app.uiController.showVoiceAnimation(true);
            this.isRecording = true;
            this.audioChunks = [];
            
            // Update button state based on current step
            this.updateRecordingButtonState(true);
            
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
            this.app.uiController.showError('रिकॉर्डिंग शुरू करने में विफल: ' + error.message);
            this.app.uiController.updateStatus('error', 'रिकॉर्डिंग विफल');
            this.resetButtonState();
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            this.app.uiController.showVoiceAnimation(false);
            this.app.uiController.updateStatus('processing', 'प्रसंस्करण...');
            this.resetButtonState();
        }
    }
    
    updateRecordingButtonState(isRecording) {
        const elements = this.app.elementManager.getAll();
        const currentStep = this.app.stateManager.currentStep;
        
        if (currentStep === 'conversation') {
            // For conversation, use desktop main button on desktop, mobile conversation button on mobile
            if (window.innerWidth >= 1024 && elements.desktopMainBtn) {
                if (isRecording) {
                    elements.desktopMainBtn.classList.add('recording');
                    elements.desktopMainBtn.innerHTML = '<i class="fas fa-stop-circle text-red-500"></i>';
                } else {
                    elements.desktopMainBtn.classList.remove('recording');
                    elements.desktopMainBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                }
            } else {
                if (elements.mobileConversationBtn) {
                    if (isRecording) {
                        elements.mobileConversationBtn.classList.add('recording');
                        elements.mobileConversationBtn.innerHTML = '<i class="fas fa-stop-circle text-red-500"></i>';
                    } else {
                        elements.mobileConversationBtn.classList.remove('recording');
                        elements.mobileConversationBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                    }
                }
            }
        } else {
            // For other steps, use main button
            if (isRecording) {
                elements.mainBtn.classList.add('recording');
                elements.mainBtn.innerHTML = '<i class="fas fa-stop-circle text-red-500"></i>';
                if (elements.desktopMainBtn) {
                    elements.desktopMainBtn.classList.add('recording');
                    elements.desktopMainBtn.innerHTML = '<i class="fas fa-stop-circle text-red-500"></i>';
                }
            } else {
                elements.mainBtn.classList.remove('recording');
                elements.mainBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                if (elements.desktopMainBtn) {
                    elements.desktopMainBtn.classList.remove('recording');
                    elements.desktopMainBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                }
            }
        }
    }
    
    resetButtonState() {
        const elements = this.app.elementManager.getAll();
        
        // Remove recording class from all buttons
        elements.mainBtn.classList.remove('recording');
        elements.desktopMainBtn?.classList.remove('recording');
        elements.bottomBtn.classList.remove('recording');
        elements.desktopBottomBtn?.classList.remove('recording');
        elements.mobileConversationBtn?.classList.remove('recording');
        
        this.updateRecordingButtonState(false);
    }
    
    async processRecording() {
        try {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');
            
            // Add current language to form data
            const currentLanguage = this.app.stateManager.userInfo.language || 'hindi';
            formData.append('language', currentLanguage);
            
            // Send audio for processing
            const response = await fetch('/api/voice/process_audio', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.text) {
                await this.app.handleTranscribedText(data.text);
            } else {
                this.app.uiController.showError('Could not understand the audio. Please try again.');
                this.app.uiController.updateStatus('error', 'Processing failed');
            }
            
        } catch (error) {
            this.app.uiController.showError('Error processing audio: ' + error.message);
            this.app.uiController.updateStatus('error', 'Processing error');
        }
    }
    
    async playResponse(text, language) {
        try {
            const elements = this.app.elementManager.getAll();
            
            // Show processing status while waiting for TTS response
            this.app.uiController.updateStatus('processing', 'आवाज़ तैयार कर रहा है...');
            
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
                elements.audioPlayer.src = audioUrl;
                
                // Add event listeners for proper status management
                elements.audioPlayer.onloadstart = () => {
                    this.app.uiController.updateStatus('speaking', 'बोल रहा है... (Enter दबाकर रोकें)');
                };
                
                elements.audioPlayer.onplay = () => {
                    this.isAudioPlaying = true;
                    this.app.uiController.updateStatus('speaking', 'बोल रहा है... (Enter दबाकर रोकें)');
                };
                
                elements.audioPlayer.onended = () => {
                    this.isAudioPlaying = false;
                    if (this.app.stateManager.currentStep === 'conversation') {
                        this.app.uiController.updateStatus('ready', 'अगले संदेश के लिए तैयार - Enter दबाएं');
                    } else {
                        this.app.uiController.updateStatus('ready', 'तैयार - Enter दबाएं');
                    }
                };
                
                elements.audioPlayer.onpause = () => {
                    this.isAudioPlaying = false;
                    if (this.app.stateManager.currentStep === 'conversation') {
                        this.app.uiController.updateStatus('ready', 'अगले संदेश के लिए तैयार - Enter दबाएं');
                    } else {
                        this.app.uiController.updateStatus('ready', 'तैयार - Enter दबाएं');
                    }
                };
                
                elements.audioPlayer.onerror = () => {
                    this.isAudioPlaying = false;
                    this.app.uiController.updateStatus('error', 'आवाज़ चलाने में त्रुटि');
                };
                
                await elements.audioPlayer.play();
            } else {
                this.app.uiController.updateStatus('error', 'आवाज़ तैयार करने में त्रुटि');
            }
            
        } catch (error) {
            console.error('Error playing response:', error);
            this.isAudioPlaying = false;
            this.app.uiController.updateStatus('error', 'आवाज़ चलाने में त्रुटि');
        }
    }
    
    async playStaticAudio(promptType, language) {
        try {
            const elements = this.app.elementManager.getAll();
            
            // Don't change status for static audio during initial setup
            // Status is already managed by the calling method
            
            const response = await fetch(`/api/voice/static_audio/${promptType}/${language}`);
            
            if (response.ok) {
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                elements.staticAudio.src = audioUrl;
                
                // Add event listeners for static audio state tracking
                elements.staticAudio.onplay = () => {
                    this.isAudioPlaying = true;
                    // Only update status if we're in conversation mode
                    if (this.app.stateManager.currentStep === 'conversation') {
                        this.app.uiController.updateStatus('speaking', 'बोल रहा है...');
                    }
                };
                
                elements.staticAudio.onended = () => {
                    this.isAudioPlaying = false;
                    // Status will be managed by onStaticAudioEnded method
                };
                
                elements.staticAudio.onpause = () => {
                    this.isAudioPlaying = false;
                    if (this.app.stateManager.currentStep === 'conversation') {
                        this.app.uiController.updateStatus('ready', 'अगले संदेश के लिए तैयार - Enter दबाएं');
                    }
                };
                
                elements.staticAudio.onerror = () => {
                    this.isAudioPlaying = false;
                    this.app.uiController.updateStatus('error', 'आवाज़ चलाने में त्रुटि');
                };
                
                await elements.staticAudio.play();
            }
            
        } catch (error) {
            console.error('Error playing static audio:', error);
            this.isAudioPlaying = false;
            this.app.uiController.updateStatus('error', 'आवाज़ चलाने में त्रुटि');
        }
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