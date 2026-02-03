"""
Quick test to verify admin API device endpoint works with all device_id formats
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models.database import db_manager
from backend.services.admin_service import admin_service

def test_admin_device_api():
    """Test admin device API with different device_id formats"""
    print("\n🧪 Testing Admin Device API with Different IDs...\n")
    
    # Create test devices with different formats
    test_devices = [
        {"device_id": "1201", "device_name": "Legacy-1201", "source": "migrated"},
        {"device_id": "2fc5a906-8818-4f11-b119-bfc160b8a406", "device_name": "Web-UUID", "source": "web"},
        {"device_id": "abc123def456", "device_name": "Android-Device", "source": "android-webview"},
    ]
    
    # Create devices in database
    for dev in test_devices:
        # Clean up if exists
        db_manager.devices.delete_many({'device_id': dev['device_id']})
        
        # Create device
        db_manager.create_device_for_android_id(
            dev['device_id'],
            dev['device_name'],
            dev['source']
        )
        print(f"✓ Created test device: {dev['device_id']}")
    
    print("\n📊 Testing admin_service.get_device_details()...\n")
    
    # Test admin service
    for dev in test_devices:
        device_id = dev['device_id']
        
        # Test the admin service method
        result = admin_service.get_device_details(device_id)
        
        if result:
            print(f"✅ SUCCESS: /admin/api/devices/{device_id}")
            print(f"   Device Name: {result.get('device_name')}")
            print(f"   Source: {result.get('source')}")
            print(f"   Pipeline: {result.get('pipeline_type')}")
            print(f"   LLM: {result.get('llm_service')}")
            print(f"   User Count: {result.get('user_count', 0)}")
        else:
            print(f"❌ FAILED: /admin/api/devices/{device_id}")
            print(f"   Device not found or error occurred")
        print()
    
    # Cleanup
    print("🧹 Cleaning up test devices...")
    for dev in test_devices:
        db_manager.devices.delete_many({'device_id': dev['device_id']})
        print(f"✓ Deleted: {dev['device_id']}")
    
    print("\n✅ Test Complete\n")

if __name__ == "__main__":
    test_admin_device_api()
