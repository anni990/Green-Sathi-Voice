#!/usr/bin/env python3
"""
Test cases for Voice Bot application.
Tests all services, routes, and functionality.
"""

import unittest
import sys
import os
import tempfile
import json
from unittest.mock import Mock, patch, MagicMock
import io

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.utils.config import Config
from backend.services.llm_service import GeminiService
from backend.models.database import DatabaseManager

class TestConfig(unittest.TestCase):
    """Test configuration settings"""
    
    def test_supported_languages(self):
        """Test that all supported languages are Indian languages"""
        expected_languages = {'hindi', 'bengali', 'tamil', 'telugu', 'gujarati', 'marathi'}
        self.assertEqual(set(Config.SUPPORTED_LANGUAGES.keys()), expected_languages)
    
    def test_language_codes(self):
        """Test that all supported languages have proper codes"""
        for lang, code in Config.SUPPORTED_LANGUAGES.items():
            self.assertIsInstance(code, str)
            self.assertTrue(len(code) >= 2)
    
    def test_speech_recognition_languages(self):
        """Test that speech recognition languages match supported languages"""
        self.assertEqual(
            set(Config.SUPPORTED_LANGUAGES.keys()), 
            set(Config.SPEECH_RECOGNITION_LANGUAGES.keys())
        )
    
    def test_language_prompts_exist(self):
        """Test that language prompts exist for all prompt types"""
        self.assertIn('name_phone', Config.LANGUAGE_PROMPTS)
        self.assertIn('language_selection', Config.LANGUAGE_PROMPTS)
        self.assertIn('conversation_start', Config.LANGUAGE_PROMPTS)
    
    def test_hindi_default_language(self):
        """Test that Hindi is the default TTS language"""
        self.assertEqual(Config.TTS_LANGUAGE, 'hi')


class TestGeminiService(unittest.TestCase):
    """Test Gemini AI service"""
    
    def setUp(self):
        """Set up test fixtures"""
        # Mock the Gemini API to avoid actual API calls during tests
        with patch('google.generativeai.configure'):
            with patch('google.generativeai.GenerativeModel'):
                self.gemini_service = GeminiService()
    
    @patch('backend.services.gemini_service.genai.GenerativeModel')
    def test_extract_name_phone_success(self, mock_model):
        """Test successful name and phone extraction"""
        # Mock response
        mock_response = Mock()
        mock_response.text = '{"name": "राहुल शर्मा", "phone": "+919876543210"}'
        mock_model.return_value.generate_content.return_value = mock_response
        
        result = self.gemini_service.extract_name_phone("मेरा नाम राहुल शर्मा है और मेरा फोन नंबर 9876543210 है")
        
        self.assertIsInstance(result, dict)
        self.assertIn('name', result)
        self.assertIn('phone', result)
    
    @patch('backend.services.gemini_service.genai.GenerativeModel')
    def test_detect_language_hindi(self, mock_model):
        """Test Hindi language detection"""
        # Mock response
        mock_response = Mock()
        mock_response.text = 'hindi'
        mock_model.return_value.generate_content.return_value = mock_response
        
        result = self.gemini_service.detect_language("मैं हिंदी में बात करना चाहता हूँ")
        
        self.assertEqual(result, 'hindi')
    
    @patch('backend.services.gemini_service.genai.GenerativeModel')
    def test_detect_language_default_to_hindi(self, mock_model):
        """Test that unknown languages default to Hindi"""
        # Mock response with unsupported language
        mock_response = Mock()
        mock_response.text = 'english'
        mock_model.return_value.generate_content.return_value = mock_response
        
        result = self.gemini_service.detect_language("Hello, how are you?")
        
        self.assertEqual(result, 'hindi')
    
    @patch('backend.services.gemini_service.genai.GenerativeModel')
    def test_generate_response(self, mock_model):
        """Test response generation"""
        # Mock response
        mock_response = Mock()
        mock_response.text = 'आपका स्वागत है! मैं आपकी कैसे सहायता कर सकता हूँ?'
        mock_model.return_value.generate_content.return_value = mock_response
        
        result = self.gemini_service.generate_response("नमस्ते", "hindi")
        
        self.assertIsInstance(result, str)
        self.assertTrue(len(result) > 0)
    
    def test_clean_phone_number(self):
        """Test phone number cleaning"""
        test_cases = [
            ("+91-987-654-3210", "+919876543210"),
            ("9876543210", "9876543210"),
            ("98 76 54 32 10", "9876543210"),
            ("invalid", None),
            ("12345", None)  # Too short
        ]
        
        for input_phone, expected in test_cases:
            result = self.gemini_service._clean_phone_number(input_phone)
            self.assertEqual(result, expected)


