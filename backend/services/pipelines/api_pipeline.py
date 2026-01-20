"""API-based pipeline using Azure Cognitive Services"""
import logging
import os
import tempfile
import azure.cognitiveservices.speech as speechsdk
from pydub import AudioSegment
from .base_pipeline import BasePipeline
from backend.utils.config import Config
from backend.utils.markdown_utils import clean_markdown_for_tts

logger = logging.getLogger(__name__)


class APIPipeline(BasePipeline):
    """Pipeline using Azure Cognitive Services (real-time STT + TTS)"""
    
    def __init__(self, llm_service):
        """
        Initialize API pipeline with Azure Speech Services
        
        Args:
            llm_service: Instance of an LLM service
        """
        super().__init__(llm_service)
        
        # Initialize Azure Speech Config
        if not Config.AZURE_SPEECH_KEY or not Config.AZURE_SPEECH_REGION:
            logger.error("Azure Speech Services credentials not configured")
            raise ValueError("Azure Speech Services credentials (AZURE_SPEECH_KEY, AZURE_SPEECH_REGION) are required for API pipeline")
        
        try:
            self.azure_speech_config = speechsdk.SpeechConfig(
                subscription=Config.AZURE_SPEECH_KEY,
                region=Config.AZURE_SPEECH_REGION
            )
            logger.info("APIPipeline initialized with Azure Cognitive Services")
        except Exception as e:
            logger.error(f"Failed to initialize Azure Speech Config: {e}")
            raise
    
    def speech_to_text(self, audio_data, language):
        """
        Convert speech to text using Azure Speech Services
        
        Args:
            audio_data: Audio file path or file-like object
            language: Language code (e.g., 'hi-IN', 'bn-BD')
            
        Returns:
            str: Recognized text or None if failed
        """
        try:
            # Configure language
            self.azure_speech_config.speech_recognition_language = language
            
            # Set silence timeout (2 seconds for faster response)
            self.azure_speech_config.set_property(
                speechsdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "5000"
            )
            self.azure_speech_config.set_property(
                speechsdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, "2000"
            )
            
            # Handle different audio input types
            if isinstance(audio_data, str):
                # If it's a file path
                audio_path = audio_data
            else:
                # If it's a file-like object (werkzeug FileStorage)
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
                audio_data.save(temp_file.name)
                
                # Convert to WAV format if needed
                audio = AudioSegment.from_file(temp_file.name)
                wav_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
                audio.export(wav_file.name, format='wav')
                audio_path = wav_file.name
            
            # Create audio config from file
            audio_config = speechsdk.audio.AudioConfig(filename=audio_path)
            
            # Create recognizer
            recognizer = speechsdk.SpeechRecognizer(
                speech_config=self.azure_speech_config,
                audio_config=audio_config
            )
            
            # Perform recognition
            result = recognizer.recognize_once()
            
            if result.reason == speechsdk.ResultReason.RecognizedSpeech:
                logger.info(f"Azure STT recognized: {result.text}")
                return result.text
            elif result.reason == speechsdk.ResultReason.NoMatch:
                logger.warning("Azure: No speech could be recognized")
                return None
            elif result.reason == speechsdk.ResultReason.Canceled:
                cancellation = result.cancellation_details
                logger.error(f"Azure STT canceled: {cancellation.reason}, {cancellation.error_details}")
                return None
            else:
                logger.error(f"Azure STT error: {result.reason}")
                return None
                
        except Exception as e:
            logger.error(f"Error in Azure STT: {e}")
            return None
    
    def text_to_speech(self, text, language, output_path=None):
        """
        Convert text to speech using Azure Speech Services
        
        Args:
            text: Text to convert (may contain markdown)
            language: Language code (e.g., 'hi-IN', 'bn-BD')
            output_path: Optional path to save audio file
            
        Returns:
            str: Path to generated audio file or None if failed
        """
        try:
            # Clean markdown formatting before TTS
            clean_text = clean_markdown_for_tts(text)
            logger.info(f"Cleaned text for TTS: {clean_text[:100]}...")
            
            # Get the appropriate voice for the language
            voice_name = Config.AZURE_VOICES.get(language, "hi-IN-SwaraNeural")
            self.azure_speech_config.speech_synthesis_voice_name = voice_name
            
            # Create output path if not provided
            if not output_path:
                os.makedirs(Config.AUDIO_UPLOAD_FOLDER, exist_ok=True)
                output_path = os.path.join(
                    Config.AUDIO_UPLOAD_FOLDER,
                    f'tts_azure_{hash(clean_text)}_{language}.wav'
                )
            
            # Configure audio output
            audio_config = speechsdk.audio.AudioOutputConfig(filename=output_path)
            
            # Create synthesizer
            synthesizer = speechsdk.SpeechSynthesizer(
                speech_config=self.azure_speech_config,
                audio_config=audio_config
            )
            
            # Perform synthesis with cleaned text
            result = synthesizer.speak_text_async(clean_text).get()
            
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                logger.info(f"Azure TTS generated: {output_path}")
                return output_path
            elif result.reason == speechsdk.ResultReason.Canceled:
                cancellation = result.cancellation_details
                logger.error(f"Azure TTS canceled: {cancellation.reason}, {cancellation.error_details}")
                return None
            else:
                logger.error(f"Azure TTS error: {result.reason}")
                return None
                
        except Exception as e:
            logger.error(f"Error in Azure TTS: {e}")
            return None
