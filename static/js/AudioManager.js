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
        
        // Voice Activity Detection (VAD) properties
        this.audioContext = null;
        this.analyser = null;
        this.silenceTimer = null;
        this.isSpeaking = false;
        this.silenceThreshold = 2000; // 2 seconds of silence before stopping
        this.volumeThreshold = 20; // Raw volume threshold (0-255 scale, not dB)
        this.vadCheckInterval = null;
        this.maxRecordingTime = 120000; // 120 seconds max recording time
        this.speechDetectionCount = 0; // Counter to confirm speech detection
        
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
            
            this.app.uiController.updateStatus('listening', 'बोलना शुरू करें... (बोलना बंद करने पर स्वतः रुकेगा)');
            this.app.uiController.showVoiceAnimation(true);
            this.isRecording = true;
            this.audioChunks = [];
            this.isSpeaking = false;
            
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
                this.cleanupVAD();
                this.processRecording();
            };
            
            this.mediaRecorder.start();
            
            // Setup Voice Activity Detection
            this.setupVoiceActivityDetection(stream);
            
            // Safety timeout - stop after max recording time (60 seconds)
            setTimeout(() => {
                if (this.isRecording) {
                    console.log('Max recording time reached, stopping...');
                    this.stopRecording();
                }
            }, this.maxRecordingTime);
            
        } catch (error) {
            this.app.uiController.showError('रिकॉर्डिंग शुरू करने में विफल: ' + error.message);
            this.app.uiController.updateStatus('error', 'रिकॉर्डिंग विफल');
            this.resetButtonState();
        }
    }
    
    stopRecording() {
        if (this.isRecording) {
            this.isRecording = false;
            this.app.uiController.showVoiceAnimation(false);
            this.app.uiController.updateStatus('processing', 'प्रक्रिया जारी...');
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
    
    async processAzureSpeechRecognition() {
        try {
            // Use Azure Speech Manager for real-time recognition
            const recognizedText = await this.app.azureSpeechManager.startRealTimeSpeechRecognition();
            
            // Reset recording state
            this.isRecording = false;
            this.resetButtonState();
            
            if (recognizedText) {
                await this.app.handleTranscribedText(recognizedText);
            } else {
                // Try fallback to traditional recording if Azure fails
                if (!this.app.azureSpeechManager.isAzureAvailable) {
                    console.log('Azure not available, falling back to traditional recording...');
                    await this.startTraditionalRecording();
                } else {
                    this.app.uiController.showError('Could not understand the audio. Please try again.');
                    this.app.uiController.updateStatus('error', 'Processing failed');
                }
            }
            
        } catch (error) {
            this.isRecording = false;
            this.resetButtonState();
            
            // Try fallback to traditional recording
            console.log('Azure speech recognition failed, trying traditional recording...');
            await this.startTraditionalRecording();
        }
    }
    
    async startTraditionalRecording() {
        try {
            // Fallback to traditional audio recording when Azure is not available
            this.app.uiController.updateStatus('listening', 'सुन रहा हूँ... (पारंपरिक रिकॉर्डिंग)');
            this.app.uiController.showVoiceAnimation(true);
            this.isRecording = true;
            this.audioChunks = [];
            
            // Update button state
            this.updateRecordingButtonState(true);
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.processTraditionalRecording();
            };
            
            this.mediaRecorder.start();
            
            // Auto-stop after 12 seconds
            setTimeout(() => {
                if (this.isRecording && this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                    this.stopTraditionalRecording();
                }
            }, 12000);
            
        } catch (error) {
            this.app.uiController.showError('रिकॉर्डिंग शुरू करने में विफल: ' + error.message);
            this.app.uiController.updateStatus('error', 'रिकॉर्डिंग विफल');
            this.resetButtonState();
        }
    }
    
    stopTraditionalRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            this.app.uiController.showVoiceAnimation(false);
            this.app.uiController.updateStatus('processing', 'प्रक्रिया जारी...');
            this.resetButtonState();
        }
    }
    
    async processTraditionalRecording() {
        try {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');
            
            // Add current language to form data
            const currentLanguage = this.app.stateManager.userInfo.language || 'hindi';
            formData.append('language', currentLanguage);
            
            // Send audio for processing using traditional method
            const response = await fetch('/api/voice/process_audio', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            // Check if STT succeeded
            if (data.text && data.stt_success !== false) {
                // STT successful - proceed with text processing
                await this.app.handleTranscribedText(data.text);
            } else if (data.fallback || data.stt_success === false) {
                // STT failed - trigger step-specific fallback
                await this.handleSTTFailure();
            } else {
                // Generic error
                this.app.uiController.showError('Could not understand the audio. Please try again.');
                this.app.uiController.updateStatus('error', 'Processing failed');
                this.resetButtonState();
            }
            
        } catch (error) {
            console.error('Error processing audio:', error);
            // On network/exception error, also trigger fallback
            await this.handleSTTFailure();
        }
    }
    
    async handleSTTFailure() {
        const currentStep = this.app.stateManager.getCurrentStep();
        
        console.log(`STT failed at step: ${currentStep}`);
        
        switch (currentStep) {
            case 'name_phone':
                // STT failed during name/phone collection - show manual entry popup
                console.log('Triggering phone input fallback due to STT failure');
                this.app.uiController.updateStatus('processing', 'ऑडियो समझ नहीं आया...');
                await this.app.apiService.handleExtractionFallback('');
                break;
                
            case 'language_detection':
                // STT failed during language detection - trigger retry
                console.log('Triggering language detection retry due to STT failure');
                const attempt = this.app.apiService.languageDetectionAttempt || 1;
                
                if (attempt < 3) {
                    // Retry with audio prompt
                    await this.app.apiService.handleLanguageDetectionRetry(attempt);
                } else {
                    // Max retries reached - default to Hindi
                    this.app.uiController.showError('भाषा पहचानना नहीं हो सकी। डिफ़ॉल्ट हिंदी का उपयोग किया जा रहा है।');
                    this.app.stateManager.updateUserInfo('language', 'hindi');
                    this.app.elementManager.setElementContent('userLanguage', 'hindi');
                    await this.app.apiService.registerUser();
                    this.app.uiController.showUserInfoDisplay();
                }
                break;
                
            case 'conversation':
                // STT failed during conversation - just show retry message
                this.app.uiController.showError('ऑडियो समझ नहीं आया। कृपया पुन: प्रयास करें।');
                this.app.uiController.updateStatus('ready', 'अगले संदेश के लिए तैयार - Enter दबाएं');
                break;
                
            default:
                this.app.uiController.showError('Could not understand the audio. Please try again.');
                this.app.uiController.updateStatus('error', 'Processing failed');
                this.resetButtonState();
        }
    }
    
    async playResponse(text, language) {
        try {
            // Try Azure TTS first, fallback to traditional TTS if needed
            if (this.app.azureSpeechManager.isAzureAvailable) {
                const audioBlob = await this.app.azureSpeechManager.synthesizeSpeech(text, language, true);
                
                if (audioBlob) {
                    await this.app.azureSpeechManager.playAudioBlob(audioBlob);
                    return;
                }
            }
            
            // Fallback to traditional TTS
            console.log('Azure TTS not available, falling back to traditional TTS...');
            await this.playTraditionalTTS(text, language);
            
        } catch (error) {
            console.error('Error playing response:', error);
            // Try traditional TTS as final fallback
            await this.playTraditionalTTS(text, language);
        }
    }
    
    async playTraditionalTTS(text, language) {
        try {
            const elements = this.app.elementManager.getAll();
            
            // Show processing status while waiting for TTS response
            this.app.uiController.updateStatus('processing', 'आवाज़ तैयार कर रहा है... (पारंपरिक TTS)');
            
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
                    URL.revokeObjectURL(audioUrl);
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
                    URL.revokeObjectURL(audioUrl);
                };
                
                await elements.audioPlayer.play();
            } else {
                this.app.uiController.updateStatus('error', 'आवाज़ तैयार करने में त्रुटि');
            }
            
        } catch (error) {
            console.error('Error playing traditional TTS:', error);
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
    
    async playAudioFromUrl(url) {
        return new Promise((resolve, reject) => {
            try {
                const elements = this.app.elementManager.getAll();
                const audio = elements.staticAudio || new Audio();
                
                audio.src = url;
                
                audio.onplay = () => {
                    this.isAudioPlaying = true;
                };
                
                audio.onended = () => {
                    this.isAudioPlaying = false;
                    resolve();
                };
                
                audio.onerror = (error) => {
                    this.isAudioPlaying = false;
                    console.error('Error playing audio:', error);
                    reject(error);
                };
                
                audio.play().catch(reject);
                
            } catch (error) {
                console.error('Error in playAudioFromUrl:', error);
                this.isAudioPlaying = false;
                reject(error);
            }
        });
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
    
    /**
     * Setup Voice Activity Detection (VAD) using Web Audio API
     * Monitors audio stream and detects when user stops speaking
     */
    setupVoiceActivityDetection(stream) {
        try {
            // Create audio context and analyser
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;
            
            // Connect stream to analyser
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);
            
            // Start monitoring audio levels
            this.startVADMonitoring();
            
            console.log('Voice Activity Detection initialized');
        } catch (error) {
            console.error('Failed to setup VAD:', error);
            // VAD failed, but recording will continue with max timeout
        }
    }
    
    /**
     * Monitor audio levels and detect silence
     */
    startVADMonitoring() {
        this.vadCheckInterval = setInterval(() => {
            if (!this.isRecording) {
                this.cleanupVAD();
                return;
            }
            
            const volume = this.getAudioVolume();
            
            // Check if user is speaking (volume above threshold)
            if (volume > this.volumeThreshold) {
                // User is speaking - increment detection counter
                this.speechDetectionCount++;
                
                if (!this.isSpeaking && this.speechDetectionCount > 3) {
                    // Confirmed speech after 3 consecutive detections
                    this.isSpeaking = true;
                    this.app.uiController.updateStatus('listening', 'सुन रहा हूँ... (बोलते रहें)');
                    console.log('Speech confirmed, volume:', volume);
                }
                
                // Clear silence timer since user is speaking
                if (this.silenceTimer) {
                    clearTimeout(this.silenceTimer);
                    this.silenceTimer = null;
                }
            } else {
                // Volume below threshold (silence detected)
                this.speechDetectionCount = 0; // Reset speech counter
                
                if (this.isSpeaking && !this.silenceTimer) {
                    // User was speaking but now silent, start silence timer
                    console.log('Silence detected, starting 2-second timer...');
                    this.app.uiController.updateStatus('listening', 'रुकें... (2 सेकंड चुप्पी के बाद बंद होगा)');
                    
                    this.silenceTimer = setTimeout(() => {
                        if (this.isRecording) {
                            console.log('Silence timeout reached, stopping recording...');
                            this.stopRecording();
                        }
                    }, this.silenceThreshold);
                }
            }
        }, 100); // Check every 100ms
    }
    
    /**
     * Get current audio volume level (raw value 0-255)
     */
    getAudioVolume() {
        if (!this.analyser) return 0;
        
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume across frequency bins
        let sum = 0;
        let count = 0;
        
        // Focus on speech frequencies (85 Hz to 3000 Hz roughly corresponds to bins 20-350 at 2048 FFT)
        const startBin = Math.floor(bufferLength * 0.02); // Low frequency cutoff
        const endBin = Math.floor(bufferLength * 0.35);   // High frequency cutoff
        
        for (let i = startBin; i < endBin && i < bufferLength; i++) {
            sum += dataArray[i];
            count++;
        }
        
        const average = count > 0 ? sum / count : 0;
        
        return average;
    }
    
    /**
     * Cleanup VAD resources
     */
    cleanupVAD() {
        if (this.vadCheckInterval) {
            clearInterval(this.vadCheckInterval);
            this.vadCheckInterval = null;
        }
        
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.analyser = null;
        this.isSpeaking = false;
        this.speechDetectionCount = 0;
    }
}