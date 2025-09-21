# Voice Bot Assistant - AI Coding Guidelines

## Architecture Overview

This is a multilingual Flask voice bot with three-layer architecture:
- **Frontend**: Single-page app (`templates/index.html` + `static/js/app.js`) handling audio recording/playback
- **Backend**: Flask app with Blueprint-based routing (`backend/routes/`) and service layer (`backend/services/`)  
- **Storage**: MongoDB for conversation history + temp file system for audio processing

Key workflow: Audio upload → STT → Gemini AI processing → TTS → Response delivery

## Critical Components

### Service Layer Pattern
Services are singleton classes accessed via module-level instances:
```python
# backend/services/gemini_service.py
gemini_service = GeminiService()  # Module-level singleton
```

**GeminiService** (`backend/services/gemini_service.py`):
- Uses Gemini 2.0 Flash model for NLP tasks
- Primary method: `extract_name_phone()` with structured JSON prompts
- Language detection limited to 6 Indian languages only
- Has fallback regex extraction when JSON parsing fails

**SpeechService** (`backend/services/speech_service.py`):
- Uses Google Speech Recognition API + gTTS
- Audio preprocessing: converts to mono, 16kHz, 16-bit PCM WAV
- Language mapping: `Config.SPEECH_RECOGNITION_LANGUAGES` (e.g., 'hindi' → 'hi-IN')

### Configuration System
All settings centralized in `backend/utils/config.py`:
- **Language Support**: Exactly 6 Indian languages with separate TTS/STT codes
- **Audio Settings**: 16MB limit, temp_audio/ folder for processing
- **Prompts**: Multi-language static prompts in `Config.LANGUAGE_PROMPTS`

### Blueprint Structure
Routes organized by domain:
- `voice_bp` (`/api/voice/*`): Audio processing, info extraction, TTS generation
- `user_bp` (`/api/user/*`): User management, conversation history

## Development Patterns

### Error Handling Convention
All routes use try/catch with structured JSON responses:
```python
try:
    # Business logic
    return jsonify({'success': True, 'data': result})
except Exception as e:
    logger.error(f"Error in {endpoint}: {e}")
    return jsonify({'error': 'Internal server error'}), 500
```

### Audio File Management
- Unique filenames: `f"{uuid.uuid4()}_{original_name}"`
- Automatic cleanup: Files stored in `temp_audio/` (not persistent)
- Format standardization: All audio converted to 16kHz mono WAV for processing

### Language Handling
- **Input**: User text → language detection → service calls
- **Mapping**: Three-level language codes (display name → TTS code → STT code)
- **Fallback**: Unknown languages default to Hindi in all services

## Testing Strategy

### Test Structure
- `run_tests.py`: Simple integration tests without external dependencies
- `tests/test_voice_bot.py`: Full unit tests with mocking for API calls
- Mock pattern: Always mock `google.generativeai` to avoid API costs

### Key Test Areas
- Phone number extraction and cleaning (Indian mobile format validation)
- Language detection with fallback to Hindi
- Service initialization and configuration validation

## Essential Commands

**Development**:
```bash
python app.py          # Start dev server
python run_tests.py    # Run simple integration tests
python setup.py        # Generate static audio files
```

**Testing**:
```bash
python -m pytest tests/  # Full test suite with mocking
```

## Integration Points

### External Dependencies
- **Google Gemini AI**: Text analysis, extraction, language detection
- **Google Speech Recognition**: STT processing 
- **gTTS**: Text-to-speech generation
- **MongoDB**: User data and conversation persistence

### API Endpoints Flow
1. `/api/voice/process_audio` → STT conversion
2. `/api/voice/extract_info` → Gemini NLP processing  
3. `/api/voice/generate_response` → Gemini conversation + TTS
4. `/api/user/*` → MongoDB operations

## Mobile-First Considerations
- WebRTC audio recording in browser
- Touch-optimized UI with visual state feedback
- Responsive design using Tailwind CSS
- Static audio fallbacks for system prompts