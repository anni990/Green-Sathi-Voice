"""
Test Script: Verify Android ID-based authentication flow
Tests the complete end-to-end flow without JWT authentication
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.models.database import db_manager
import uuid

def test_android_id_flow():
    """Test complete Android ID flow"""
    print("=" * 80)
    print("TESTING ANDROID ID AUTHENTICATION FLOW")
    print("=" * 80)
    print()
    
    # Test 1: Generate test Android ID
    test_android_id = str(uuid.uuid4())
    print(f"✓ Test 1: Generated test Android ID: {test_android_id}")
    print()
    
    # Test 2: Check device does not exist
    existing_device = db_manager.get_device_by_android_id(test_android_id)
    if existing_device:
        print(f"✗ Test 2 FAILED: Device already exists (should be new)")
        return False
    print(f"✓ Test 2: Device does not exist (as expected)")
    print()
    
    # Test 3: Create new device with Android ID
    try:
        db_manager.create_device_for_android_id(
            android_id=test_android_id,
            source='test',
            pipeline_type='library',
            llm_service='gemini'
        )
        print(f"✓ Test 3: Device created successfully")
    except Exception as e:
        print(f"✗ Test 3 FAILED: {e}")
        return False
    print()
    
    # Test 4: Retrieve device by Android ID
    device = db_manager.get_device_by_android_id(test_android_id)
    if not device:
        print(f"✗ Test 4 FAILED: Could not retrieve device")
        return False
    print(f"✓ Test 4: Device retrieved successfully")
    print(f"  - Device ID: {device['device_id']}")
    print(f"  - Device Name: {device['device_name']}")
    print(f"  - Pipeline: {device['pipeline_type']}")
    print(f"  - LLM Service: {device['llm_service']}")
    print(f"  - Source: {device['source']}")
    print()
    
    # Test 5: Verify no auth fields exist
    has_password = 'password_hash' in device
    has_access_token = 'access_token' in device
    has_refresh_token = 'refresh_token' in device
    
    if has_password or has_access_token or has_refresh_token:
        print(f"✗ Test 5 FAILED: Auth fields still present")
        print(f"  - password_hash: {has_password}")
        print(f"  - access_token: {has_access_token}")
        print(f"  - refresh_token: {has_refresh_token}")
        return False
    print(f"✓ Test 5: No auth fields present (correct)")
    print()
    
    # Test 6: Update last active
    try:
        db_manager.update_device_last_active(test_android_id)
        updated_device = db_manager.get_device_by_android_id(test_android_id)
        if 'last_active' in updated_device:
            print(f"✓ Test 6: Last active timestamp updated")
        else:
            print(f"✗ Test 6 FAILED: last_active not found")
            return False
    except Exception as e:
        print(f"✗ Test 6 FAILED: {e}")
        return False
    print()
    
    # Test 7: Simulate user registration with device_id
    try:
        test_phone = f"9{str(uuid.uuid4().int)[:9]}"
        user_id = db_manager.create_user(
            name="Test User",
            phone=test_phone,
            language="hindi",
            device_id=test_android_id
        )
        print(f"✓ Test 7: User registered with device_id")
        print(f"  - User ID: {user_id}")
        print(f"  - Phone: {test_phone}")
        print(f"  - Device ID: {test_android_id}")
    except Exception as e:
        print(f"✗ Test 7 FAILED: {e}")
        return False
    print()
    
    # Test 8: Create conversation with device_id
    try:
        conv_id = db_manager.create_conversation(
            user_id=user_id,
            user_input="Test question",
            bot_response="Test response",
            device_id=test_android_id,
            session_id=str(uuid.uuid4())
        )
        print(f"✓ Test 8: Conversation created with device_id")
        print(f"  - Conversation ID: {conv_id}")
    except Exception as e:
        print(f"✗ Test 8 FAILED: {e}")
        return False
    print()
    
    # Test 9: Retrieve device pipeline config
    try:
        config = db_manager.get_device_pipeline_config(test_android_id)
        if config:
            print(f"✓ Test 9: Pipeline config retrieved")
            print(f"  - Pipeline Type: {config['pipeline_type']}")
            print(f"  - LLM Service: {config['llm_service']}")
        else:
            print(f"✗ Test 9 FAILED: Config not found")
            return False
    except Exception as e:
        print(f"✗ Test 9 FAILED: {e}")
        return False
    print()
    
    # Cleanup: Remove test data
    print("Cleaning up test data...")
    try:
        db_manager.devices.delete_one({'device_id': test_android_id})
        db_manager.users.delete_one({'phone': test_phone})
        db_manager.conversations.delete_one({'user_id': user_id})
        print("✓ Cleanup complete")
    except Exception as e:
        print(f"⚠️  Cleanup warning: {e}")
    print()
    
    print("=" * 80)
    print("ALL TESTS PASSED ✅")
    print("=" * 80)
    return True

if __name__ == '__main__':
    success = test_android_id_flow()
    sys.exit(0 if success else 1)
