from flask import Blueprint, request, jsonify, send_file
import os
import uuid
import logging
from backend.services.speech_service import speech_service
from backend.services.pipeline_service import pipeline_service
from backend.services.llm_service import gemini_service, openai_service, azure_openai_service, vertex_service
from backend.services.device_auth_service import device_auth_required
from backend.utils.config import Config
from backend.models.database import db_manager

llm_services = {
    'gemini': gemini_service,
    'openai': openai_service,
    'azure_openai': azure_openai_service,
    'vertex_gemini': vertex_service
}

current_llm_service = llm_services.get(Config.DEFAULT_LLM_SERVICE, azure_openai_service)


logger = logging.getLogger(__name__)
voice_bp = Blueprint('voice', __name__)

# azure_openai_service = azure_openai_service

@voice_bp.route('/process_audio', methods=['POST'])
def process_audio():
    """Process uploaded audio and return text"""
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({'error': 'No audio file selected'}), 400
        
        # Get language from request (default to Hindi)
        language = request.form.get('language', 'hindi')
        device_id = request.form.get('device_id')  # Optional device ID
        
        # Get proper language code for speech recognition
        lang_code = Config.SPEECH_RECOGNITION_LANGUAGES.get(language, 'hi-IN')
        
        # Use pipeline service if device_id is provided, otherwise use legacy speech_service
        if device_id:
            try:
                device_id = int(device_id)
                text = pipeline_service.speech_to_text(device_id, audio_file, lang_code)
            except (ValueError, TypeError):
                logger.warning(f"Invalid device_id format: {device_id}, falling back to legacy service")
                filename = f"{uuid.uuid4()}_{audio_file.filename}"
                text = speech_service.process_uploaded_audio(audio_file.read(), filename, language)
        else:
            # Legacy path for backward compatibility
            filename = f"{uuid.uuid4()}_{audio_file.filename}"
            text = speech_service.process_uploaded_audio(audio_file.read(), filename, language)
        
        if text:
            return jsonify({'text': text, 'stt_success': True})
        else:
            # STT failed - return fallback indicator
            logger.warning("Speech-to-text failed: Could not understand audio")
            return jsonify({
                'error': 'Could not understand the audio',
                'text': '',
                'stt_success': False,
                'fallback': True
            }), 200
            
    except Exception as e:
        logger.error(f"Error processing audio: {e}")
        return jsonify({
            'error': 'Internal server error',
            'text': '',
            'stt_success': False,
            'fallback': True
        }), 200

@voice_bp.route('/extract_info', methods=['POST'])
def extract_user_info():
    """Extract name and phone number from text"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        device_id = data.get('device_id')  # Optional device ID
        
        if not text:
            return jsonify({'error': 'No text provided', 'fallback': True}), 400
        
        # Use pipeline service if device_id is provided
        if device_id:
            try:
                device_id = int(device_id)
                info = pipeline_service.extract_name_phone(device_id, text)
            except (ValueError, TypeError):
                logger.warning(f"Invalid device_id format: {device_id}, using default LLM")
                info = current_llm_service.extract_name_phone(text)
        else:
            # Legacy path - use default LLM service
            info = current_llm_service.extract_name_phone(text)
        
        # Check if extraction was successful
        if not info.get('phone'):
            # Failed to extract phone - trigger fallback
            logger.warning(f"Failed to extract phone from text: {text}")
            return jsonify({
                'name': info.get('name', ''),
                'phone': '',
                'fallback': True,
                'message': 'Could not extract phone number'
            })
        
        return jsonify({
            'name': info.get('name', ''),
            'phone': info.get('phone', ''),
            'fallback': False
        })
        
    except Exception as e:
        logger.error(f"Error extracting user info: {e}")
        return jsonify({
            'error': str(e),
            'fallback': True,
            'message': 'Error processing request'
        }), 200

@voice_bp.route('/detect_language', methods=['POST'])
def detect_language():
    """Detect language from user input"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        device_id = data.get('device_id')  # Optional device ID
        attempt = data.get('attempt', 1)  # Track retry attempts
        
        if not text:
            return jsonify({
                'error': 'No text provided',
                'retry': True,
                'attempt': attempt
            }), 400
        
        # Use pipeline service if device_id is provided
        if device_id:
            try:
                device_id = int(device_id)
                language = pipeline_service.detect_language(device_id, text)
            except (ValueError, TypeError):
                logger.warning(f"Invalid device_id format: {device_id}, using default LLM")
                language = current_llm_service.detect_language(text)
        else:
            # Legacy path - use default LLM service
            language = current_llm_service.detect_language(text)
        
        # Validate language is in supported list
        if language and language.lower() in [lang.lower() for lang in Config.SUPPORTED_LANGUAGES.keys()]:
            return jsonify({
                'language': language,
                'retry': False,
                'attempt': attempt
            })
        else:
            # Language detection failed - allow retry
            logger.warning(f"Language detection failed for text: {text}, attempt: {attempt}")
            return jsonify({
                'language': '',
                'retry': True,
                'attempt': attempt,
                'message': 'Could not detect language'
            })
        
    except Exception as e:
        logger.error(f"Error detecting language: {e}")
        return jsonify({
            'error': str(e),
            'retry': True,
            'attempt': attempt,
            'message': 'Error processing request'
        }), 200

