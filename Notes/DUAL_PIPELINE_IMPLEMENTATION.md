# Dual Pipeline Implementation - Complete Guide

## Overview
Successfully implemented a dual pipeline system for the Green Sathi Voice Bot that allows devices to choose between two voice processing approaches:

1. **Library Pipeline** (Default): Google Speech Recognition + gTTS - Free, offline-capable, slower
2. **API Pipeline**: Azure Cognitive Services - Paid, faster, higher quality

Each device can also select from 4 LLM services: Gemini, OpenAI, Azure OpenAI, or Vertex AI.

## Architecture

### Backend Components

#### 1. Database Schema (`backend/models/database.py`)
**Changes:**
- Added `pipeline_type` field to devices collection ('library' or 'api')
- Added `llm_service` field to devices collection ('gemini', 'openai', 'azure_openai', 'vertex')
- Updated `create_device()` method to accept pipeline configuration
- Added `get_device_pipeline_config()` method to retrieve configuration
- Added `update_device_pipeline_config()` method to update configuration

#### 2. Configuration (`backend/utils/config.py`)
**Additions:**
- `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` environment variables
- `AZURE_VOICES` mapping for Indian languages (hi-IN, bn-BD, ta-IN, te-IN, gu-IN, mr-IN)
- `VALID_PIPELINE_TYPES = ['library', 'api']`
- `VALID_LLM_SERVICES = ['gemini', 'openai', 'azure_openai', 'vertex']`
- `DEFAULT_PIPELINE_TYPE = 'library'`
- `DEFAULT_LLM_SERVICE_TYPE = 'gemini'`

#### 3. Speech Service (`backend/services/speech_service.py`)
**Fix:**
- Initialized `self.azure_speech_config` in `__init__()` method
- Added proper Azure Speech Services configuration with subscription key and region
- Now properly initializes Azure when credentials are available

#### 4. Pipeline Infrastructure (`backend/services/pipelines/`)

**a) `base_pipeline.py`**
- Abstract base class defining pipeline interface
- Methods: `speech_to_text()`, `text_to_speech()`, `extract_name_phone()`, `detect_language()`, `generate_response()`
- All methods delegate to LLM service for consistency

**b) `library_pipeline.py`**
- Implements LibraryPipeline using Google Speech Recognition and gTTS
- Free, works offline, slower processing
- Handles audio conversion (MP3/WAV) automatically
- Uses `speech_recognition` library for STT
- Uses `gTTS` for TTS

**c) `api_pipeline.py`**
- Implements APIPipeline using Azure Cognitive Services
- Requires `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`
- Fast, high-quality, paid service
- Uses Azure Speech SDK for both STT and TTS
- Supports Indian language voices (neural voices)

#### 5. Pipeline Service (`backend/services/pipeline_service.py`)
**Orchestrator:**
- Routes requests to appropriate pipeline based on device configuration
- Caches pipeline instances per device for performance
- Methods:
  - `get_pipeline(device_id)` - Returns device-specific pipeline
  - `clear_pipeline_cache(device_id)` - Clears cache when config changes
  - `speech_to_text(device_id, audio_data, language)`
  - `text_to_speech(device_id, text, language, output_path)`
  - `extract_name_phone(device_id, text)`
  - `detect_language(device_id, text)`
  - `generate_response(device_id, user_input, language, history)`
  - `get_device_config_info(device_id)` - Returns config details

#### 6. Device Routes (`backend/routes/device_routes.py`)
**New Endpoints:**
- `GET /api/device/config` - Get current device pipeline configuration (requires auth)
- `PUT /api/device/config` - Update device pipeline configuration (requires auth)
- `GET /api/device/available_options` - Get valid pipeline types and LLM services (public)
- `GET /settings` - Render device settings page

**Updated:**
- `POST /api/device/register` - Now accepts `pipeline_type` and `llm_service` parameters
- Validates pipeline configuration against `VALID_PIPELINE_TYPES` and `VALID_LLM_SERVICES`

#### 7. Voice Routes (`backend/routes/voice_routes.py`)
**Updated all endpoints to use pipeline_service:**
- `POST /process_audio` - Now uses device-specific STT pipeline
- `POST /extract_info` - Uses device-specific LLM
- `POST /detect_language` - Uses device-specific LLM
- `POST /generate_response` - Uses device-specific LLM (already had device_id from auth)
- `POST /text_to_speech` - Uses device-specific TTS pipeline

**Backward Compatibility:**
- All endpoints support legacy calls without device_id
- Falls back to default LLM service when device_id not provided
- Maintains existing speech_service for non-authenticated requests

#### 8. Device Auth Service (`backend/services/device_auth_service.py`)
**Updated:**
- `register_device()` method now accepts `pipeline_type` and `llm_service` parameters
- Returns pipeline configuration in response
- Logs device registration with pipeline details

### Frontend Components

#### 1. Device Registration (`templates/device_register.html`)
**Additions:**
- Pipeline Type dropdown (Library/API)
- LLM Service dropdown (Gemini/OpenAI/Azure OpenAI/Vertex AI)
- Descriptions for each option
- Form submission includes `pipeline_type` and `llm_service` fields

