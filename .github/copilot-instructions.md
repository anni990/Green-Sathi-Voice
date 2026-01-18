# Green Sathi Voice Bot - AI Agent Instructions

## Architecture Overview

This is a Flask-based multilingual voice assistant focused on Indian languages (Hindi, Bengali, Tamil, Telugu, Gujarati, Marathi). It uses MongoDB for data storage, Google's Gemini AI for conversation and extraction, and integrates both Azure Speech Services and traditional speech-to-text/text-to-speech capabilities with intelligent fallbacks.

**Core Flow:** User speaks → Azure STT (fallback to traditional) → Gemini extracts name/phone → Language detection → Azure TTS (fallback to gTTS) → Conversation loop

### Key Components
- **Flask App Structure**: Blueprint-based routing (`voice_routes.py`, `user_routes.py`, `admin_routes.py`)
- **Service Layer**: `gemini_service.py` (AI interactions), `speech_service.py` (audio processing with Azure integration)
- **Database**: MongoDB with `DatabaseManager` class for user/conversation storage
- **Configuration**: Centralized in `backend/utils/config.py` with language mappings and Azure voice settings
- **Frontend Architecture**: Modular JavaScript with 8 specialized classes (ElementManager, StateManager, UIController, AudioManager, AzureSpeechManager, etc.)

## Critical Development Patterns

### Language Handling
```python
# Always use Config.SUPPORTED_LANGUAGES for validation
if language in Config.SUPPORTED_LANGUAGES:
    lang_code = Config.SUPPORTED_LANGUAGES[language]

# Speech recognition uses different codes
sr_lang = Config.SPEECH_RECOGNITION_LANGUAGES.get(language, 'hi-IN')
```

### Service Initialization
Services are instantiated as singletons in route files:
```python
from backend.services.gemini_service import gemini_service  # Pre-instantiated
from backend.models.database import db_manager  # Pre-instantiated
```

### Audio File Management
- Temp files in `temp_audio/` with UUID naming: `tts_{hash}_{language}.mp3`
- Static prompts in `static/audio/`: `static_{prompt_type}_{language}.mp3`
- Always clean up temp files after use

### Error Handling Pattern
```python
try:
    # Service operation
    result = service.method()
    return jsonify({'success': True, 'data': result})
except Exception as e:
    logger.error(f"Operation failed: {e}")
    return jsonify({'error': 'Internal server error'}), 500
```

## Essential Workflows

### Development Setup
1. **Environment**: Always activate venv first (`venv\Scripts\activate`)
2. **Dependencies**: `pip install -r requirements.txt` (includes Azure Speech SDK)
3. **Environment vars**: Copy `.env.example` and configure `GEMINI_API_KEY`, `MONGODB_URL`, `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`
4. **Initial setup**: Run `python setup.py` to generate static audio files
5. **Sample data**: Run `python tests/quick_test.py` for test data

### Testing Commands
- **Quick test**: `python tests/quick_test.py` (creates sample users/conversations)
- **API validation**: `python tests/test_admin_apis.py`
- **Unit tests**: `python tests/run_tests.py`
- **Admin interface**: Access `/admin` with `admin`/`123456`

### Debugging Common Issues
- **MongoDB connection**: Check if service is running on `localhost:27017`
- **Gemini API**: Verify `GEMINI_API_KEY` in `.env` and check quotas
- **Azure Speech**: Verify `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` in `.env`
- **Audio processing**: Ensure microphone permissions and test with different browsers
- **Import errors**: Check virtual environment activation

## Database Schema

### Users Collection
```python
{
    '_id': ObjectId,
    'name': str,           # Extracted from voice
    'phone': str,          # 10-11 digit Indian mobile
    'language': str,       # One of SUPPORTED_LANGUAGES keys
    'created_at': datetime,
    'updated_at': datetime
}
```

### Conversations Collection
```python
{
    '_id': ObjectId,
    'user_id': ObjectId,   # Reference to users
    'session_id': str,     # Optional grouping
    'user_input': str,     # Original speech-to-text
    'bot_response': str,   # Gemini-generated response
    'timestamp': datetime
}
```

## API Patterns

### Voice Processing Endpoints (`/api/voice/`)
- `POST /process_audio`: Audio file → Text (uses language param for STT)
- `POST /extract_info`: Text → JSON with name/phone extraction
- `POST /detect_language`: Text → Language detection from Indian languages only
- `POST /generate_response`: User input → Gemini conversation response
- `POST /text_to_speech`: Text + language → Audio file
- `POST /azure_speech_to_text`: Real-time Azure STT (primary method)
- `POST /azure_text_to_speech`: Azure neural TTS (primary method)
- `GET /static_audio/<type>/<lang>`: Predefined prompts (name_phone, language_selection, etc.)

### Admin Interface (`/admin/api/`)
- Authentication required for all admin endpoints
- ObjectId to string conversion critical for frontend compatibility
- Pagination using `skip` and `limit` parameters

## Language-Specific Considerations

- **Default Language**: Hindi (`hi`) is fallback for all operations
- **Phone Validation**: Indian mobiles start with 6/7/8/9, 10-11 digits total
- **Speech Recognition**: Uses `hi-IN`, `bn-BD`, etc. (different from TTS codes)
- **Static Prompts**: Pre-generated in `setup.py`, served from `static/audio/`

## Integration Points

- **Mobile WebView**: Optimized for Android/iOS with media playback permissions
- **CORS**: Enabled for all routes to support cross-origin requests
- **File Upload**: Audio files processed via `werkzeug.FileStorage`, max 16MB
- **TTS Service**: Google TTS with caching in temp directory
- **Gemini AI**: Uses `gemini-2.0-flash` model with structured JSON prompts
- **Azure Speech**: Primary speech service with 3-second silence detection and neural voices
- **Fallback System**: Automatic fallback from Azure to traditional STT/TTS when Azure unavailable

When working with this codebase, prioritize understanding the language flow, service initialization patterns, and MongoDB object handling. The application is designed for production deployment with proper error handling and logging throughout.