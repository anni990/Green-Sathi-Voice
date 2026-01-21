"""Base pipeline class defining the interface for voice processing pipelines"""
import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class BasePipeline(ABC):
    """Abstract base class for voice processing pipelines"""
    
    def __init__(self, llm_service):
        """
        Initialize the pipeline with an LLM service
        
        Args:
            llm_service: Instance of an LLM service (GeminiService, OpenAIService, etc.)
        """
        self.llm_service = llm_service
        logger.info(f"Initialized {self.__class__.__name__} with {llm_service.__class__.__name__}")
    
    @abstractmethod
    def speech_to_text(self, audio_data, language):
        """
        Convert speech to text
        
        Args:
            audio_data: Audio file data or path
            language: Language code for recognition
            
        Returns:
            str: Recognized text or None if failed
        """
        pass
    
    @abstractmethod
    def text_to_speech(self, text, language, output_path=None):
        """
        Convert text to speech
        
        Args:
            text: Text to convert
            language: Language code for synthesis
            output_path: Optional path to save audio file
            
        Returns:
            str: Path to generated audio file or None if failed
        """
        pass
    
    def extract_name_phone(self, text):
        """
        Extract name and phone number from text using LLM
        
        Args:
            text: Input text containing name and phone
            
        Returns:
            dict: {'name': str, 'phone': str}
        """
        return self.llm_service.extract_name_phone(text)
    
    def detect_language(self, text):
        """
        Detect language from text using LLM
        
        Args:
            text: Input text
            
        Returns:
            str: Detected language name
        """
        return self.llm_service.detect_language(text)
    
    def generate_response(self, user_input, language, conversation_history):
        """
        Generate conversational response using LLM
        
        Args:
            user_input: User's input text
            language: Language for response
            conversation_history: Previous conversation turns
            
        Returns:
            str: Generated response
        """
        return self.llm_service.generate_response(user_input, language, conversation_history)