**UI:**
- Responsive selectors with icons
- Real-time descriptions (Free vs Paid, Offline vs Online)
- Validation of selections before submission

#### 2. Device Settings (`templates/device_settings.html`)
**New Page:**
- Displays current device information (ID, Name)
- Pipeline Type selector with descriptions
- LLM Service selector with descriptions
- Save button to update configuration
- Success/Error messages
- Loading overlay during updates
- Back button to landing page

**Features:**
- Fetches current configuration on load
- Updates local storage and backend on save
- Real-time description updates on selection change
- Protected route (requires authentication)

#### 3. DeviceAuthManager (`static/js/DeviceAuthManager.js`)
**Additions:**
- `pipelineType` and `llmService` properties
- Updated `loadFromStorage()` to load pipeline config
- Updated `saveToStorage()` to save pipeline config
- Updated `clearStorage()` to remove pipeline config
- Updated `getDeviceInfo()` to include pipeline config

**New Methods:**
- `fetchPipelineConfig()` - Fetches config from backend and updates localStorage
- `updatePipelineConfig(pipelineType, llmService)` - Updates config in backend and localStorage
- `getAvailableOptions()` - Fetches valid pipeline types and LLM services

## Usage Flow

### 1. Device Registration
```
User fills form → Selects pipeline type → Selects LLM service → Submits
↓
Backend validates → Creates device with pipeline config → Returns tokens
↓
Frontend saves tokens + pipeline config to localStorage → Redirects to login
```

### 2. Voice Processing
```
User speaks → Audio captured → Sent to /process_audio with device_id
↓
pipeline_service.get_pipeline(device_id) → Fetches device config from DB
↓
Returns LibraryPipeline or APIPipeline based on pipeline_type
↓
Calls pipeline.speech_to_text(audio, language) → Google STT or Azure STT
↓
Returns recognized text to frontend
```

### 3. LLM Processing
```
User input → Sent to /generate_response with device_id (from auth token)
↓
pipeline_service.get_pipeline(device_id) → Fetches device config
↓
Pipeline uses configured LLM service (Gemini/OpenAI/Azure/Vertex)
↓
Calls llm_service.generate_response() → Returns AI response
```

### 4. TTS Generation
```
AI response text → Sent to /text_to_speech with device_id
↓
pipeline_service.get_pipeline(device_id) → Fetches device config
↓
Calls pipeline.text_to_speech(text, language) → gTTS or Azure TTS
↓
Returns audio file path → Frontend plays audio
```

### 5. Configuration Management
```
User visits /settings → Loads current config from backend
↓
User changes pipeline type or LLM service → Clicks Save
↓
DeviceAuthManager.updatePipelineConfig() → PUT /api/device/config
↓
Backend updates DB → Clears pipeline cache → Returns success
↓
Frontend updates localStorage → Shows success message
```

## Environment Variables Required

### Existing (No Change)
- `MONGODB_URL` - MongoDB connection string
- `GEMINI_API_KEY` - Google Gemini API key
- `OPENAI_API_KEY` - OpenAI API key (optional)
- `AZURE_OPENAI_API_KEY` - Azure OpenAI key (optional)
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint (optional)

### New for Dual Pipeline
- `AZURE_SPEECH_KEY` - Azure Speech Services subscription key (required for API pipeline)
- `AZURE_SPEECH_REGION` - Azure region (e.g., 'eastus', 'westus') (required for API pipeline)

## Testing Checklist

### Backend Testing
- [ ] Test device registration with library pipeline + gemini
- [ ] Test device registration with api pipeline + azure_openai
- [ ] Test voice processing routes with device_id parameter
- [ ] Test voice processing routes without device_id (backward compatibility)
- [ ] Test pipeline configuration fetch endpoint
- [ ] Test pipeline configuration update endpoint
- [ ] Verify pipeline cache clearing on config update
- [ ] Test Azure Speech Services initialization (with and without credentials)

### Frontend Testing
- [ ] Test registration form with all pipeline/LLM combinations
- [ ] Test settings page loads current configuration
- [ ] Test settings page updates configuration
- [ ] Test DeviceAuthManager localStorage persistence
- [ ] Test backward compatibility (existing devices without pipeline config)
- [ ] Test error handling for invalid configurations

### Integration Testing
- [ ] Register device with library pipeline → Test voice conversation flow
- [ ] Register device with API pipeline → Test voice conversation flow
- [ ] Switch device from library to API pipeline → Test voice flow changes
- [ ] Test multiple devices with different configurations simultaneously
- [ ] Verify data isolation per device

### Performance Testing
- [ ] Compare latency: Library STT vs Azure STT
- [ ] Compare latency: gTTS vs Azure TTS
- [ ] Measure pipeline cache hit rate
- [ ] Test concurrent requests with different pipelines

## Migration Plan for Existing Devices

### Option 1: Auto-assign defaults
Run update query:
```python
db.devices.update_many(
    {"pipeline_type": {"$exists": False}},
    {"$set": {"pipeline_type": "library", "llm_service": "gemini"}}
)
```

