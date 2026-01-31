/**
 * AudioManager.js
 * Handles audio recording, playback, and audio state management
 * ES5 Compatible - No classes, async/await, arrow functions, or template literals
 * THIS IS THE CONVERTED VERSION - REPLACE AudioManager.js with this
 */

function AudioManager(app) {
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

AudioManager.prototype.setupAudioEventListeners = function() {
    var self = this;
    var elements = this.app.elementManager.getAll();
    
    // Audio event listeners
    elements.audioPlayer.addEventListener('ended', function() {
        self.onAudioEnded();
    });
    elements.staticAudio.addEventListener('ended', function() {
        self.onStaticAudioEnded();
    });
};

AudioManager.prototype.checkMicrophonePermission = function() {
    var self = this;
    return navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function() {
            self.app.uiController.updateStatus('ready', 'Ready to start');
        })
        .catch(function(error) {
            self.app.uiController.showError('Microphone permission is required for voice interaction');
            self.app.uiController.updateStatus('error', 'Microphone access denied');
        });
};

AudioManager.prototype.stopAllAudio = function() {
    var elements = this.app.elementManager.getAll();
    var audioWasStopped = false;
    
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
};

AudioManager.prototype.startRecording = function() {
    var self = this;
    
    // Stop any playing audio immediately when recording starts
    this.stopAllAudio();
    
    this.app.uiController.updateStatus('listening', 'बोलना शुरू करें... (बोलना बंद करने पर स्वतः रुकेगा)');
    this.app.uiController.showVoiceAnimation(true);
    this.isRecording = true;
    this.audioChunks = [];
    this.isSpeaking = false;
    
    // Update button state based on current step
    this.updateRecordingButtonState(true);
    
    return navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function(stream) {
            self.mediaRecorder = new MediaRecorder(stream);
            
            self.mediaRecorder.ondataavailable = function(event) {
                if (event.data.size > 0) {
                    self.audioChunks.push(event.data);
                }
            };
            
            self.mediaRecorder.onstop = function() {
                self.cleanupVAD();
                self.processRecording();
            };
            
            self.mediaRecorder.start();
            
            // Setup Voice Activity Detection
            self.setupVoiceActivityDetection(stream);
            
            // Safety timeout - stop after max recording time
            setTimeout(function() {
                if (self.isRecording) {
                    console.log('Max recording time reached, stopping...');
                    self.stopRecording();
                }
            }, self.maxRecordingTime);
        })
        .catch(function(error) {
            self.app.uiController.showError('रिकॉर्डिंग शुरू करने में विफल: ' + error.message);
            self.app.uiController.updateStatus('error', 'रिकॉर्डिंग विफल');
            self.resetButtonState();
        });
};

AudioManager.prototype.stopRecording = function() {
    if (this.mediaRecorder && this.isRecording) {
        this.mediaRecorder.stop();
        var tracks = this.mediaRecorder.stream.getTracks();
        for (var i = 0; i < tracks.length; i++) {
            tracks[i].stop();
        }
        this.isRecording = false;
        this.app.uiController.showVoiceAnimation(false);
        this.app.uiController.updateStatus('processing', 'प्रसंस्करण...');
        this.resetButtonState();
    }
};

AudioManager.prototype.updateRecordingButtonState = function(isRecording) {
    var elements = this.app.elementManager.getAll();
    var currentStep = this.app.stateManager.currentStep;
    
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
};

AudioManager.prototype.resetButtonState = function() {
    var elements = this.app.elementManager.getAll();
    
    // Remove recording class from all buttons
    elements.mainBtn.classList.remove('recording');
    if (elements.desktopMainBtn) {
        elements.desktopMainBtn.classList.remove('recording');
    }
    elements.bottomBtn.classList.remove('recording');
    if (elements.desktopBottomBtn) {
        elements.desktopBottomBtn.classList.remove('recording');
    }
    if (elements.mobileConversationBtn) {
        elements.mobileConversationBtn.classList.remove('recording');
    }
    
    this.updateRecordingButtonState(false);
};

AudioManager.prototype.processRecording = function() {
    var self = this;
    
    var audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
    var formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    
    // Add current language to form data
    var currentLanguage = this.app.stateManager.userInfo.language || 'hindi';
    formData.append('language', currentLanguage);
    
    // Send audio for processing
    return fetch('/api/voice/process_audio', {
        method: 'POST',
        body: formData
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        // Check if STT succeeded
        if (data.text && data.stt_success !== false) {
            // STT successful - proceed with text processing
            return self.app.handleTranscribedText(data.text);
        } else if (data.fallback || data.stt_success === false) {
            // STT failed - trigger step-specific fallback
            return self.handleSTTFailure();
        } else {
            // Generic error
            self.app.uiController.showError('Could not understand the audio. Please try again.');
            self.app.uiController.updateStatus('error', 'Processing failed');
            self.resetButtonState();
        }
    })
    .catch(function(error) {
        console.error('Error processing audio:', error);
        // On network/exception error, also trigger fallback
        return self.handleSTTFailure();
    });
};

