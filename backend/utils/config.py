import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Application configuration class"""
    
    # Flask Configuration
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
    
    # MongoDB Configuration
    MONGODB_URL = os.getenv('MONGODB_URL', 'mongodb://localhost:27017/')
    DB_NAME = os.getenv('DB_NAME', 'voicebot_db')
    
    # Gemini API Configuration
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
    
    # Vertex AI Configuration
    VERTEX_PROJECT_ID = os.getenv('VERTEX_PROJECT_ID')
    VERTEX_LOCATION = os.getenv('VERTEX_LOCATION')

    # OpenAI Configuration
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

    # Azure OpenAI Configuration
    AZURE_OPENAI_API_KEY = os.getenv('AZURE_OPENAI_API_KEY')
    AZURE_OPENAI_ENDPOINT = os.getenv('AZURE_OPENAI_ENDPOINT')
    AZURE_OPENAI_API_VERSION = os.getenv('AZURE_OPENAI_API_VERSION')
    AZURE_OPENAI_DEPLOYMENT = os.getenv('AZURE_OPENAI_DEPLOYMENT')

    # Azure Speech Services Configuration
    AZURE_SPEECH_KEY = os.getenv('AZURE_SPEECH_KEY')
    AZURE_SPEECH_REGION = os.getenv('AZURE_SPEECH_REGION', 'eastus')
    
    # Azure TTS Voice mapping for Indian languages
    AZURE_VOICES = {
        'hi-IN': 'hi-IN-SwaraNeural',
        'bn-BD': 'bn-BD-NabanitaNeural',
        'ta-IN': 'ta-IN-PallaviNeural',
        'te-IN': 'te-IN-ShrutiNeural',
        'gu-IN': 'gu-IN-DhwaniNeural',
        'mr-IN': 'mr-IN-AarohiNeural'
    }
    
    # Dhenu AI Configuration
    DHENU_API_KEY = os.getenv('DHENU_API_KEY')
    
    # Default LLM Service
    DEFAULT_LLM_SERVICE = os.getenv('DEFAULT_LLM_SERVICE', 'vertex')
    
    # Pipeline Configuration
    VALID_PIPELINE_TYPES = ['library', 'api']
    VALID_LLM_SERVICES = ['gemini', 'openai', 'azure_openai', 'vertex']
    DEFAULT_PIPELINE_TYPE = 'library'
    DEFAULT_LLM_SERVICE_TYPE = 'vertex'  # Changed from azure_openai to vertex
    
    # Device Authentication Configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    ACCESS_TOKEN_EXPIRY = int(os.getenv('ACCESS_TOKEN_EXPIRY', '3600'))  # 1 hour in seconds
    REFRESH_TOKEN_EXPIRY = int(os.getenv('REFRESH_TOKEN_EXPIRY', '86400'))  # 24 hours in seconds
    DEVICE_ID_START = int(os.getenv('DEVICE_ID_START', '1201'))  # Starting device ID
    DEFAULT_DEVICE_ID = int(os.getenv('DEFAULT_DEVICE_ID', '1200'))  # For existing data migration
    
    # Audio Configuration
    AUDIO_UPLOAD_FOLDER = os.getenv('AUDIO_UPLOAD_FOLDER', 'temp_audio')
    MAX_AUDIO_SIZE = int(os.getenv('MAX_AUDIO_SIZE', '16777216'))  # 16MB
    
    # TTS Configuration
    TTS_LANGUAGE = os.getenv('TTS_LANGUAGE', 'hi')  # Default to Hindi
    
    # Supported Indian languages for the voice bot (verified compatibility with all services)
    SUPPORTED_LANGUAGES = {
        'hindi': 'hi',
        'bengali': 'bn',
        'tamil': 'ta',
        'telugu': 'te',
        'gujarati': 'gu',
        'marathi': 'mr'
    }
    
    # Language codes for speech recognition (some use different codes)
    SPEECH_RECOGNITION_LANGUAGES = {
        'hindi': 'hi-IN',
        'bengali': 'bn-BD',
        'tamil': 'ta-IN',
        'telugu': 'te-IN',
        'gujarati': 'gu-IN',
        'marathi': 'mr-IN'
    }

    
    # Language prompts in Indian languages
    LANGUAGE_PROMPTS = {
        'name_phone': {
            'hi': "नमस्ते! हमारे वॉयस असिस्टेंट में आपका स्वागत है। कृपया मुझे अपना नाम और फोन नंबर बताएं।",
            'bn': "নমস্কার! আমাদের ভয়েস অ্যাসিস্ট্যান্টে আপনাকে স্বাগতম। দয়া করে আমাকে আপনার নাম এবং ফোন নম্বর বলুন।",
            'ta': "வணக்கம்! எங்கள் குரல் உதவியாளருக்கு உங்களை வரவேற்கிறோம். தயவுசெய்து உங்கள் பெயரையும் தொலைபேசி எண்ணையும் சொல்லுங்கள்।",
            'te': "నమస్కారం! మా వాయిస్ అసిస్టెంట్‌కు మిమ్మల్ని స్వాగతం. దయచేసి మీ పేరు మరియు ఫోన్ నంబర్ చెప్పండి।",
            'gu': "નમસ્તે! અમારા વૉઇસ આસિસ્ટન્ટમાં તમારું સ્વાગત છે. કૃપા કરીને મને તમારું નામ અને ફોન નંબર કહો।",
            'mr': "नमस्कार! आमच्या व्हॉइस असिस्टंटमध्ये तुमचे स्वागत आहे. कृपया मला तुमचे नाव आणि फोन नंबर सांगा।"
        },
        'language_selection': {
            'hi': "कृपया अपनी पसंदीदा भाषा बताएं जिसमें आप बातचीत करना चाहते हैं। आप हिंदी, बंगाली, तमिल, तेलुगु, गुजराती या मराठी में बात कर सकते हैं।"
        },
        "conversation_start": {
            "hi": "बहुत बढ़िया! आज मैं आपकी कैसे मदद कर सकती हूँ? प्रश्न पूछने के लिए Enter बटन दबाइए।",
            "bn": "খুব ভালো! আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি? প্রশ্ন করতে Enter বাটন চাপুন।",
            "ta": "மிக நல்லா! இன்று நான் உங்களுக்கு எப்படி உதவி செய்ய முடியும்? கேள்வி கேட்க Enter பொத்தானை அழுத்தவும்.",
            "te": "చాలా బాగుంది! ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను? ప్రశ్న అడగడానికి Enter బటన్ నొక్కండి.",
            "gu": "ખૂબ સરસ! આજે હું તમારી કેવી રીતે મદદ કરી શકું? પ્રશ્ન પૂછવા Enter બટન દબાવો.",
            "mr": "खूप छान! आज मी तुम्हाला कशी मदत करू शकतो? प्रश्न विचारण्यासाठी Enter बटण दाबा."
        },
        'confirm_details': {
            'hi': 'कृपया अपनी जानकारी की पुष्टि करें। यदि नाम और फ़ोन नंबर सही है तो एंटर दबाएं। नंबर गलत है तो बैकस्पेस से मिटाएं और सही नंबर दर्ज करें।'
        },
        'details_confirmed': {
            'hi': 'धन्यवाद! आपकी जानकारी प्राप्त हो गई है।'
        },
        'edit_phone_hint': {
            'hi': 'नंबर बदलने के लिए बैकस्पेस से मिटाएं और नया नंबर दर्ज करें। फिर एंटर दबाएं।'
        }
    }