### Option 2: Prompt users to configure
- Show settings page on first login after update
- Force configuration selection before allowing voice bot usage
- Provide recommendations based on connectivity/budget

## Cost Considerations

### Library Pipeline (Free)
- Google Speech Recognition: Free (web service)
- gTTS: Free (Google TTS web service)
- Limitations: Rate limits, slower processing, requires internet

### API Pipeline (Paid)
- Azure Speech Services: ~$1 per hour of audio (STT)
- Azure TTS: ~$4 per 1M characters
- Benefits: Faster, higher quality, neural voices, enterprise SLA

### LLM Services (All Paid)
- Gemini: ~$0.15 per 1M tokens (2.0-flash model)
- OpenAI: ~$0.15 per 1M tokens (gpt-4o-mini)
- Azure OpenAI: Similar to OpenAI pricing
- Vertex AI: Similar to Gemini pricing

## Troubleshooting

### Azure Speech Services Not Working
1. Check `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` in .env
2. Verify Azure subscription is active
3. Check region name is correct (e.g., 'eastus', not 'East US')
4. Check logs for Azure SDK initialization errors

### Pipeline Cache Not Clearing
1. Manually clear: `pipeline_service.clear_pipeline_cache(device_id)`
2. Check if update endpoint is calling `clear_pipeline_cache()`
3. Restart Flask server to clear all caches

### Backward Compatibility Issues
1. Check if device_id is properly passed in API requests
2. Verify fallback to default LLM service when device_id is None
3. Test with old clients that don't send device_id parameter

### LLM Service Not Working
1. Check API keys in .env
2. Verify LLM service name matches VALID_LLM_SERVICES
3. Check logs for LLM initialization errors
4. Test with default gemini service first

## Future Enhancements

1. **Hybrid Pipeline**: Start with library, switch to API when Azure credits available
2. **Cost Tracking**: Log API usage per device for billing
3. **Quality Metrics**: Compare transcription accuracy between pipelines
4. **Admin Dashboard**: View pipeline usage statistics across all devices
5. **Pipeline Recommendations**: Suggest optimal pipeline based on usage patterns
6. **Offline Mode**: Detect connectivity and auto-switch to library pipeline
7. **Custom Voices**: Support custom Azure neural voices
8. **Language-specific Pipelines**: Different pipelines for different languages
9. **A/B Testing**: Randomly assign pipelines to measure satisfaction
10. **Pipeline Health Monitoring**: Alert when API services are down

## Files Modified/Created

### Backend
- Modified: `backend/models/database.py`
- Modified: `backend/utils/config.py`
- Modified: `backend/services/speech_service.py`
- Modified: `backend/services/device_auth_service.py`
- Modified: `backend/routes/device_routes.py`
- Modified: `backend/routes/voice_routes.py`
- Created: `backend/services/pipeline_service.py`
- Created: `backend/services/pipelines/__init__.py`
- Created: `backend/services/pipelines/base_pipeline.py`
- Created: `backend/services/pipelines/library_pipeline.py`
- Created: `backend/services/pipelines/api_pipeline.py`

### Frontend
- Modified: `templates/device_register.html`
- Modified: `static/js/DeviceAuthManager.js`
- Created: `templates/device_settings.html`

### Documentation
- Created: `Notes/DUAL_PIPELINE_IMPLEMENTATION.md` (this file)

## Dependencies

### Already Installed
- flask
- pymongo
- speech_recognition
- gtts
- pydub
- azure-cognitiveservices-speech

### No New Dependencies Required
All required packages already in `requirements.txt`

## Deployment Checklist

- [ ] Update .env with Azure credentials
- [ ] Run migration script to add pipeline config to existing devices
- [ ] Test all voice routes with device authentication
- [ ] Verify Azure Speech Services billing is set up
- [ ] Update API documentation with new endpoints
- [ ] Train users on settings page and pipeline options
- [ ] Set up monitoring for API usage and costs
- [ ] Configure alerts for Azure quota limits
- [ ] Test rollback plan if issues occur
- [ ] Update admin dashboard to show pipeline distribution

## Success Metrics

- Pipeline instantiation time < 500ms
- STT latency (library): 2-5 seconds
- STT latency (API): 0.5-2 seconds
- TTS latency (library): 1-3 seconds
- TTS latency (API): 0.5-1.5 seconds
- Zero errors on pipeline switching
- 100% backward compatibility maintained
- Cache hit rate > 80% for repeated device requests

## Implementation Complete ✓

All 12 tasks completed successfully:
1. ✓ Database schema updated with pipeline fields
2. ✓ Pipeline config methods added to database.py
3. ✓ Azure Speech Service initialization fixed
4. ✓ Base pipeline and LibraryPipeline created
5. ✓ APIPipeline with Azure integration created
6. ✓ PipelineService orchestrator created
7. ✓ Device routes updated with config endpoints
8. ✓ Voice routes updated for pipeline routing
9. ✓ Registration page updated with pipeline selectors
10. ✓ DeviceAuthManager updated for pipeline config
11. ✓ Device settings page created
12. ✓ Config updated with pipeline constants

**Status**: Ready for testing and deployment
**Next Steps**: Run tests, configure Azure credentials, deploy to staging environment