AudioManager.prototype.handleSTTFailure = function() {
    var self = this;
    var currentStep = this.app.stateManager.getCurrentStep();
    
    console.log('STT failed at step: ' + currentStep);
    
    switch (currentStep) {
        case 'name_phone':
            // STT failed during name/phone collection - show manual entry popup
            console.log('Triggering phone input fallback due to STT failure');
            this.app.uiController.updateStatus('processing', 'ऑडियो समझ नहीं आया...');
            return this.app.apiService.handleExtractionFallback('');
            
        case 'language_detection':
            // STT failed during language detection - trigger retry
            console.log('Triggering language detection retry due to STT failure');
            var attempt = this.app.apiService.languageDetectionAttempt || 1;
            
            if (attempt < 3) {
                // Retry with audio prompt
                return this.app.apiService.handleLanguageDetectionRetry(attempt);
            } else {
                // Max retries reached - default to Hindi
                this.app.uiController.showError('भाषा पहचानना नहीं हो सकी। डिफ़ॉल्ट हिंदी का उपयोग किया जा रहा है।');
                this.app.stateManager.updateUserInfo('language', 'hindi');
                this.app.elementManager.setElementContent('userLanguage', 'hindi');
                return this.app.apiService.registerUser().then(function() {
                    self.app.uiController.showUserInfoDisplay();
                });
            }
            
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
    
    return Promise.resolve();
};

AudioManager.prototype.playResponse = function(text, language) {
    var self = this;
    var elements = this.app.elementManager.getAll();
    
    // Show processing status while waiting for TTS response
    this.app.uiController.updateStatus('processing', 'आवाज़ तैयार कर रहा है...');
    
    return fetch('/api/voice/text_to_speech', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            text: text,
            language: language
        })
    })
    .then(function(response) {
        if (response.ok) {
            return response.blob();
        }
        throw new Error('TTS request failed');
    })
    .then(function(audioBlob) {
        var audioUrl = URL.createObjectURL(audioBlob);
        elements.audioPlayer.src = audioUrl;
        
        // Add event listeners for proper status management
        elements.audioPlayer.onloadstart = function() {
            self.app.uiController.updateStatus('speaking', 'बोल रहा है... (Enter दबाकर रोकें)');
        };
        
        elements.audioPlayer.onplay = function() {
            self.isAudioPlaying = true;
            self.app.uiController.updateStatus('speaking', 'बोल रहा है... (Enter दबाकर रोकें)');
        };
        
        elements.audioPlayer.onended = function() {
            self.isAudioPlaying = false;
            if (self.app.stateManager.currentStep === 'conversation') {
                self.app.uiController.updateStatus('ready', 'अगले संदेश के लिए तैयार - Enter दबाएं');
            } else {
                self.app.uiController.updateStatus('ready', 'तैयार - Enter दबाएं');
            }
        };
        
        elements.audioPlayer.onpause = function() {
            self.isAudioPlaying = false;
            if (self.app.stateManager.currentStep === 'conversation') {
                self.app.uiController.updateStatus('ready', 'अगले संदेश के लिए तैयार - Enter दबाएं');
            } else {
                self.app.uiController.updateStatus('ready', 'तैयार - Enter दबाएं');
            }
        };
        
        elements.audioPlayer.onerror = function() {
            self.isAudioPlaying = false;
            self.app.uiController.updateStatus('error', 'आवाज़ चलाने में त्रुटि');
        };
        
        return elements.audioPlayer.play();
    })
    .catch(function(error) {
        console.error('Error playing response:', error);
        self.isAudioPlaying = false;
        self.app.uiController.updateStatus('error', 'आवाज़ चलाने में त्रुटि');
    });
};

AudioManager.prototype.playStaticAudio = function(promptType, language) {
    var self = this;
    var elements = this.app.elementManager.getAll();
    
    // Don't change status for static audio during initial setup
    // Status is already managed by the calling method
    
    return fetch('/api/voice/static_audio/' + promptType + '/' + language)
        .then(function(response) {
            if (response.ok) {
                return response.blob();
            }
            throw new Error('Static audio request failed');
        })
        .then(function(audioBlob) {
            var audioUrl = URL.createObjectURL(audioBlob);
            elements.staticAudio.src = audioUrl;
            
            // Add event listeners for static audio state tracking
            elements.staticAudio.onplay = function() {
                self.isAudioPlaying = true;
                // Only update status if we're in conversation mode
                if (self.app.stateManager.currentStep === 'conversation') {
                    self.app.uiController.updateStatus('speaking', 'बोल रहा है...');
                }
            };
            
            elements.staticAudio.onended = function() {
                self.isAudioPlaying = false;
                // Status will be managed by onStaticAudioEnded method
            };
            
            elements.staticAudio.onpause = function() {
                self.isAudioPlaying = false;
                if (self.app.stateManager.currentStep === 'conversation') {
                    self.app.uiController.updateStatus('ready', 'अगले संदेश के लिए तैयार - Enter दबाएं');
                }
            };
            
            elements.staticAudio.onerror = function() {
                self.isAudioPlaying = false;
                self.app.uiController.updateStatus('error', 'आवाज़ चलाने में त्रुटि');
            };
            
            return elements.staticAudio.play();
        })
        .catch(function(error) {
            console.error('Error playing static audio:', error);
            self.isAudioPlaying = false;
            self.app.uiController.updateStatus('error', 'आवाज़ चलाने में त्रुटि');
        });
};

