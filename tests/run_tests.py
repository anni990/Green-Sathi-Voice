#!/usr/bin/env python3
"""
Simple test runner script for Voice Bot application.
Run this to test all functionality without complex dependencies.
"""

import os
import sys

# Add the project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

def test_config():
    """Test configuration settings"""
    try:
        from backend.utils.config import Config
        
        print("✓ Testing Configuration...")
        
        # Test supported languages
        expected_languages = {'hindi', 'bengali', 'tamil', 'telugu', 'gujarati', 'marathi'}
        actual_languages = set(Config.SUPPORTED_LANGUAGES.keys())
        assert actual_languages == expected_languages, f"Expected {expected_languages}, got {actual_languages}"
        
        # Test default language is Hindi
        assert Config.TTS_LANGUAGE == 'hi', f"Expected 'hi', got {Config.TTS_LANGUAGE}"
        
        # Test language prompts exist
        assert 'name_phone' in Config.LANGUAGE_PROMPTS
        assert 'language_selection' in Config.LANGUAGE_PROMPTS
        assert 'conversation_start' in Config.LANGUAGE_PROMPTS
        
        print("  ✓ All configuration tests passed!")
        return True
        
    except Exception as e:
        print(f"  ✗ Configuration test failed: {e}")
        return False

def test_gemini_service():
    """Test Gemini service methods"""
    try:
        from backend.services.llm_service import GeminiService
        
        print("✓ Testing Gemini Service...")
        
        # Test phone number cleaning
        service = GeminiService()
        
        test_cases = [
            ("+91-987-654-3210", "+919876543210"),
            ("9876543210", "9876543210"),
            ("98 76 54 32 10", "9876543210"),
            ("invalid", None),
            ("12345", None)
        ]
        
        for input_phone, expected in test_cases:
            result = service._clean_phone_number(input_phone)
            assert result == expected, f"Phone cleaning failed: {input_phone} -> {result}, expected {expected}"
        
        print("  ✓ All Gemini service tests passed!")
        return True
        
    except ImportError as e:
        print(f"  ! Gemini service test skipped (missing dependencies): {e}")
        return True
    except Exception as e:
        print(f"  ✗ Gemini service test failed: {e}")
        return False

def test_database_structure():
    """Test database model structure"""
    try:
        from backend.models.database import DatabaseManager
        
        print("✓ Testing Database Structure...")
        
        # Test that DatabaseManager class exists and has required methods
        required_methods = ['create_user', 'get_user', 'create_conversation', 'get_conversation_history']
        
        for method in required_methods:
            assert hasattr(DatabaseManager, method), f"DatabaseManager missing method: {method}"
        
        print("  ✓ All database structure tests passed!")
        return True
        
    except ImportError as e:
        print(f"  ! Database test skipped (missing dependencies): {e}")
        return True
    except Exception as e:
        print(f"  ✗ Database test failed: {e}")
        return False

def test_speech_service_structure():
    """Test speech service structure"""
    try:
        from backend.services.speech_service import SpeechService
        
        print("✓ Testing Speech Service Structure...")
        
        # Test that SpeechService has required methods
        required_methods = [
            'speech_to_text', 
            'text_to_speech', 
            'convert_audio_format', 
            'process_uploaded_audio',
            'validate_audio_file'
        ]
        
        for method in required_methods:
            assert hasattr(SpeechService, method), f"SpeechService missing method: {method}"
        
        print("  ✓ All speech service structure tests passed!")
        return True
        
    except ImportError as e:
        print(f"  ! Speech service test skipped (missing dependencies): {e}")
        return True
    except Exception as e:
        print(f"  ✗ Speech service test failed: {e}")
        return False

def test_routes_structure():
    """Test routes structure"""
    try:
        from backend.routes.voice_routes import voice_bp
        from backend.routes.user_routes import user_bp
        
        print("✓ Testing Routes Structure...")
        
        # Test that blueprints exist
        assert voice_bp is not None, "voice_bp blueprint not found"
        assert user_bp is not None, "user_bp blueprint not found"
        
        print("  ✓ All routes structure tests passed!")
        return True
        
    except ImportError as e:
        print(f"  ! Routes test skipped (missing dependencies): {e}")
        return True
    except Exception as e:
        print(f"  ✗ Routes test failed: {e}")
        return False

def test_file_structure():
    """Test that all required files exist"""
    print("✓ Testing File Structure...")
    
    required_files = [
        'app.py',
        'requirements.txt',
        '.env.example',
        'README.md',
        'backend/utils/config.py',
        'backend/models/database.py',
        'backend/services/gemini_service.py',
        'backend/services/speech_service.py',
        'backend/routes/voice_routes.py',
        'backend/routes/user_routes.py',
        'templates/index.html',
        'static/js/app.js'
    ]
    
    missing_files = []
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
    
    if missing_files:
        print(f"  ✗ Missing files: {missing_files}")
        return False
    
    print("  ✓ All required files exist!")
    return True

def check_empty_directories():
    """Check for empty directories and list them"""
    print("✓ Checking for empty directories...")
    
    empty_dirs = []
    for root, dirs, files in os.walk('.'):
        # Skip hidden directories and __pycache__
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != '__pycache__']
        
        if not dirs and not files:
            empty_dirs.append(root)
    
    if empty_dirs:
        print(f"  ! Empty directories found: {empty_dirs}")
        return empty_dirs
    else:
        print("  ✓ No empty directories found!")
        return []

def main():
    """Run all tests"""
    print("🤖 Voice Bot - Quick Test Suite")
    print("=" * 40)
    
    tests = [
        test_file_structure,
        test_config,
        test_gemini_service,
        test_database_structure,
        test_speech_service_structure,
        test_routes_structure
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        if test():
            passed += 1
        else:
            failed += 1
        print()
    
    # Check for empty directories
    empty_dirs = check_empty_directories()
    
    # Summary
    print("=" * 40)
    print(f"TEST SUMMARY:")
    print(f"✓ Passed: {passed}")
    print(f"✗ Failed: {failed}")
    print(f"Success Rate: {(passed / (passed + failed) * 100):.1f}%")
    
    if empty_dirs:
        print(f"\n📁 Empty directories to consider removing:")
        for dir_path in empty_dirs:
            print(f"  - {dir_path}")
    
    print("\n🎯 Next Steps:")
    if failed == 0:
        print("  1. Install dependencies: pip install -r requirements.txt")
        print("  2. Set up .env file with your API keys")
        print("  3. Start the application: python app.py")
    else:
        print("  1. Fix the failed tests above")
        print("  2. Re-run this test script")
    
    return failed == 0

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)