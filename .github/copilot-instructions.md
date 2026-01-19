# Green Sathi Voice Bot - AI Agent Instructions

## Architecture Overview

This is a Flask-based multilingual voice assistant focused on Indian languages (Hindi, Bengali, Tamil, Telugu, Gujarati, Marathi). It uses MongoDB for data storage, **multi-LLM support** (Gemini, OpenAI, Azure, Vertex AI, Dhenu), and integrates speech-to-text/text-to-speech capabilities.

**Core Flow:** User speaks → STT → LLM extracts name/phone → Language detection → TTS response → Conversation loop

### Key Components
- **Flask App Structure**: Blueprint-based routing (`voice_routes.py`, `user_routes.py`, `admin_routes.py`)
- **Service Layer**: 
  - `llm_service.py`: Multi-provider LLM support (GeminiService, OpenAIService, AzureOpenAIService, VertexGeminiService, DhenuService)
  - `speech_service.py`: Audio processing (STT/TTS)
  - `admin_service.py`: Admin authentication and operations
- **Database**: MongoDB with `DatabaseManager` class (singleton pattern)
- **Configuration**: Centralized in `backend/utils/config.py` with language mappings
- **Frontend**: Two versions - monolithic `app.js` and modular architecture (`app_modular.js` + 7 modules)

## Critical Development Patterns

### Multi-LLM Service Architecture
Services are instantiated as singletons in `llm_service.py` and imported in route files:
```python
# In voice_routes.py
from backend.services.llm_service import gemini_service, openai_service, azure_openai_service

# Each service class (GeminiService, OpenAIService, etc.) implements:
# - extract_name_phone(text) → {"name": str, "phone": str}
# - detect_language(text) → language_name
# - generate_response(user_input, language, conversation_history) → response_text
```

**Important:** All services use the same interface. Default is Gemini (`gemini-2.0-flash` model), but any can be swapped by changing imports.

### Language Handling
```python
# Always use Config.SUPPORTED_LANGUAGES for validation
if language in Config.SUPPORTED_LANGUAGES:
    lang_code = Config.SUPPORTED_LANGUAGES[language]

# Speech recognition uses different codes than TTS
sr_lang = Config.SPEECH_RECOGNITION_LANGUAGES.get(language, 'hi-IN')
```

### ObjectId Serialization Pattern
**Critical for admin APIs:** MongoDB ObjectIds must be converted to strings for JSON responses:
```python
from bson import ObjectId
from datetime import datetime

def convert_objectids_to_strings(obj):
    """Recursively convert ObjectIds and datetimes"""
    if isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, datetime):
        return obj.strftime('%Y-%m-%d %H:%M:%S')
    # ... handle dicts/lists recursively
```
This pattern is in `admin_routes.py` and must be used for all admin API responses.

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
2. **Dependencies**: `pip install flask flask-cors pymongo python-dotenv google-generativeai speechrecognition gtts pydub requests`
3. **Environment vars**: Copy `.env.example` and configure:
   - `GEMINI_API_KEY` (default LLM) or `OPENAI_API_KEY`, `AZURE_OPENAI_API_KEY`, `DHENU_API_KEY`
   - `MONGODB_URL` (default: `mongodb://localhost:27017/`)
   - `SECRET_KEY` for Flask sessions
4. **Initial setup**: Run `python setup.py` to generate static audio files (creates `static/audio/` prompts)
5. **Sample data**: Run `python tests/quick_test.py` for test users/conversations

### Testing Commands
- **Quick test**: `python tests/quick_test.py` (creates sample users/conversations in DB)
- **API validation**: `python tests/test_admin_apis.py` (validates admin endpoints)
- **Unit tests**: `python tests/run_tests.py`
- **Admin interface**: Access `/admin` with default `admin`/`123456`

### Frontend Development
- **Modular version**: Edit `index_modular.html` + modules in `static/js/` (ElementManager, StateManager, UIController, etc.)
- **Legacy version**: Single-file `index.html` + `app.js` (still functional, but harder to maintain)
- **Module loading order matters**: See `index_modular.html` for proper dependency sequence
- **Testing modular**: Use `test_modular.js` to verify module integrations

### Debugging Common Issues
- **MongoDB connection**: Check if service is running on `localhost:27017` (`mongod --version`)
- **LLM API errors**: 
  - Gemini: Verify `GEMINI_API_KEY` in `.env` and check quotas at ai.google.dev
  - OpenAI/Azure: Check respective API keys and endpoint configurations
  - All services log to console with `logger.error()` - check terminal output
- **Audio processing**: Ensure microphone permissions in browser settings (Chrome DevTools → Application → Permissions)
- **Import errors**: Check virtual environment activation - should see `(venv)` in prompt
- **Static audio missing**: Run `python setup.py` to generate language-specific TTS files
- **ObjectId errors in admin**: Ensure `convert_objectids_to_strings()` is applied to all MongoDB query results

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
- `POST /extract_info`: Text → JSON with name/phone extraction (uses active LLM service)
- `POST /detect_language`: Text → Language detection from Indian languages only
- `POST /generate_response`: User input → LLM conversation response (context-aware)
- `POST /text_to_speech`: Text + language → Audio file (gTTS)
- `GET /static_audio/<type>/<lang>`: Predefined prompts (name_phone, language_selection, etc.)

### Admin Interface (`/admin/api/`)
- Authentication required for all admin endpoints (session-based with `admin_token`)
- **ObjectId to string conversion critical** for frontend compatibility
- Pagination using `skip` and `limit` parameters
- Available operations: user search, conversation history, analytics, password management
- Default credentials: `admin`/`123456` (change in production)

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
- **LLM Services**: 
  - **Gemini**: Uses `gemini-2.0-flash` model with structured JSON prompts (default)
  - **OpenAI**: Supports gpt-4o-mini, gpt-4o, etc. (see `llm_models.py` for full list)
  - **Azure**: Requires endpoint, API version, deployment name configuration
  - **Vertex AI**: Google Cloud-based Gemini access (requires project ID & location)
  - **Dhenu**: Indian language-optimized LLM (alternative provider)

## Frontend Architecture

### Modular Version (`index_modular.html`)
Seven specialized modules loaded in dependency order:
1. **ElementManager**: DOM reference centralization
2. **StateManager**: Flow control (welcome → name_phone → language_detection → conversation)
3. **UIController**: Status updates, animations, error display
4. **KeyboardHandler**: Accessibility (Enter to record, Backspace to exit)
5. **AudioManager**: Recording/playback with MediaRecorder API
6. **ApiService**: All API communications with error handling
7. **ConversationManager**: Message display, history, export

**Key Pattern**: Each module exposes methods to `app` namespace. Main `app_modular.js` orchestrates cross-module calls.

### Legacy Version (`index.html` + `app.js`)
Monolithic structure, same functionality. Use for simple debugging or as reference.

When working with this codebase, prioritize understanding the language flow, multi-LLM service initialization patterns, and MongoDB object handling. The application is designed for production deployment with proper error handling and logging throughout.