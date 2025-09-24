from flask import Blueprint, request, jsonify, send_file
import os
import uuid
import logging
from backend.services.speech_service import speech_service
from backend.services.gemini_service import gemini_service
from backend.models.database import db_manager
from backend.utils.config import Config

logger = logging.getLogger(__name__)
voice_bp = Blueprint('voice', __name__)

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
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}_{audio_file.filename}"
        
        # Process audio to text with proper language support
        text = speech_service.process_uploaded_audio(audio_file.read(), filename, language)
        
        if text:
            return jsonify({'text': text})
        else:
            return jsonify({'error': 'Could not process audio'}), 400
            
    except Exception as e:
        logger.error(f"Error processing audio: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@voice_bp.route('/extract_info', methods=['POST'])
def extract_user_info():
    """Extract name and phone number from text"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Extract name and phone using Gemini
        info = gemini_service.extract_name_phone(text)
        
        return jsonify(info)
        
    except Exception as e:
        logger.error(f"Error extracting user info: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@voice_bp.route('/detect_language', methods=['POST'])
def detect_language():
    """Detect language from user input"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Detect language using Gemini
        language = gemini_service.detect_language(text)
        
        return jsonify({'language': language})
        
    except Exception as e:
        logger.error(f"Error detecting language: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@voice_bp.route('/generate_response', methods=['POST'])
def generate_response():
    """Generate AI response to user input"""
    try:
        data = request.get_json()
        user_input = data.get('text', '')
        language = data.get('language', 'hindi')
        user_id = data.get('user_id')
        session_id = data.get('session_id')
        
        if not user_input:
            return jsonify({'error': 'No text provided'}), 400
        
        # Get conversation history if user_id provided
        conversation_history = None
        if user_id:
            conversation_history = db_manager.get_conversation_history(user_id, session_id, limit=10)
        
        # Generate response using Gemini
        language_code = Config.SUPPORTED_LANGUAGES.get(language, 'hi')
        response = gemini_service.generate_response(user_input, language, conversation_history)
        
        response = response.replace("*", "")

        # Save conversation to database if user_id provided
        if user_id and response:
            db_manager.create_conversation(user_id, user_input, response, session_id)
        
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
        language = data.get('language', 'english')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Convert language name to code
        language_code = Config.SUPPORTED_LANGUAGES.get(language, 'en')
        
        # Generate TTS audio
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
        # Get text for the prompt type and language
        prompts = Config.LANGUAGE_PROMPTS.get(prompt_type, {})
        text = prompts.get(language)
        
        if not text:
            return jsonify({'error': 'Prompt not found'}), 404
        
        # Check if static audio already exists
        filename = f"static_{prompt_type}_{language}.mp3"
        audio_path = os.path.join('static', 'audio', filename)
        
        if not os.path.exists(audio_path):
            # Generate static audio
            audio_path = speech_service.create_static_audio(text, language, filename)
        
        if audio_path and os.path.exists(audio_path):
            return send_file(audio_path, as_attachment=True, download_name=f'{prompt_type}_{language}.mp3')
        else:
            return jsonify({'error': 'Could not generate static audio'}), 500
            
    except Exception as e:
        logger.error(f"Error getting static audio: {e}")
        return jsonify({'error': 'Internal server error'}), 500