@voice_bp.route('/generate_response', methods=['POST'])
@device_auth_required
def generate_response():
    """Generate AI response to user input"""
    try:
        data = request.get_json()
        user_input = data.get('text', '')
        language = data.get('language', 'hindi')
        user_id = data.get('user_id')
        session_id = data.get('session_id')
        device_id = request.device_id  # From device_auth_required decorator
        
        if not user_input:
            return jsonify({'error': 'No text provided'}), 400
        
        # Get conversation history if user_id provided
        conversation_history = None
        if user_id:
            conversation_history = db_manager.get_conversation_history(user_id, session_id, limit=10)
        
        # Generate response using device-specific pipeline
        response = pipeline_service.generate_response(device_id, user_input, language, conversation_history)
        
        # Don't remove asterisks - they're used for markdown formatting (bold text)
        # response = response.replace("*", "")  # REMOVED - conflicts with markdown

        # Save conversation to database if user_id provided (with device_id)
        if user_id and response:
            db_manager.create_conversation(user_id, user_input, response, device_id, session_id)
        
        return jsonify({
            'response': response,
            'language': language
        })
        
    except Exception as e:
        logger.error(f"Error generating response: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@voice_bp.route('/azure_speech_to_text', methods=['POST'])
def azure_speech_to_text():
    """Start Azure real-time speech recognition (no audio upload needed)"""
    try:
        data = request.get_json()
        language = data.get('language', 'hindi')
        
        # Convert language name to Azure language code
        language_code = Config.SPEECH_RECOGNITION_LANGUAGES.get(language, 'hi-IN')
        
        # Use Azure real-time speech recognition
        text = speech_service.azure_real_time_speech_to_text(language_code)
        
        if text:
            return jsonify({'text': text})
        else:
            return jsonify({'error': 'Could not recognize speech'}), 400
            
    except Exception as e:
        logger.error(f"Error in Azure speech recognition: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@voice_bp.route('/azure_text_to_speech', methods=['POST'])
def azure_text_to_speech():
    """Convert text to speech using Azure Speech Services"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        language = data.get('language', 'hindi')
        return_audio = data.get('return_audio', False)
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Convert language name to Azure language code
        language_code = Config.SPEECH_RECOGNITION_LANGUAGES.get(language, 'hi-IN')
        
        if return_audio:
            # Generate audio file and return it
            output_path = os.path.join(
                Config.AUDIO_UPLOAD_FOLDER, 
                f"azure_tts_{hash(text)}_{language}.wav"
            )
            
            audio_path = speech_service.azure_text_to_speech(text, language_code, output_path)
            
            if audio_path and os.path.exists(audio_path):
                return send_file(audio_path, as_attachment=True, download_name='response.wav')
            else:
                return jsonify({'error': 'Could not generate audio'}), 500
        else:
            # Play directly to speakers (for backend testing)
            success = speech_service.azure_text_to_speech(text, language_code)
            
            if success:
                return jsonify({'success': True, 'message': 'Speech played successfully'})
            else:
                return jsonify({'error': 'Could not play speech'}), 500
            
    except Exception as e:
        logger.error(f"Error in Azure text-to-speech: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@voice_bp.route('/text_to_speech', methods=['POST'])
def text_to_speech():
    """Convert text to speech"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        language = data.get('language', 'hindi')
        device_id = data.get('device_id')  # Optional device ID
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Convert language name to code
        language_code = Config.SUPPORTED_LANGUAGES.get(language, 'hi')
        
        # Use pipeline service if device_id is provided
        if device_id:
            try:
                device_id = int(device_id)
                # For TTS, get speech recognition language code (e.g., 'hi-IN')
                lang_code = Config.SPEECH_RECOGNITION_LANGUAGES.get(language, 'hi-IN')
                audio_path = pipeline_service.text_to_speech(device_id, text, lang_code)
            except (ValueError, TypeError):
                logger.warning(f"Invalid device_id format: {device_id}, using legacy TTS")
                audio_path = speech_service.text_to_speech(text, language_code)
        else:
            # Legacy path - use speech_service directly
            audio_path = speech_service.text_to_speech(text, language_code)
        
        if audio_path and os.path.exists(audio_path):
            return send_file(audio_path, as_attachment=True, download_name='response.mp3')
        else:
            return jsonify({'error': 'Could not generate audio'}), 500
            
    except Exception as e:
        logger.error(f"Error in text-to-speech: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@voice_bp.route('/static_audio/<prompt_type>/<language>')
def get_static_audio(prompt_type, language):
    """Get pre-generated static audio prompts"""
    try:
        # Map language variations
        language_map = {
            'hindi': 'hi',
            'bengali': 'bn',
            'tamil': 'ta',
            'telugu': 'te',
            'gujarati': 'gu',
            'marathi': 'mr'
        }
        
        # Convert full language name to abbreviation if needed
        lang_code = language_map.get(language.lower(), language.lower())
        
        # Check if static audio already exists with abbreviation
        filename = f"static_{prompt_type}_{lang_code}.mp3"
        audio_path = os.path.join('static', 'audio', filename)
        
        # If not found, try with full language name
        if not os.path.exists(audio_path):
            filename = f"static_{prompt_type}_{language}.mp3"
            audio_path = os.path.join('static', 'audio', filename)
        
        # If file exists, serve it
        if os.path.exists(audio_path):
            return send_file(audio_path, mimetype='audio/mpeg')
        
        # File doesn't exist - try to get text and generate it
        prompts = Config.LANGUAGE_PROMPTS.get(prompt_type, {})
        text = prompts.get(language) or prompts.get(lang_code)
        
        if text:
            # Generate static audio on the fly
            audio_path = speech_service.create_static_audio(text, lang_code, filename)
            if audio_path and os.path.exists(audio_path):
                return send_file(audio_path, mimetype='audio/mpeg')
        
        # If all else fails, return error
        logger.error(f"Static audio not found: {prompt_type}/{language} (tried: {filename})")
        return jsonify({'error': f'Static audio not found: {prompt_type}/{language}'}), 404
            
    except Exception as e:
        logger.error(f"Error getting static audio: {e}")
        return jsonify({'error': 'Internal server error'}), 500