AudioManager.prototype.playAudioFromUrl = function(url) {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        try {
            var elements = self.app.elementManager.getAll();
            var audio = elements.staticAudio || new Audio();
            
            audio.src = url;
            
            audio.onplay = function() {
                self.isAudioPlaying = true;
            };
            
            audio.onended = function() {
                self.isAudioPlaying = false;
                resolve();
            };
            
            audio.onerror = function(error) {
                self.isAudioPlaying = false;
                console.error('Error playing audio:', error);
                reject(error);
            };
            
            audio.play().catch(reject);
            
        } catch (error) {
            console.error('Error in playAudioFromUrl:', error);
            self.isAudioPlaying = false;
            reject(error);
        }
    });
};

AudioManager.prototype.onAudioEnded = function() {
    // This method is now handled by the audio event listeners in playResponse
    // Keep it for compatibility but don't duplicate status updates
    this.isAudioPlaying = false;
    console.log('Audio ended - status managed by audio event listeners');
};

AudioManager.prototype.onStaticAudioEnded = function() {
    var self = this;
    // Static audio finished playing
    this.isAudioPlaying = false;
    console.log('Static audio ended');
    
    // Auto-start recording if flag is set
    if (this.autoRecordAfterAudio) {
        this.autoRecordAfterAudio = false;
        setTimeout(function() {
            self.startRecording();
        }, 1000); // 1 second delay before auto-recording
    }
};

/**
 * Setup Voice Activity Detection (VAD) using Web Audio API
 * Monitors audio stream and detects when user stops speaking
 */
AudioManager.prototype.setupVoiceActivityDetection = function(stream) {
    try {
        // Create audio context and analyser
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.8;
        
        // Connect stream to analyser
        var source = this.audioContext.createMediaStreamSource(stream);
        source.connect(this.analyser);
        
        // Start monitoring audio levels
        this.startVADMonitoring();
        
        console.log('Voice Activity Detection initialized');
    } catch (error) {
        console.error('Failed to setup VAD:', error);
        // VAD failed, but recording will continue with max timeout
    }
};

/**
 * Monitor audio levels and detect silence
 */
AudioManager.prototype.startVADMonitoring = function() {
    var self = this;
    
    this.vadCheckInterval = setInterval(function() {
        if (!self.isRecording) {
            self.cleanupVAD();
            return;
        }
        
        var volume = self.getAudioVolume();
        
        // Check if user is speaking (volume above threshold)
        if (volume > self.volumeThreshold) {
            // User is speaking - increment detection counter
            self.speechDetectionCount++;
            
            if (!self.isSpeaking && self.speechDetectionCount > 3) {
                // Confirmed speech after 3 consecutive detections
                self.isSpeaking = true;
                self.app.uiController.updateStatus('listening', 'सुन रहा हूँ... (बोलते रहें)');
                console.log('Speech confirmed, volume:', volume);
            }
            
            // Clear silence timer since user is speaking
            if (self.silenceTimer) {
                clearTimeout(self.silenceTimer);
                self.silenceTimer = null;
            }
        } else {
            // Volume below threshold (silence detected)
            self.speechDetectionCount = 0; // Reset speech counter
            
            if (self.isSpeaking && !self.silenceTimer) {
                // User was speaking but now silent, start silence timer
                console.log('Silence detected, starting 2-second timer...');
                self.app.uiController.updateStatus('listening', 'रुकें... (2 सेकंड चुप्पी के बाद बंद होगा)');
                
                self.silenceTimer = setTimeout(function() {
                    if (self.isRecording) {
                        console.log('Silence timeout reached, stopping recording...');
                        self.stopRecording();
                    }
                }, self.silenceThreshold);
            }
        }
    }, 100); // Check every 100ms
};

/**
 * Get current audio volume level (raw value 0-255)
 */
AudioManager.prototype.getAudioVolume = function() {
    if (!this.analyser) return 0;
    
    var bufferLength = this.analyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    
    // Calculate average volume across frequency bins
    var sum = 0;
    var count = 0;
    
    // Focus on speech frequencies (85 Hz to 3000 Hz roughly corresponds to bins 20-350 at 2048 FFT)
    var startBin = Math.floor(bufferLength * 0.02); // Low frequency cutoff
    var endBin = Math.floor(bufferLength * 0.35);   // High frequency cutoff
    
    for (var i = startBin; i < endBin && i < bufferLength; i++) {
        sum += dataArray[i];
        count++;
    }
    
    var average = count > 0 ? sum / count : 0;
    
    return average;
};

/**
 * Cleanup VAD resources
 */
AudioManager.prototype.cleanupVAD = function() {
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
};
