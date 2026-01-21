import speech_recognition as sr
from gtts import gTTS
import os
import logging
from pydub import AudioSegment
import azure.cognitiveservices.speech as speechsdk
from backend.utils.config import Config
from backend.utils.markdown_utils import clean_markdown_for_tts

logger = logging.getLogger(__name__)

class SpeechService:
    """Handles Speech-to-Text and Text-to-Speech operations with Azure Speech Services"""
    
    def __init__(self):
        self.recognizer = sr.Recognizer()
        
        # Initialize Azure Speech Services if credentials are available
        self.azure_speech_config = None
        if Config.AZURE_SPEECH_KEY and Config.AZURE_SPEECH_REGION:
            try:
                self.azure_speech_config = speechsdk.SpeechConfig(
                    subscription=Config.AZURE_SPEECH_KEY,
                    region=Config.AZURE_SPEECH_REGION
                )
                logger.info("Azure Speech Services initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize Azure Speech Services: {e}")
                self.azure_speech_config = None
        else:
            logger.info("Azure Speech Services not configured (missing credentials)")
        
        logger.info("Speech service initialized")
    
    def azure_real_time_speech_to_text(self, language='hi-IN'):
        """Azure real-time speech recognition with automatic silence detection"""
        try:
            if not self.azure_speech_config:
                raise Exception("Azure Speech Services not configured")
            
            # Configure speech recognition language
            self.azure_speech_config.speech_recognition_language = language
            
            # Set silence timeout to 3 seconds
            self.azure_speech_config.set_property(
                speechsdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "3000"
            )
            self.azure_speech_config.set_property(
                speechsdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, "3000"
            )
            
            # Use default microphone
            audio_config = speechsdk.audio.AudioConfig(use_default_microphone=True)
            
            # Create recognizer
            recognizer = speechsdk.SpeechRecognizer(
                speech_config=self.azure_speech_config, 
                audio_config=audio_config
            )
            
            logger.info("Starting real-time speech recognition...")
            
            # Perform recognition
            result = recognizer.recognize_once_async().get()
            
            if result.reason == speechsdk.ResultReason.RecognizedSpeech:
                logger.info(f"Azure speech recognized: {result.text}")
                return result.text
            elif result.reason == speechsdk.ResultReason.NoMatch:
                logger.warning("No speech could be recognized")
                return None
            else:
                logger.error(f"Speech recognition error: {result.reason}")
                return None
                
        except Exception as e:
            logger.error(f"Error in Azure speech recognition: {e}")
            return None
    
    def azure_text_to_speech(self, text, language_code='hi-IN', output_path=None):
        """Azure text-to-speech with native voice support"""
        try:
            if not self.azure_speech_config:
                raise Exception("Azure Speech Services not configured")
            
            # Clean markdown formatting before TTS
            clean_text = clean_markdown_for_tts(text)
            logger.info(f"Cleaned text for Azure TTS: {clean_text[:100]}...")
            
            # Get the appropriate voice for the language
            voice_name = Config.AZURE_VOICES.get(language, "hi-IN-SwaraNeural")
            self.azure_speech_config.speech_synthesis_voice_name = voice_name
            
            if output_path:
                # Save to file
                audio_config = speechsdk.audio.AudioOutputConfig(filename=output_path)
                synthesizer = speechsdk.SpeechSynthesizer(self.azure_speech_config, audio_config)
                
                result = synthesizer.speak_text_async(clean_text).get()
                
                if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                    logger.info(f"Azure TTS audio saved to: {output_path}")
                    return output_path
                else:
                    logger.error(f"Azure TTS error: {result.reason}")
                    return None
            else:
                # Play directly to speakers
                audio_config = speechsdk.audio.AudioOutputConfig(use_default_speaker=True)
                synthesizer = speechsdk.SpeechSynthesizer(self.azure_speech_config, audio_config)
                
                result = synthesizer.speak_text_async(text).get()
                
                if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                    logger.info("Azure TTS speech synthesized successfully")
                    return True
                elif result.reason == speechsdk.ResultReason.Canceled:
                    cancellation = result.cancellation_details
                    logger.error(f"Azure TTS canceled: {cancellation.reason}, {cancellation.error_details}")
                    return False
                else:
                    logger.error(f"Azure TTS error: {result.reason}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error in Azure text-to-speech: {e}")
            return None if output_path else False
        
    def speech_to_text(self, audio_file_path, language='hi-IN'):
        """Convert audio file to text with support for Indian languages"""
        try:
            with sr.AudioFile(audio_file_path) as source:
                # Adjust for ambient noise
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                
                # Record the audio
                audio = self.recognizer.record(source)
                
                # Recognize speech using Google Speech Recognition
                text = self.recognizer.recognize_google(audio, language=language)
                logger.info(f"Speech recognized: {text}")
                return text
                
        except sr.UnknownValueError:
            logger.warning("Could not understand the audio")
            return None
        except sr.RequestError as e:
            logger.error(f"Speech recognition service error: {e}")
            return None
        except Exception as e:
            logger.error(f"Error in speech recognition: {e}")
            return None
    
    def text_to_speech(self, text, language='en', output_path=None):
        """Convert text to speech and return audio file path"""
        try:
            # Clean markdown formatting before TTS
            clean_text = clean_markdown_for_tts(text)
            logger.info(f"Cleaned text for TTS: {clean_text[:100]}...")
            
            # Create TTS object
            tts = gTTS(text=clean_text, lang=language, slow=False)
            
            # Generate output path if not provided
            if not output_path:
                output_path = os.path.join(
                    Config.AUDIO_UPLOAD_FOLDER, 
                    f"tts_{hash(clean_text)}_{language}.mp3"
                )
            
            # Save to file
            tts.save(output_path)
            logger.info(f"TTS audio saved to: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error in text-to-speech: {e}")
            return None
    
    def convert_audio_format(self, input_path, output_path=None, target_format='wav'):
        """Convert audio file to different format with proper PCM WAV settings"""
        try:
            if not output_path:
                base_name = os.path.splitext(input_path)[0]
                output_path = f"{base_name}.{target_format}"
            
            # Load and convert audio with specific settings for speech recognition
            audio = AudioSegment.from_file(input_path)
            
            # Convert to mono, 16kHz, 16-bit PCM WAV format for better compatibility
            audio = audio.set_channels(1)  # Mono
            audio = audio.set_frame_rate(16000)  # 16kHz sample rate
            audio = audio.set_sample_width(2)  # 16-bit
            
            # Export with PCM format
            if target_format == 'wav':
                audio.export(output_path, format="wav", parameters=["-acodec", "pcm_s16le"])
            else:
                audio.export(output_path, format=target_format)
            
            logger.info(f"Audio converted to: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error converting audio: {e}")
            return None
    
    def process_uploaded_audio(self, audio_data, filename, language='hindi'):
        """Process uploaded audio data and convert to text with improved format handling"""
        try:
            # Save uploaded file
            temp_path = os.path.join(Config.AUDIO_UPLOAD_FOLDER, filename)
            
            with open(temp_path, 'wb') as f:
                f.write(audio_data)
            
            # Always convert to proper WAV format for speech recognition compatibility
            wav_filename = f"{os.path.splitext(filename)[0]}_converted.wav"
            wav_path = os.path.join(Config.AUDIO_UPLOAD_FOLDER, wav_filename)
            
            # Convert to PCM WAV format
            converted_path = self.convert_audio_format(temp_path, wav_path, 'wav')
            
            if not converted_path:
                logger.error("Failed to convert audio to WAV format")
                # Clean up original file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                return None
            
            # Get proper language code for speech recognition
            speech_lang = Config.SPEECH_RECOGNITION_LANGUAGES.get(language, 'hi-IN')
            
            # Perform speech recognition on converted file
            text = self.speech_to_text(converted_path, speech_lang)
            
            # Clean up temporary files
            if os.path.exists(temp_path):
                os.remove(temp_path)
            if os.path.exists(converted_path):
                os.remove(converted_path)
            
            return text
            
        except Exception as e:
            logger.error(f"Error processing uploaded audio: {e}")
            # Clean up files in case of error
            for file_path in [temp_path, wav_path if 'wav_path' in locals() else None]:
                if file_path and os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except:
                        pass
            return None
    
    def validate_audio_file(self, file_path):
        """Validate if audio file is in supported format"""
        try:
            audio = AudioSegment.from_file(file_path)
            logger.info(f"Audio validation successful: {file_path}")
            logger.info(f"Audio properties - Channels: {audio.channels}, Frame rate: {audio.frame_rate}, Sample width: {audio.sample_width}")
            return True
        except Exception as e:
            logger.error(f"Audio validation failed for {file_path}: {e}")
            return False
    
    def create_static_audio(self, text, language='hi', filename=None):
        """Create static audio file for predefined prompts"""
        try:
            if not filename:
                safe_text = "".join(c for c in text[:30] if c.isalnum() or c in (' ', '-', '_')).rstrip()
                filename = f"static_{safe_text.replace(' ', '_')}_{language}.mp3"
            
            output_path = os.path.join('static', 'audio', filename)
            
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # Generate TTS
            tts = gTTS(text=text, lang=language, slow=False)
            tts.save(output_path)
            
            logger.info(f"Static audio created: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error creating static audio: {e}")
            return None

# Global service instance
speech_service = SpeechService()