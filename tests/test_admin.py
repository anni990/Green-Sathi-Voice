"""
Test the Voice Bot application with admin interface
"""
import subprocess
import sys
import os

def test_imports():
    """Test if we can import the main modules"""
    try:
        from backend.routes.admin_routes import admin_bp
        print("✅ Admin routes imported successfully")
        
        from backend.services.admin_service import admin_service
        print("✅ Admin service imported successfully")
        
        from backend.models.database import db_manager
        print("✅ Database manager imported successfully")
        
        from app import create_app
        print("✅ Flask app imported successfully")
        
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def test_database_connection():
    """Test database connectivity"""
    try:
        from backend.models.database import db_manager
        
        # Try to get user count
        user_count = db_manager.users.count_documents({})
        conversation_count = db_manager.conversations.count_documents({})
        
        print(f"✅ Database connected successfully")
        print(f"📊 Users in database: {user_count}")
        print(f"💬 Conversations in database: {conversation_count}")
        
        return True
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False

def test_admin_service():
    """Test admin authentication"""
    try:
        from backend.services.admin_service import admin_service
        
        # Test authentication
        token = admin_service.authenticate('admin', '123456')
        if token:
            print("✅ Admin authentication working")
            
            # Test session validation
            if admin_service.validate_session(token):
                print("✅ Session validation working")
                return True
            else:
                print("❌ Session validation failed")
                return False
        else:
            print("❌ Admin authentication failed")
            return False
    except Exception as e:
        print(f"❌ Admin service error: {e}")
        return False

def run_tests():
    """Run all tests"""
    print("🚀 Testing Voice Bot Admin Interface...\n")
    
    # Test imports
    print("1️⃣ Testing imports...")
    if not test_imports():
        print("❌ Import tests failed. Install required packages first.")
        return False
    
    print("\n2️⃣ Testing database connection...")
    if not test_database_connection():
        print("❌ Database tests failed. Check MongoDB connection.")
        return False
    
    print("\n3️⃣ Testing admin service...")
    if not test_admin_service():
        print("❌ Admin service tests failed.")
        return False
    
    print("\n✅ All tests passed! Admin interface is ready.")
    print("\n🎯 Next steps:")
    print("1. Run: python create_test_data.py (to add sample data)")
    print("2. Run: python app.py (to start the server)")
    print("3. Open: http://localhost:5000/admin (admin panel)")
    print("4. Login with: admin / 123456")
    
    return True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)