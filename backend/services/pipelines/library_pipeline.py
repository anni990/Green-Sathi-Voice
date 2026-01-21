"""Library-based pipeline using Google Speech Recognition and gTTS"""
import logging
import os
import speech_recognition as sr
from gtts import gTTS
from pydub import AudioSegment
import tempfile
from .base_pipeline import BasePipeline
from backend.utils.config import Config
from backend.utils.markdown_utils import clean_markdown_for_tts

logger = logging.getLogger(__name__)


class LibraryPipeline(BasePipeline):
    """Pipeline using free library-based services (Google STT + gTTS)"""
    
    def __init__(self, llm_service):
        """
        Initialize library pipeline
        
        Args:
            llm_service: Instance of an LLM service
        """
        super().__init__(llm_service)
        self.recognizer = sr.Recognizer()
        logger.info("LibraryPipeline initialized with Google STT and gTTS")
    
    def speech_to_text(self, audio_data, language):
        """
        Convert speech to text using Google Speech Recognition
        
        Args:
            audio_data: Audio file path or file-like object
            language: Language code (e.g., 'hi-IN', 'bn-BD')
            
        Returns:
            str: Recognized text or None if failed
        """
        try:
            # If audio_data is a file path
            if isinstance(audio_data, str):
                # Convert to appropriate format if needed
                if not audio_data.endswith('.wav'):
                    audio = AudioSegment.from_file(audio_data)
                    temp_wav = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
                    audio.export(temp_wav.name, format='wav')
                    audio_path = temp_wav.name
                else:
                    audio_path = audio_data
                
                # Recognize speech
                with sr.AudioFile(audio_path) as source:
                    audio = self.recognizer.record(source)
                    text = self.recognizer.recognize_google(audio, language=language)
                    logger.info(f"Library STT recognized: {text}")
                    return text
            
            # If audio_data is werkzeug FileStorage or file-like object
            else:
                # Save to temporary file
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
                audio_data.save(temp_file.name)
                
                # Convert to WAV if needed
                audio = AudioSegment.from_file(temp_file.name)
                wav_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
                audio.export(wav_file.name, format='wav')
                
                # Recognize speech
                with sr.AudioFile(wav_file.name) as source:
                    audio = self.recognizer.record(source)
                    text = self.recognizer.recognize_google(audio, language=language)
                    logger.info(f"Library STT recognized: {text}")
                    
                    # Cleanup temp files
                    os.unlink(temp_file.name)
                    os.unlink(wav_file.name)
                    
                    return text
                    
        except sr.UnknownValueError:
            logger.warning("Google Speech Recognition could not understand audio")
            return None
        except sr.RequestError as e:
            logger.error(f"Google Speech Recognition service error: {e}")
            return None
        except Exception as e:
            logger.error(f"Error in library STT: {e}")
            return None
    
    def text_to_speech(self, text, language, output_path=None):
        """
        Convert text to speech using gTTS
        
        Args:
            text: Text to convert (may contain markdown)
            language: Language code (e.g., 'hi', 'bn', 'ta')
            output_path: Optional path to save audio file
            
        Returns:
            str: Path to generated audio file or None if failed
        """
        try:
            # Clean markdown formatting before TTS
            clean_text = clean_markdown_for_tts(text)
            logger.info(f"Cleaned text for TTS: {clean_text[:100]}...")
            
            # Create output path if not provided
            if not output_path:
                os.makedirs(Config.AUDIO_UPLOAD_FOLDER, exist_ok=True)
                output_path = os.path.join(
                    Config.AUDIO_UPLOAD_FOLDER,
                    f'tts_{hash(clean_text)}_{language}.mp3'
                )
            
            # Generate speech using gTTS with cleaned text
            tts = gTTS(text=clean_text, lang=language, slow=False)
            tts.save(output_path)
            logger.info(f"Library TTS generated: {output_path}")
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error in library TTS: {e}")
            return None