class TestDatabaseManager(unittest.TestCase):
    """Test database operations"""
    
    def setUp(self):
        """Set up test fixtures with mock MongoDB"""
        with patch('pymongo.MongoClient') as mock_client:
            mock_db = Mock()
            mock_client.return_value = {Config.DB_NAME: mock_db}
            self.db_manager = DatabaseManager()
            self.db_manager.users = Mock()
            self.db_manager.conversations = Mock()
    
    def test_create_user_new(self):
        """Test creating a new user"""
        # Mock database response for new user
        self.db_manager.users.find_one.return_value = None
        self.db_manager.users.insert_one.return_value = Mock(inserted_id='user123')
        
        result = self.db_manager.create_user("राहुल शर्मा", "+919876543210", "hindi")
        
        self.assertEqual(result, 'user123')
        self.db_manager.users.insert_one.assert_called_once()
    
    def test_create_user_existing(self):
        """Test updating an existing user"""
        # Mock database response for existing user
        existing_user = {'_id': 'user123', 'phone': '+919876543210'}
        self.db_manager.users.find_one.return_value = existing_user
        
        result = self.db_manager.create_user("राहुल शर्मा", "+919876543210", "hindi")
        
        self.assertEqual(result, 'user123')
        self.db_manager.users.update_one.assert_called_once()
    
    def test_get_user(self):
        """Test getting user by phone"""
        # Mock database response
        expected_user = {'_id': 'user123', 'name': 'राहुल शर्मा', 'phone': '+919876543210'}
        self.db_manager.users.find_one.return_value = expected_user
        
        result = self.db_manager.get_user("+919876543210")
        
        self.assertEqual(result, expected_user)
        self.db_manager.users.find_one.assert_called_with({'phone': '+919876543210'})
    
    def test_create_conversation(self):
        """Test saving conversation"""
        # Mock database response
        self.db_manager.conversations.insert_one.return_value = Mock(inserted_id='conv123')
        
        result = self.db_manager.create_conversation(
            'user123', 
            'नमस्ते', 
            'आपका स्वागत है!', 
            'session123'
        )
        
        self.assertEqual(result, 'conv123')
        self.db_manager.conversations.insert_one.assert_called_once()


class TestSpeechService(unittest.TestCase):
    """Test speech-to-text and text-to-speech services"""
    
    def setUp(self):
        """Set up test fixtures"""
        with patch('speech_recognition.Recognizer'):
            from backend.services.speech_service import SpeechService
            self.speech_service = SpeechService()
    
    def test_validate_audio_file_valid(self):
        """Test audio file validation with valid file"""
        with patch('backend.services.speech_service.AudioSegment') as mock_audio:
            mock_audio.from_file.return_value = Mock()
            
            result = self.speech_service.validate_audio_file("test.wav")
            
            self.assertTrue(result)
    
    def test_validate_audio_file_invalid(self):
        """Test audio file validation with invalid file"""
        with patch('backend.services.speech_service.AudioSegment') as mock_audio:
            mock_audio.from_file.side_effect = Exception("Invalid format")
            
            result = self.speech_service.validate_audio_file("test.invalid")
            
            self.assertFalse(result)
    
    @patch('backend.services.speech_service.gTTS')
    def test_text_to_speech(self, mock_gtts):
        """Test text-to-speech conversion"""
        mock_tts_instance = Mock()
        mock_gtts.return_value = mock_tts_instance
        
        result = self.speech_service.text_to_speech("नमस्ते", "hi")
        
        self.assertIsNotNone(result)
        mock_gtts.assert_called_with(text="नमस्ते", lang="hi", slow=False)
        mock_tts_instance.save.assert_called_once()
    
    @patch('os.path.exists')
    @patch('os.remove')
    def test_convert_audio_format(self, mock_remove, mock_exists):
        """Test audio format conversion"""
        mock_exists.return_value = True
        
        with patch('backend.services.speech_service.AudioSegment') as mock_audio:
            mock_audio_instance = Mock()
            mock_audio_instance.set_channels.return_value = mock_audio_instance
            mock_audio_instance.set_frame_rate.return_value = mock_audio_instance
            mock_audio_instance.set_sample_width.return_value = mock_audio_instance
            mock_audio.from_file.return_value = mock_audio_instance
            
            result = self.speech_service.convert_audio_format("test.mp3", "test.wav", "wav")
            
            self.assertIsNotNone(result)
            mock_audio_instance.export.assert_called_once()


