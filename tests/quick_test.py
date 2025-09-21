"""
Simple test to check database connectivity and create sample data
"""
import sys
import os

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from backend.models.database import db_manager
    from datetime import datetime
    
    print("🔄 Testing database connection...")
    
    # Test basic connection
    users_count = db_manager.users.count_documents({})
    conversations_count = db_manager.conversations.count_documents({})
    
    print(f"✅ Database connected successfully!")
    print(f"📊 Current data:")
    print(f"   - Users: {users_count}")
    print(f"   - Conversations: {conversations_count}")
    
    # If no data exists, create some sample data
    if users_count == 0:
        print("\n🔄 Creating sample data...")
        
        # Create sample users
        sample_users = [
            {'name': 'John Doe', 'phone': '+919876543210', 'language': 'english'},
            {'name': 'राज शर्मा', 'phone': '+918765432109', 'language': 'hindi'},
            {'name': 'Priya Patel', 'phone': '+917654321098', 'language': 'gujarati'},
        ]
        
        created_users = []
        for user in sample_users:
            user_doc = {
                **user,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            result = db_manager.users.insert_one(user_doc)
            created_users.append(result.inserted_id)
            print(f"   ✅ Created user: {user['name']}")
        
        # Create sample conversations
        for user_id in created_users:
            conv_doc = {
                'user_id': user_id,
                'timestamp': datetime.utcnow(),
                'language': 'hindi',
                'user_input': 'Hello',
                'bot_response': 'Hi! How can I help you?',
                'messages': [
                    {'role': 'user', 'content': 'Hello'},
                    {'role': 'assistant', 'content': 'Hi! How can I help you?'}
                ],
                'session_duration': 120
            }
            db_manager.conversations.insert_one(conv_doc)
        
        print(f"✅ Sample data created!")
    
    # Test admin service
    print(f"\n🔄 Testing admin service...")
    from backend.services.admin_service import admin_service
    
    # Test authentication
    token = admin_service.authenticate('admin', '123456')
    if token:
        print("✅ Admin authentication working")
        
        # Test dashboard stats
        stats = admin_service.get_dashboard_stats()
        if stats:
            print("✅ Dashboard stats working")
            print(f"   - Users: {stats.get('users', {}).get('total_users', 0)}")
            print(f"   - Conversations: {stats.get('conversations', {}).get('total_conversations', 0)}")
        else:
            print("⚠️  Dashboard stats returned None")
    else:
        print("❌ Admin authentication failed")
    
    print(f"\n🎯 Ready to test admin interface!")
    print(f"   1. Run: python app.py")
    print(f"   2. Open: http://localhost:5000/admin")
    print(f"   3. Login: admin / 123456")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()