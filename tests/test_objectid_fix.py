#!/usr/bin/env python3
"""
Test ObjectId serialization fix
"""

from backend.routes.admin_routes import convert_objectids_to_strings
from bson import ObjectId
from datetime import datetime
import json

def test_objectid_conversion():
    """Test the ObjectId conversion utility"""
    
    print("Testing ObjectId conversion utility...")
    
    # Test data with ObjectIds
    test_data = {
        '_id': ObjectId('507f1f77bcf86cd799439011'),
        'user_id': ObjectId('507f191e810c19729de860ea'),
        'name': 'John Doe',
        'created_at': datetime(2023, 1, 1, 12, 0, 0),
        'conversations': [
            {
                '_id': ObjectId('507f191e810c19729de860eb'),
                'user_id': ObjectId('507f191e810c19729de860ea'),
                'message': 'Hello',
                'timestamp': datetime(2023, 1, 2, 10, 30, 0)
            }
        ],
        'stats': {
            'total': 5,
            'admin_id': ObjectId('507f191e810c19729de860ec')
        }
    }
    
    print("Original data:")
    print(f"Type of _id: {type(test_data['_id'])}")
    print(f"Type of created_at: {type(test_data['created_at'])}")
    
    # Convert ObjectIds
    converted = convert_objectids_to_strings(test_data)
    
    print("\nAfter conversion:")
    print(f"Type of _id: {type(converted['_id'])}")
    print(f"Type of created_at: {type(converted['created_at'])}")
    print(f"_id value: {converted['_id']}")
    print(f"created_at value: {converted['created_at']}")
    
    # Test JSON serialization
    try:
        json_str = json.dumps(converted)
        print("\n✅ JSON serialization successful!")
        print(f"JSON length: {len(json_str)} characters")
        return True
    except Exception as e:
        print(f"\n❌ JSON serialization failed: {e}")
        return False

if __name__ == "__main__":
    success = test_objectid_conversion()
    exit(0 if success else 1)