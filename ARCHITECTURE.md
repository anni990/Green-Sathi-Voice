# Green Sathi Voice Bot - Complete Architecture Documentation

## 🏗️ High-Level System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[Web Interface<br/>HTML/CSS/JS]
        WA[Web Audio API<br/>MediaRecorder]
        KB[Keyboard Shortcuts<br/>Enter/Backspace]
    end
    
    subgraph "Flask Application Layer"
        APP[Flask App<br/>app.py]
        VR[Voice Routes<br/>/api/voice/*]
        UR[User Routes<br/>/api/user/*]
        AR[Admin Routes<br/>/admin/*]
    end
    
    subgraph "Service Layer"
        SS[Speech Service<br/>STT/TTS]
        GS[Gemini Service<br/>AI Processing]
        AS[Admin Service<br/>Authentication]
    end
    
    subgraph "External APIs"
        GOOGLE[Google STT/TTS<br/>APIs]
        GEMINI[Google Gemini<br/>2.0-flash AI]
    end
    
    subgraph "Database Layer"
        DB[(MongoDB<br/>Database)]
        USERS[Users Collection]
        CONV[Conversations Collection]
    end
    
    subgraph "File System"
        TEMP[temp_audio/<br/>Temporary Files]
        STATIC[static/audio/<br/>Static Prompts]
    end
    
    UI --> APP
    WA --> VR
    KB --> UI
    
    APP --> VR
    APP --> UR
    APP --> AR
    
    VR --> SS
    VR --> GS
    UR --> DB
    AR --> AS
    
    SS --> GOOGLE
    GS --> GEMINI
    
    SS --> TEMP
    SS --> STATIC
    
    GS --> USERS
    GS --> CONV
    USERS --> DB
    CONV --> DB
    
    classDef frontend fill:#e1f5fe
    classDef backend fill:#f3e5f5
    classDef service fill:#e8f5e8
    classDef external fill:#fff3e0
    classDef database fill:#fce4ec
    classDef storage fill:#f1f8e9
    
    class UI,WA,KB frontend
    class APP,VR,UR,AR backend
    class SS,GS,AS service
    class GOOGLE,GEMINI external
    class DB,USERS,CONV database
    class TEMP,STATIC storage
```

## 🌊 Core Data Flow

### User Voice Input → AI Response Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant VR as Voice Routes
    participant SS as Speech Service
    participant GS as Gemini Service
    participant DB as MongoDB
    participant GA as Google APIs
    
    U->>FE: Click Record / Press Enter
    FE->>FE: Start MediaRecorder
    U->>FE: Speak into microphone
    FE->>FE: Stop recording
    FE->>VR: POST /process_audio (audio blob)
    VR->>SS: process_uploaded_audio()
    SS->>GA: Google STT API
    GA-->>SS: Transcribed text
    SS-->>VR: Text result
    VR-->>FE: JSON {text: "user speech"}
    
    FE->>VR: POST /generate_response
    VR->>DB: get_conversation_history()
    DB-->>VR: Previous conversations
    VR->>GS: generate_response(text, language, history)
    GS->>GA: Gemini AI API
    GA-->>GS: AI response
    GS-->>VR: Generated response
    VR->>DB: create_conversation()
    VR-->>FE: JSON {response: "ai answer"}
    
    FE->>VR: POST /text_to_speech
    VR->>SS: text_to_speech()
    SS->>GA: Google TTS API
    GA-->>SS: Audio file
    SS-->>VR: Audio file path
    VR-->>FE: Audio blob
    FE->>U: Play audio response
```

## 🔄 Micro-Level Component Flows

### 1. User Registration Flow

```mermaid
flowchart TD
    START([User clicks Start]) --> WELCOME[Play welcome audio]
    WELCOME --> RECORD1[Record user speech]
    RECORD1 --> STT1[Speech to Text]
    STT1 --> EXTRACT[Extract name & phone<br/>via Gemini AI]
    
    EXTRACT --> CHECK{Name & Phone<br/>extracted?}
    CHECK -->|No| RETRY[Ask to repeat]
    RETRY --> RECORD1
    
    CHECK -->|Yes| LANG_DETECT[Detect language<br/>via Gemini AI]
    LANG_DETECT --> VALIDATE{Valid Indian<br/>language?}
    
    VALIDATE -->|No| DEFAULT[Default to Hindi]
    VALIDATE -->|Yes| STORE_LANG[Store language]
    DEFAULT --> STORE_LANG
    
    STORE_LANG --> DB_SAVE[Save user to MongoDB]
    DB_SAVE --> DISPLAY[Display user info]
    DISPLAY --> CONV_START[Start conversation mode]
    
    style START fill:#e8f5e8
    style CONV_START fill:#e1f5fe
    style DB_SAVE fill:#fce4ec
```

### 2. Voice Processing Pipeline

```mermaid
flowchart LR
    subgraph "Audio Input Processing"
        MIC[Microphone] --> WEBAUDIO[Web Audio API]
        WEBAUDIO --> MEDIARECORDER[MediaRecorder]
        MEDIARECORDER --> BLOB[Audio Blob]
    end
    
    subgraph "Backend Processing"
        BLOB --> UPLOAD[File Upload]
        UPLOAD --> FORMAT[Format Conversion<br/>WAV/MP3]
        FORMAT --> STT[Google STT API<br/>with language param]
        STT --> TEXT[Transcribed Text]
    end
    
    subgraph "Language Specific"
        TEXT --> LANG_MAP{Language Mapping}
        LANG_MAP --> HINDI[hi-IN]
        LANG_MAP --> BENGALI[bn-BD]
        LANG_MAP --> TAMIL[ta-IN]
        LANG_MAP --> TELUGU[te-IN]
        LANG_MAP --> GUJARATI[gu-IN]
        LANG_MAP --> MARATHI[mr-IN]
    end
    
    style STT fill:#fff3e0
    style TEXT fill:#e8f5e8
```

### 3. AI Response Generation Flow

```mermaid
flowchart TD
    INPUT[User Text Input] --> CONTEXT[Load Conversation<br/>Context from DB]
    CONTEXT --> HISTORY[Last 5 exchanges]
    
    HISTORY --> PROMPT[Build Gemini Prompt:<br/>- Green Sathi persona<br/>- Agricultural focus<br/>- Indian language<br/>- Conversation history]
    
    PROMPT --> GEMINI[Gemini 2.0-flash API]
    GEMINI --> RESPONSE[AI Response]
    
    RESPONSE --> CLEAN[Clean Response:<br/>- Remove ** formatting<br/>- Remove symbols<br/>- Keep plain text]
    
    CLEAN --> SAVE[Save to MongoDB<br/>conversations collection]
    SAVE --> TTS[Convert to Speech<br/>Google TTS]
    TTS --> AUDIO[Audio File]
    AUDIO --> PLAY[Play to User]
    
    style GEMINI fill:#fff3e0
    style SAVE fill:#fce4ec
    style AUDIO fill:#e1f5fe
```

## 🎯 Key Code Patterns and Logic

### 1. Service Initialization Pattern

```python
# Services are instantiated as singletons in service files
# backend/services/speech_service.py
class SpeechService:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        # ... initialization logic

# Global singleton instance
speech_service = SpeechService()

# Used in routes via import
from backend.services.speech_service import speech_service
```

### 2. Language Mapping Pattern

```python
# backend/utils/config.py
class Config:
    # TTS/Display languages
    SUPPORTED_LANGUAGES = {
        'hindi': 'hi',
        'bengali': 'bn',
        'tamil': 'ta',
        'telugu': 'te',
        'gujarati': 'gu',
        'marathi': 'mr'
    }
    
    # STT languages (different codes)
    SPEECH_RECOGNITION_LANGUAGES = {
        'hindi': 'hi-IN',
        'bengali': 'bn-BD',
        'tamil': 'ta-IN',
        'telugu': 'te-IN',
        'gujarati': 'gu-IN',
        'marathi': 'mr-IN'
    }
```

### 3. Audio File Management Pattern

```python
# Temporary files for user interactions
temp_filename = f"tts_{hashlib.md5(text.encode()).hexdigest()}_{language}.mp3"
temp_path = os.path.join('temp_audio', temp_filename)

# Static files for system prompts
static_filename = f"static_{prompt_type}_{language}.mp3"
static_path = os.path.join('static', 'audio', static_filename)

# Always clean up temp files
try:
    # ... use file
finally:
    if os.path.exists(temp_path):
        os.remove(temp_path)
```

### 4. Gemini AI Integration Pattern

```python
def extract_name_phone(self, text):
    prompt = f"""
Extract the name and phone number from the following Hindi/Indian text. 
The text may have spaces or gaps in the phone number due to speech recognition.
Return the result in JSON format with keys 'name' and 'phone'.

Text: "{text}"

Important Guidelines:
- Phone numbers should be 10-11 digits total (remove spaces/gaps)
- Indian mobile numbers start with 6, 7, 8, or 9
- Join separated digits to form complete number
...
    """
    
    response = self.model.generate_content(prompt)
    
    # Parse JSON with fallback
    try:
        response_text = response.text.strip()
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0].strip()
        result = json.loads(response_text)
        return {
            'name': result.get('name'),
            'phone': self._clean_phone_number(result.get('phone'))
        }
    except json.JSONDecodeError:
        return self._extract_name_phone_fallback(text)
```

### 5. Frontend State Management Pattern

```javascript
class VoiceBotApp {
    constructor() {
        this.currentStep = 'welcome'; // State machine
        this.userInfo = {
            user_id: null,
            session_id: null,
            name: null,
            phone: null,
            language: null
        };
    }
    
    async handleTranscribedText(text) {
        switch (this.currentStep) {
            case 'name_phone':
                await this.extractUserInfo(text);
                break;
            case 'language_detection':
                await this.detectLanguage(text);
                break;
            case 'conversation':
                await this.processConversation(text);
                break;
        }
    }
}
```

### 6. MongoDB ObjectId Conversion Pattern

```python
def convert_objectids_to_strings(obj):
    """Recursively convert ObjectIds to strings for JSON serialization"""
    if isinstance(obj, dict):
        return {key: convert_objectids_to_strings(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_objectids_to_strings(item) for item in obj]
    elif isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, datetime):
        return obj.strftime('%Y-%m-%d %H:%M:%S')
    else:
        return obj
```

## 🗄️ Database Schema & Relationships

```mermaid
erDiagram
    Users ||--o{ Conversations : has
    
    Users {
        ObjectId _id PK
        string name "User's name in Hindi/local language"
        string phone "10-11 digit Indian mobile"
        string language "hindi|bengali|tamil|telugu|gujarati|marathi"
        datetime created_at
        datetime updated_at
    }
    
    Conversations {
        ObjectId _id PK
        ObjectId user_id FK
        string session_id "Optional grouping identifier"
        string user_input "Original speech-to-text"
        string bot_response "Gemini-generated response"
        datetime timestamp
    }
```

### Sample Data Patterns

```javascript
// User Document
{
  "_id": ObjectId("..."),
  "name": "राम शर्मा",
  "phone": "9876543210",
  "language": "hindi",
  "created_at": ISODate("2025-09-30T10:30:00Z"),
  "updated_at": ISODate("2025-09-30T10:30:00Z")
}

// Conversation Document
{
  "_id": ObjectId("..."),
  "user_id": ObjectId("..."),
  "session_id": "session_uuid_123",
  "user_input": "मेरी फसल में कीड़े लग रहे हैं",
  "bot_response": "आपकी फसल में कीड़ों की समस्या के लिए नीम का तेल...",
  "timestamp": ISODate("2025-09-30T10:35:00Z")
}
```

## 🚀 Development Workflows

### Essential Setup Commands (Windows PowerShell)

```powershell
# 1. Environment activation (CRITICAL!)
venv\Scripts\activate

# 2. Install dependencies
pip install flask flask-cors pymongo python-dotenv google-generativeai speechrecognition gtts pydub requests

# 3. Environment configuration
cp .env.example .env
# Edit .env with GEMINI_API_KEY, MONGODB_URL, SECRET_KEY

# 4. MongoDB startup
# Ensure MongoDB service is running on localhost:27017

# 5. Initial setup and static audio generation
python setup.py

# 6. Create test data and validate setup
python tests/quick_test.py

# 7. Start application
python app.py
```

### Testing & Validation Workflow

```powershell
# Comprehensive testing pipeline
python tests/quick_test.py                    # DB connectivity + sample data
python tests/test_admin_apis.py              # Admin endpoint validation  
python tests/admin_fixes_validation.py       # ObjectId conversion tests
python tests/run_tests.py                    # Full test suite

# Manual testing endpoints
# Access http://localhost:5000 for main app
# Access http://localhost:5000/admin (admin/123456) for admin panel
```

## 🔧 Integration Points & External Dependencies

### Google API Integrations

```mermaid
graph LR
    subgraph "Google Services"
        STT[Speech-to-Text API<br/>speech.googleapis.com]
        TTS[Text-to-Speech API<br/>texttospeech.googleapis.com]  
        GEMINI[Gemini AI API<br/>generativelanguage.googleapis.com]
    end
    
    subgraph "Application Services"
        SS[Speech Service]
        GS[Gemini Service]
    end
    
    SS --> STT
    SS --> TTS
    GS --> GEMINI
    
    STT -.->|Indian language codes<br/>hi-IN, bn-BD, etc| SS
    TTS -.->|Language codes<br/>hi, bn, ta, etc| SS
    GEMINI -.->|gemini-2.0-flash<br/>model| GS
```

### File System Architecture

```plaintext
Green-Sathi-Voice/
├── temp_audio/                 # Temporary TTS files (auto-cleanup)
│   ├── tts_hash1_hindi.mp3    # User response audio
│   └── tts_hash2_bengali.mp3  # Conversation audio
├── static/audio/               # Static system prompts
│   ├── static_welcome_hindi.mp3
│   ├── static_name_phone_bengali.mp3
│   └── static_language_selection_tamil.mp3
├── backend/
│   ├── models/database.py      # MongoDB connection & operations
│   ├── services/
│   │   ├── speech_service.py   # STT/TTS processing
│   │   ├── gemini_service.py   # AI integration
│   │   └── admin_service.py    # Authentication
│   ├── routes/                 # Flask blueprints
│   │   ├── voice_routes.py     # /api/voice/* endpoints
│   │   ├── user_routes.py      # /api/user/* endpoints
│   │   └── admin_routes.py     # /admin/* endpoints
│   └── utils/config.py         # Centralized configuration
└── static/js/app.js           # Frontend state machine
```

## 🎮 User Interaction Patterns

### Keyboard Shortcuts & Controls

```mermaid
stateDiagram-v2
    [*] --> Welcome: User loads page
    Welcome --> Recording: Enter key / Click Record
    Recording --> Processing: Auto-stop after speech
    Processing --> NamePhone: First time user
    Processing --> Conversation: Returning user
    
    NamePhone --> LanguageDetection: Valid extraction
    NamePhone --> Recording: Invalid/retry
    
    LanguageDetection --> UserDisplay: Language detected
    UserDisplay --> Conversation: Continue
    
    Conversation --> Recording: Enter key
    Conversation --> [*]: Backspace (Exit)
    
    state Recording {
        [*] --> Listening
        Listening --> Stopped: Silence detected
        Stopped --> [*]
    }
```

### Mobile WebView Optimizations

- **Audio Permissions**: Automatic microphone permission requests
- **Touch Controls**: Large button targets for mobile interaction
- **Audio Playback**: Cross-platform audio player compatibility
- **CORS Support**: Enabled for mobile app integrations
- **File Upload**: Handles audio blob uploads efficiently (max 16MB)

## 📊 Performance & Monitoring

### Admin Dashboard Capabilities

```mermaid
graph TB
    subgraph "Admin Analytics"
        STATS[User Statistics]
        CONV[Conversation Analytics]
        LANG[Language Distribution]
        DAILY[Daily Usage Trends]
    end
    
    subgraph "Data Sources"
        USERS[(Users Collection)]
        CONVERSATIONS[(Conversations Collection)]
    end
    
    subgraph "Aggregation Queries"
        TOTAL[Total Users Count]
        RECENT[Recent Users (7 days)]
        WEEKLY[Weekly Signup Trends]
        AVG[Avg Conversations/User]
    end
    
    USERS --> TOTAL
    USERS --> RECENT
    USERS --> WEEKLY
    USERS --> LANG
    
    CONVERSATIONS --> AVG
    CONVERSATIONS --> DAILY
    CONVERSATIONS --> CONV
    
    TOTAL --> STATS
    RECENT --> STATS
    WEEKLY --> STATS
    LANG --> STATS
    AVG --> CONV
    DAILY --> CONV
```

### Production Deployment Pattern

```yaml
# Deployment Configuration
Runtime: Python 3.8+
Server: gunicorn app:app
Dependencies: requirements.txt (pinned versions)
Environment Variables:
  - GEMINI_API_KEY (required)
  - MONGODB_URL (required) 
  - SECRET_KEY (required, strong)
  - DEBUG=False (production)
  - HOST=0.0.0.0
  - PORT=5000
```

## 🔍 Debugging & Troubleshooting

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Import Errors | Virtual environment not activated | `venv\Scripts\activate` |
| MongoDB Connection Failed | Service not running | Check `mongodb://localhost:27017` |
| Gemini API Errors | Invalid/missing API key | Verify `GEMINI_API_KEY` in `.env` |
| Audio Processing Fails | Browser permissions | Enable microphone access |
| ObjectId JSON Errors | Missing conversion | Use `convert_objectids_to_strings()` |
| Static Audio Missing | Setup not run | Execute `python setup.py` |

### Logging Patterns

```python
import logging
logger = logging.getLogger(__name__)

# Service operations
logger.info(f"Speech recognized: {text}")
logger.warning("Could not understand the audio")  
logger.error(f"Speech recognition service error: {e}")

# Database operations  
logger.info("Connected to MongoDB successfully")
logger.error(f"Failed to create user: {e}")

# API interactions
logger.error(f"Failed to generate response using Gemini AI: {e}")
```

This architecture documentation provides the complete technical blueprint for understanding, maintaining, and extending the Green Sathi Voice Bot system. The multilingual AI-powered voice assistant demonstrates modern web application patterns with Flask, MongoDB, and Google AI services integration.
