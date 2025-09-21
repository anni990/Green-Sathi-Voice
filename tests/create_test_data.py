"""
Test data generator for Voice Bot admin interface
Run this script to add sample users and conversations to the database
"""
from backend.models.database import db_manager
from datetime import datetime, timedelta
import random

def create_test_data():
    """Create test users and conversations for demonstration"""
    try:
        print("Creating test data...")
        
        # Sample test users
        test_users = [
            {'name': 'John Doe', 'phone': '+919876543210', 'language': 'english'},
            {'name': 'राज शर्मा', 'phone': '+918765432109', 'language': 'hindi'},
            {'name': 'Priya Patel', 'phone': '+917654321098', 'language': 'gujarati'},
            {'name': 'Mohammed Khan', 'phone': '+916543210987', 'language': 'urdu'},
            {'name': 'Anjali Singh', 'phone': '+915432109876', 'language': 'hindi'},
            {'name': 'David Wilson', 'phone': '+914321098765', 'language': 'english'},
            {'name': 'रीता देवी', 'phone': '+913210987654', 'language': 'hindi'},
            {'name': 'Robert Brown', 'phone': '+912109876543', 'language': 'english'},
        ]
        
        user_ids = []
        for user_data in test_users:
            # Create user with timestamp variation
            days_ago = random.randint(1, 30)
            created_at = datetime.utcnow() - timedelta(days=days_ago)
            
            user_doc = {
                'name': user_data['name'],
                'phone': user_data['phone'],
                'language': user_data['language'],
                'created_at': created_at,
                'updated_at': created_at
            }
            
            # Check if user exists
            existing = db_manager.users.find_one({'phone': user_data['phone']})
            if not existing:
                result = db_manager.users.insert_one(user_doc)
                user_ids.append(result.inserted_id)
                print(f"Created user: {user_data['name']}")
            else:
                user_ids.append(existing['_id'])
                print(f"User already exists: {user_data['name']}")
        
        # Create sample conversations
        conversation_templates = [
            {'bot_response': 'Hello! Welcome to Voice Bot Assistant. How can I help you today?', 'user_input': 'Hello'},
            {'bot_response': 'Thank you for using our service. Is there anything specific you need help with?', 'user_input': 'I need help'},
            {'bot_response': 'I understand you have a question. Please tell me more details.', 'user_input': 'I have a question'},
            {'bot_response': 'Great! I am here to assist you. What would you like to know?', 'user_input': 'Tell me about your services'},
            {'bot_response': 'Thank you for your inquiry. Let me help you with that information.', 'user_input': 'Can you help me?'}
        ]
        
        # Create conversations for each user
        for user_id in user_ids:
            num_conversations = random.randint(1, 5)  # 1-5 conversations per user
            
            for i in range(num_conversations):
                days_ago = random.randint(1, 20)
                conv_time = datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(0, 23))
                
                template = random.choice(conversation_templates)
                
                conversation_doc = {
                    'user_id': user_id,
                    'timestamp': conv_time,
                    'language': random.choice(['hindi', 'english', 'gujarati']),
                    'user_input': template['user_input'],
                    'bot_response': template['bot_response'],
                    'messages': [
                        {'role': 'user', 'content': template['user_input']},
                        {'role': 'assistant', 'content': template['bot_response']}
                    ],
                    'session_duration': random.randint(30, 300)  # 30 seconds to 5 minutes
                }
                
                db_manager.conversations.insert_one(conversation_doc)
        
        # Print summary
        total_users = db_manager.users.count_documents({})
        total_conversations = db_manager.conversations.count_documents({})
        
        print(f"\n✅ Test data created successfully!")
        print(f"📊 Total users in database: {total_users}")
        print(f"💬 Total conversations in database: {total_conversations}")
        print(f"\n🎯 You can now access the admin panel at: http://localhost:5000/admin")
        print(f"🔑 Login credentials: admin / 123456")
        
    except Exception as e:
        print(f"❌ Error creating test data: {e}")

if __name__ == "__main__":
    create_test_data()