"""
Direct database test for device lookup
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models.database import db_manager

def test_device_lookup():
    """Test device lookup with different device_id formats"""
    print("\n🔍 Testing Device Lookup in Database...\n")
    
    # Get all devices
    all_devices = list(db_manager.devices.find({}, {'device_id': 1, 'device_name': 1, 'source': 1, '_id': 0}).limit(10))
    
    print(f"📋 Found {len(all_devices)} devices in database:\n")
    for dev in all_devices:
        print(f"  • device_id: {dev.get('device_id')}")
        print(f"    name: {dev.get('device_name')}")
        print(f"    source: {dev.get('source')}")
        print()
    
    # Test lookups
    test_ids = ["1201", "2fc5a906-8818-4f11-b119-bfc160b8a406", "abc123"]
    
    print("\n🧪 Testing Lookups:\n")
    for device_id in test_ids:
        device = db_manager.get_device_by_id(device_id)
        if device:
            print(f"✅ Found: {device_id} → {device.get('device_name')}")
        else:
            print(f"❌ Not found: {device_id}")
    
    print()

if __name__ == "__main__":
    test_device_lookup()
