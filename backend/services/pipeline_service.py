"""Pipeline Service - Orchestrates pipeline selection based on device configuration"""
import logging
from backend.models.database import db_manager
from backend.services.llm_service import gemini_service, openai_service, azure_openai_service, vertex_service
from backend.services.pipelines import LibraryPipeline, APIPipeline
from backend.utils.config import Config

logger = logging.getLogger(__name__)


class PipelineService:
    """
    Orchestrates voice processing pipelines based on device configuration.
    Routes requests to either LibraryPipeline (Google STT + gTTS) or 
    APIPipeline (Azure Cognitive Services) based on device settings.
    """
    
    def __init__(self):
        """Initialize pipeline service with LLM service mappings"""
        self.llm_services = {
            'gemini': gemini_service,
            'openai': openai_service,
            'azure_openai': azure_openai_service,
            'vertex': vertex_service
        }
        
        # Cache for instantiated pipelines (keyed by device_id)
        self.pipeline_cache = {}
        logger.info("PipelineService initialized")
    
    def get_pipeline(self, device_id):
        """
        Get the appropriate pipeline for a device based on its configuration
        
        Args:
            device_id: Device identifier
            
        Returns:
            BasePipeline: Either LibraryPipeline or APIPipeline instance
        """
        try:
            # Check cache first
            if device_id in self.pipeline_cache:
                return self.pipeline_cache[device_id]
            
            # Get device configuration from database
            config = db_manager.get_device_pipeline_config(device_id)
            
            if not config:
                logger.warning(f"No pipeline config found for device {device_id}, using defaults")
                pipeline_type = Config.DEFAULT_PIPELINE_TYPE
                llm_service_name = Config.DEFAULT_LLM_SERVICE_TYPE
            else:
                pipeline_type = config.get('pipeline_type', Config.DEFAULT_PIPELINE_TYPE)
                llm_service_name = config.get('llm_service', Config.DEFAULT_LLM_SERVICE_TYPE)
            
            # Get LLM service instance
            llm_service = self.llm_services.get(llm_service_name)
            if not llm_service:
                logger.error(f"Invalid LLM service: {llm_service_name}, falling back to gemini")
                llm_service = self.llm_services['gemini']
            
            # Instantiate pipeline
            if pipeline_type == 'library':
                pipeline = LibraryPipeline(llm_service)
                logger.info(f"Created LibraryPipeline for device {device_id} with {llm_service_name}")
            elif pipeline_type == 'api':
                pipeline = APIPipeline(llm_service)
                logger.info(f"Created APIPipeline for device {device_id} with {llm_service_name}")
            else:
                logger.error(f"Invalid pipeline type: {pipeline_type}, falling back to library")
                pipeline = LibraryPipeline(llm_service)
            
            # Cache the pipeline
            self.pipeline_cache[device_id] = pipeline
            return pipeline
            
        except Exception as e:
            logger.error(f"Error getting pipeline for device {device_id}: {e}")
            # Fallback to default library pipeline with gemini
            return LibraryPipeline(self.llm_services['gemini'])
    
    def clear_pipeline_cache(self, device_id=None):
        """
        Clear pipeline cache for a specific device or all devices
        Call this when device configuration is updated
        
        Args:
            device_id: Optional device ID to clear. If None, clears all cache.
        """
        if device_id:
            if device_id in self.pipeline_cache:
                del self.pipeline_cache[device_id]
                logger.info(f"Cleared pipeline cache for device {device_id}")
        else:
            self.pipeline_cache.clear()
            logger.info("Cleared all pipeline cache")
    
    def speech_to_text(self, device_id, audio_data, language):
        """
        Convert speech to text using device-specific pipeline
        
        Args:
            device_id: Device identifier
            audio_data: Audio file data
            language: Language code
            
        Returns:
            str: Recognized text or None
        """
        pipeline = self.get_pipeline(device_id)
        return pipeline.speech_to_text(audio_data, language)
    
    def text_to_speech(self, device_id, text, language, output_path=None):
        """
        Convert text to speech using device-specific pipeline
        
        Args:
            device_id: Device identifier
            text: Text to convert
            language: Language code
            output_path: Optional output file path
            
        Returns:
            str: Path to audio file or None
        """
        pipeline = self.get_pipeline(device_id)
        return pipeline.text_to_speech(text, language, output_path)
    
    def extract_name_phone(self, device_id, text):
        """
        Extract name and phone using device-specific LLM
        
        Args:
            device_id: Device identifier
            text: Input text
            
        Returns:
            dict: {'name': str, 'phone': str}
        """
        pipeline = self.get_pipeline(device_id)
        return pipeline.extract_name_phone(text)
    
    def detect_language(self, device_id, text):
        """
        Detect language using device-specific LLM
        
        Args:
            device_id: Device identifier
            text: Input text
            
        Returns:
            str: Detected language name
        """
        pipeline = self.get_pipeline(device_id)
        return pipeline.detect_language(text)
    
    def generate_response(self, device_id, user_input, language, conversation_history):
        """
        Generate response using device-specific LLM
        
        Args:
            device_id: Device identifier
            user_input: User's input text
            language: Language for response
            conversation_history: Previous conversation turns
            
        Returns:
            str: Generated response
        """
        pipeline = self.get_pipeline(device_id)
        return pipeline.generate_response(user_input, language, conversation_history)
    
    def get_device_config_info(self, device_id):
        """
        Get configuration information for a device
        
        Args:
            device_id: Device identifier
            
        Returns:
            dict: Configuration details including pipeline type and LLM service
        """
        config = db_manager.get_device_pipeline_config(device_id)
        if config:
            return {
                'device_id': device_id,
                'pipeline_type': config.get('pipeline_type'),
                'llm_service': config.get('llm_service'),
                'is_cached': device_id in self.pipeline_cache
            }
        return None


# Global pipeline service instance
pipeline_service = PipelineService()
