"""
Quick Test Script for New Improvements
Tests the fallback and retry mechanisms
"""
import requests
import json

BASE_URL = "http://localhost:5000"

def test_extract_info_fallback():
    """Test extract_info with unclear text that should trigger fallback"""
    print("\n" + "="*60)
    print("TEST 1: Extract Info Fallback")
    print("="*60)
    
    # Test with unclear text
    response = requests.post(
        f"{BASE_URL}/api/voice/extract_info",
        json={"text": "hello my name is umm err yeah"}
    )
    
    print(f"Status Code: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    
    if data.get('fallback'):
        print("✅ Fallback mechanism triggered correctly")
    else:
        print("❌ Fallback should have been triggered")

def test_language_detection_retry():
    """Test language detection with retry mechanism"""
    print("\n" + "="*60)
    print("TEST 2: Language Detection Retry")
    print("="*60)
    
    # Test with unclear language input
    for attempt in range(1, 4):
        response = requests.post(
            f"{BASE_URL}/api/voice/detect_language",
            json={
                "text": f"umm err {attempt}",
                "attempt": attempt
            }
        )
        
        print(f"\nAttempt {attempt}:")
        print(f"Status Code: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if data.get('retry'):
            print(f"✅ Retry flag set correctly for attempt {attempt}")
        
        if attempt == data.get('attempt'):
            print(f"✅ Attempt number tracked correctly: {attempt}")

def test_static_audio_endpoints():
    """Test static audio endpoints"""
    print("\n" + "="*60)
    print("TEST 3: Static Audio Endpoints")
    print("="*60)
    
    # Test conversation_start with full language name
    endpoints = [
        ("/api/voice/static_audio/conversation_start/hindi", "conversation_start (hindi)"),
        ("/api/voice/static_audio/conversation_start/hi", "conversation_start (hi)"),
        ("/api/voice/static_audio/extraction_error/hindi", "extraction_error (hindi)"),
        ("/api/voice/static_audio/language_error/hindi", "language_error (hindi)"),
    ]
    
    for endpoint, description in endpoints:
        response = requests.get(f"{BASE_URL}{endpoint}")
        print(f"\n{description}:")
        print(f"Status Code: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        
        if response.status_code == 200:
            print(f"✅ Audio file retrieved successfully ({len(response.content)} bytes)")
        else:
            print(f"❌ Failed to retrieve audio: {response.text}")

def test_name_optional():
    """Test user creation with optional name"""
    print("\n" + "="*60)
    print("TEST 4: Name Optional in User Registration")
    print("="*60)
    
    # Test with phone only
    response = requests.post(
        f"{BASE_URL}/api/user/register",
        json={
            "phone": "9876543210",
            "language": "hindi"
            # name is not provided
        }
    )
    
    print(f"Status Code: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    
    if response.status_code == 200:
        print("✅ User registered without name successfully")
    else:
        print("❌ Failed to register user without name")

def run_all_tests():
    """Run all tests"""
    print("\n" + "="*60)
    print("GREEN SATHI VOICE BOT - IMPROVEMENT TESTS")
    print("="*60)
    print("Testing new fallback and retry mechanisms...")
    
    try:
        test_extract_info_fallback()
    except Exception as e:
        print(f"❌ Extract info test failed: {e}")
    
    try:
        test_language_detection_retry()
    except Exception as e:
        print(f"❌ Language detection test failed: {e}")
    
    try:
        test_static_audio_endpoints()
    except Exception as e:
        print(f"❌ Static audio test failed: {e}")
    
    try:
        test_name_optional()
    except Exception as e:
        print(f"❌ Name optional test failed: {e}")
    
    print("\n" + "="*60)
    print("TESTS COMPLETED")
    print("="*60)
    print("\nNote: Make sure Flask app is running on http://localhost:5000")
    print("Run: python app.py")

if __name__ == '__main__':
    run_all_tests()