class TestVoiceRoutes(unittest.TestCase):
    """Test voice processing routes"""
    
    def setUp(self):
        """Set up test fixtures"""
        # Import Flask app for testing
        from app import create_app
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
    
    def test_extract_info_success(self):
        """Test successful information extraction"""
        with patch('backend.routes.voice_routes.gemini_service') as mock_gemini:
            mock_gemini.extract_name_phone.return_value = {
                'name': 'राहुल शर्मा',
                'phone': '+919876543210'
            }
            
            response = self.client.post('/api/voice/extract_info', 
                                     json={'text': 'मेरा नाम राहुल शर्मा है'})
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertIn('name', data)
            self.assertIn('phone', data)
    
    def test_detect_language_success(self):
        """Test successful language detection"""
        with patch('backend.routes.voice_routes.gemini_service') as mock_gemini:
            mock_gemini.detect_language.return_value = 'hindi'
            
            response = self.client.post('/api/voice/detect_language',
                                     json={'text': 'मैं हिंदी में बात करना चाहता हूँ'})
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertEqual(data['language'], 'hindi')
    
    def test_generate_response_success(self):
        """Test successful response generation"""
        with patch('backend.routes.voice_routes.gemini_service') as mock_gemini:
            with patch('backend.routes.voice_routes.db_manager') as mock_db:
                mock_gemini.generate_response.return_value = 'आपका स्वागत है!'
                mock_db.get_conversation_history.return_value = []
                mock_db.create_conversation.return_value = 'conv123'
                
                response = self.client.post('/api/voice/generate_response',
                                          json={'text': 'नमस्ते', 'language': 'hindi'})
                
                self.assertEqual(response.status_code, 200)
                data = json.loads(response.data)
                self.assertIn('response', data)
                self.assertEqual(data['language'], 'hindi')


class TestIntegration(unittest.TestCase):
    """Integration tests for the complete workflow"""
    
    def setUp(self):
        """Set up test fixtures for integration testing"""
        from app import create_app
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
    
    def test_complete_user_registration_workflow(self):
        """Test the complete user registration workflow"""
        with patch('backend.routes.user_routes.db_manager') as mock_db:
            mock_db.create_user.return_value = 'user123'
            
            # Test user registration
            response = self.client.post('/api/user/register', json={
                'name': 'राहुल शर्मा',
                'phone': '+919876543210',
                'language': 'hindi'
            })
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertIn('user_id', data)
            self.assertIn('session_id', data)
            self.assertEqual(data['name'], 'राहुल शर्मा')
            self.assertEqual(data['language'], 'hindi')


def run_tests():
    """Run all tests and generate report"""
    # Create test suite
    test_classes = [
        TestConfig,
        TestGeminiService, 
        TestDatabaseManager,
        TestSpeechService,
        TestVoiceRoutes,
        TestIntegration
    ]
    
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test classes to suite
    for test_class in test_classes:
        tests = loader.loadTestsFromTestCase(test_class)
        suite.addTests(tests)
    
    # Run tests with verbose output
    runner = unittest.TextTestRunner(verbosity=2, buffer=True)
    result = runner.run(suite)
    
    # Print summary
    print(f"\n{'='*50}")
    print(f"TEST SUMMARY")
    print(f"{'='*50}")
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Success rate: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")
    
    if result.failures:
        print(f"\nFAILURES:")
        for test, traceback in result.failures:
            print(f"- {test}: {traceback.split('AssertionError: ')[-1].split(chr(10))[0]}")
    
    if result.errors:
        print(f"\nERRORS:")
        for test, traceback in result.errors:
            print(f"- {test}: {traceback.split(chr(10))[-2]}")
    
    return result.wasSuccessful()


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)