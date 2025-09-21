# 🤖 Voice Bot Assistant

A multilingual voice-powered conversational AI assistant built with Flask, MongoDB, and Gemini AI. The bot can interact with users in multiple languages, extract user information from voice input, and maintain conversations.

## 🚀 Features

- **Multilingual Support**: English, Hindi, Spanish, French, German, Chinese, Japanese, Korean
- **Voice Interaction**: Speech-to-Text (STT) and Text-to-Speech (TTS)
- **Smart Information Extraction**: Uses Gemini AI to extract names and phone numbers
- **Language Detection**: Automatically detects user's preferred language
- **Conversation Memory**: Stores conversation history in MongoDB
- **Mobile-Responsive UI**: Optimized for mobile web view with Tailwind CSS
- **Real-time Animations**: Visual feedback for listening and speaking states

## 🏗️ Architecture

```
Voice Bot/
├── app.py                      # Main Flask application
├── requirements.txt            # Python dependencies
├── .env.example               # Environment variables template
├── setup.py                   # Setup and initialization script
├── backend/
│   ├── models/
│   │   └── database.py        # MongoDB models and operations
│   ├── services/
│   │   ├── gemini_service.py  # Gemini AI integration
│   │   └── speech_service.py  # STT/TTS services
│   ├── routes/
│   │   ├── voice_routes.py    # Voice processing endpoints
│   │   └── user_routes.py     # User management endpoints
│   └── utils/
│       └── config.py          # Configuration and settings
├── templates/
│   └── index.html             # Main web interface
├── static/
│   ├── js/
│   │   └── app.js             # Frontend JavaScript
│   ├── css/                   # Custom CSS (if needed)
│   └── audio/                 # Static audio prompts
└── temp_audio/               # Temporary audio files
```

## 📋 Prerequisites

- Python 3.8+
- MongoDB (local or Atlas)
- Gemini API key from Google AI Studio
- Microphone access in browser

## 🔧 Installation

1. **Clone or download the project files**

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configurations:
   ```env
   # MongoDB Configuration
   MONGODB_URL=mongodb://localhost:27017/
   DB_NAME=voicebot_db
   
   # Gemini API Configuration
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Flask Configuration
   SECRET_KEY=your_secret_key_here
   DEBUG=True
   HOST=0.0.0.0
   PORT=5000
   ```

4. **Run setup script** (optional - generates static audio files):
   ```bash
   python setup.py
   ```

5. **Start the application**:
   ```bash
   python app.py
   ```

6. **Access the application**:
   Open your browser and navigate to `http://localhost:5000`

## 🎯 Usage Workflow

### 1. Initial Setup
- User clicks "Start Conversation"
- System plays welcome audio asking for name and phone number

### 2. Information Collection
- User speaks their name and phone number
- Gemini AI extracts structured data (name, phone)
- System asks for preferred language (in Hindi)

### 3. Language Detection
- User responds in their preferred language
- System detects the language automatically
- User information is saved to MongoDB

### 4. Conversation Mode
- System greets user in their preferred language
- Continuous voice conversation begins
- All exchanges are saved to database

## 🗣️ Supported Languages

| Language | Code | TTS Support |
|----------|------|-------------|
| English  | en   | ✅          |
| Hindi    | hi   | ✅          |
| Spanish  | es   | ✅          |
| French   | fr   | ✅          |
| German   | de   | ✅          |
| Chinese  | zh   | ✅          |
| Japanese | ja   | ✅          |
| Korean   | ko   | ✅          |

## 🌐 API Endpoints

### Voice Processing
- `POST /api/voice/process_audio` - Convert audio to text
- `POST /api/voice/extract_info` - Extract name and phone from text
- `POST /api/voice/detect_language` - Detect language from text
- `POST /api/voice/generate_response` - Generate AI response
- `POST /api/voice/text_to_speech` - Convert text to speech
- `GET /api/voice/static_audio/<prompt_type>/<language>` - Get static prompts

### User Management
- `POST /api/user/register` - Register new user
- `GET /api/user/profile/<phone>` - Get user profile
- `GET /api/user/conversation_history/<user_id>` - Get conversation history
- `POST /api/user/session/<user_id>` - Create new session

## 🔧 Configuration

### MongoDB Setup
1. **Local MongoDB**:
   ```bash
   # Install MongoDB Community Edition
   # Start MongoDB service
   mongod --dbpath /path/to/data
   ```

2. **MongoDB Atlas** (Cloud):
   - Create account at mongodb.com
   - Create cluster and get connection string
   - Update `MONGODB_URL` in `.env`

### Gemini API Setup
1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Create API key
3. Add key to `.env` file as `GEMINI_API_KEY`

## 📱 Mobile Integration

The web interface is optimized for mobile WebView integration:

- Responsive design with Tailwind CSS
- Touch-friendly buttons and controls
- Optimized for portrait orientation
- Minimal bandwidth usage
- Offline-capable static assets

### Android WebView Integration
```java
WebView webView = findViewById(R.id.webview);
WebSettings webSettings = webView.getSettings();
webSettings.setJavaScriptEnabled(true);
webSettings.setMediaPlaybackRequiresUserGesture(false);
webView.loadUrl("http://your-server:5000");
```

### iOS WebView Integration
```swift
let webView = WKWebView()
let configuration = webView.configuration
configuration.allowsInlineMediaPlayback = true
configuration.mediaTypesRequiringUserActionForPlayback = []
```

## 🔒 Security Considerations

- **API Keys**: Store securely in environment variables
- **CORS**: Configure for production domains
- **Rate Limiting**: Implement for API endpoints
- **Input Validation**: Validate all user inputs
- **Audio Files**: Clean up temporary files regularly

## 🐛 Troubleshooting

### Common Issues

1. **Microphone Permission Denied**:
   - Ensure HTTPS in production
   - Check browser permissions
   - Test in different browsers

2. **MongoDB Connection Failed**:
   ```bash
   # Check MongoDB is running
   mongod --version
   # Check connection string in .env
   ```

3. **Gemini API Errors**:
   - Verify API key is valid
   - Check API quotas and limits
   - Ensure internet connectivity

4. **Audio Processing Issues**:
   - Check browser audio support
   - Verify microphone hardware
   - Test with different audio formats

5. **TTS Not Working**:
   - Verify gTTS installation
   - Check internet connection
   - Test with different languages

## 🎨 Customization

### Adding New Languages
1. Update `SUPPORTED_LANGUAGES` in `config.py`
2. Add prompts to `LANGUAGE_PROMPTS`
3. Test TTS support for the language
4. Run setup script to generate audio files

### Modifying UI
- Edit `templates/index.html` for layout changes
- Modify `static/js/app.js` for functionality
- Customize CSS in the HTML `<style>` section

### Extending Functionality
- Add new routes in `backend/routes/`
- Create additional services in `backend/services/`
- Modify database schema in `backend/models/`

## 📊 Performance Optimization

- **Audio Compression**: Use compressed audio formats
- **Caching**: Implement Redis for session data
- **CDN**: Serve static assets via CDN
- **Database Indexing**: Add indexes for frequent queries
- **Connection Pooling**: Configure MongoDB connection pooling

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check troubleshooting section
2. Review logs for error details
3. Test with minimal configuration
4. Create issue with reproduction steps

---

**Happy Voice Bot Building! 🎉**