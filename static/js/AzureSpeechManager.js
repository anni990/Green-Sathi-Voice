/**
 * AzureSpeechManager.js
 * Handles Azure Speech Services integration for real-time speech recognition and TTS
 */

class AzureSpeechManager {
    constructor(app) {
        this.app = app;
        this.isAzureAvailable = true; // Will be set based on backend configuration
        this.speechRecognitionActive = false;
        
        this.checkAzureAvailability();
    }
    
    async checkAzureAvailability() {
        // Just assume Azure is available initially - will be checked when actually needed
        // This prevents unwanted API calls during page load
        this.isAzureAvailable = true;
        console.log('Azure Speech Services availability will be checked when needed');
    }
    
    async startRealTimeSpeechRecognition() {
        try {
            this.speechRecognitionActive = true;
            this.app.uiController.updateStatus('listening', 'सुन रहा हूँ... (3 सेकंड मौनता के बाद अपने आप रुकेगा)');
            this.app.uiController.showVoiceAnimation(true);
            
            // Get current language
            const currentLanguage = this.app.stateManager.userInfo.language || 'hindi';
            
            // Start Azure real-time speech recognition
            const response = await fetch('/api/voice/azure_speech_to_text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    language: currentLanguage 
                })
            });
            
            const data = await response.json();
            
            // Reset recognition state
            this.speechRecognitionActive = false;
            this.app.uiController.showVoiceAnimation(false);
            
            if (response.ok && data.text) {
                this.app.uiController.updateStatus('processing', 'प्रक्रिया जारी...');
                // Mark Azure as available since it worked
                this.isAzureAvailable = true;
                return data.text;
            } else {
                // If response is not ok, mark Azure as unavailable for fallback
                if (response.status === 500) {
                    this.isAzureAvailable = false;
                }
                this.app.uiController.updateStatus('error', 'आवाज़ समझने में त्रुटि');
                return null;
            }
            
        } catch (error) {
            this.speechRecognitionActive = false;
            this.app.uiController.showVoiceAnimation(false);
            this.app.uiController.updateStatus('error', 'रिकॉर्डिंग त्रुटि');
            console.error('Azure speech recognition error:', error);
            // Mark Azure as unavailable on error for fallback
            this.isAzureAvailable = false;
            return null;
        }
    }
    
    async synthesizeSpeech(text, language, returnAudio = true) {
        try {
            
            this.app.uiController.updateStatus('processing', 'आवाज़ तैयार कर रहा है...');
            
            const response = await fetch('/api/voice/azure_text_to_speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    language: language,
                    return_audio: returnAudio
                })
            });
            
            if (response.ok) {
                if (returnAudio) {
                    // Return audio blob for frontend playback
                    const audioBlob = await response.blob();
                    return audioBlob;
                } else {
                    // Audio played on backend
                    const data = await response.json();
                    return data.success;
                }
            } else {
                console.error('Azure TTS failed:', await response.text());
                return null;
            }
            
        } catch (error) {
            console.error('Azure TTS error:', error);
            this.app.uiController.updateStatus('error', 'आवाज़ तैयार करने में त्रुटि');
            return null;
        }
    }
    
    isRecognitionActive() {
        return this.speechRecognitionActive;
    }
    
    stopRecognition() {
        this.speechRecognitionActive = false;
        this.app.uiController.showVoiceAnimation(false);
    }
    
    async playAudioBlob(audioBlob) {
        try {
            const elements = this.app.elementManager.getAll();
            const audioUrl = URL.createObjectURL(audioBlob);
            elements.audioPlayer.src = audioUrl;
            
            // Set up event listeners
            elements.audioPlayer.onloadstart = () => {
                this.app.uiController.updateStatus('speaking', 'बोल रहा है... (Enter दबाकर रोकें)');
            };
            
            elements.audioPlayer.onplay = () => {
                this.app.audioManager.isAudioPlaying = true;
                this.app.uiController.updateStatus('speaking', 'बोल रहा है... (Enter दबाकर रोकें)');
            };
            
            elements.audioPlayer.onended = () => {
                this.app.audioManager.isAudioPlaying = false;
                if (this.app.stateManager.currentStep === 'conversation') {
                    this.app.uiController.updateStatus('ready', 'अगले संदेश के लिए तैयार - Enter दबाएं');
                } else {
                    this.app.uiController.updateStatus('ready', 'तैयार - Enter दबाएं');
                }
                // Clean up blob URL
                URL.revokeObjectURL(audioUrl);
            };
            
            elements.audioPlayer.onpause = () => {
                this.app.audioManager.isAudioPlaying = false;
                if (this.app.stateManager.currentStep === 'conversation') {
                    this.app.uiController.updateStatus('ready', 'अगले संदेश के लिए तैयार - Enter दबाएं');
                } else {
                    this.app.uiController.updateStatus('ready', 'तैयार - Enter दबाएं');
                }
            };
            
            elements.audioPlayer.onerror = () => {
                this.app.audioManager.isAudioPlaying = false;
                this.app.uiController.updateStatus('error', 'आवाज़ चलाने में त्रुटि');
                URL.revokeObjectURL(audioUrl);
            };
            
            await elements.audioPlayer.play();
            
        } catch (error) {
            console.error('Error playing audio blob:', error);
            this.app.uiController.updateStatus('error', 'आवाज़ चलाने में त्रुटि');
        }
    }
    
    // Fallback methods for when Azure is not available
    async fallbackToTraditionalRecording() {
        console.log('Falling back to traditional audio recording...');
        // Call the original recording method from AudioManager
        return await this.app.audioManager.startTraditionalRecording();
    }
}