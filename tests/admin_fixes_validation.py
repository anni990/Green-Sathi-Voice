#!/usr/bin/env python3
"""
Comprehensive Admin Dashboard Fixes Validation Script

This script validates all the fixes implemented for the admin dashboard:
1. Conversations API with proper schema
2. User conversations pagination 
3. Logout functionality
4. Enhanced analytics
5. Database connection and structure

Run this script to ensure all fixes are working correctly.
"""

import sys
import os
import traceback
import json
from datetime import datetime, timedelta

# Add the project directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test if all required modules can be imported"""
    print("🔧 Testing imports...")
    try:
        from backend.models.database import db_manager
        from backend.services.admin_service import admin_service
        from backend.routes.admin_routes import admin_bp
        from backend.utils.config import Config
        print("✅ All imports successful")
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def test_admin_service_methods():
    """Test new admin service methods"""
    print("\n🔧 Testing admin service methods...")
    try:
        from backend.services.admin_service import admin_service
        
        # Test get_all_conversations method exists
        if hasattr(admin_service, 'get_all_conversations'):
            print("✅ get_all_conversations method exists")
        else:
            print("❌ get_all_conversations method missing")
            return False
            
        # Test session management
        token = admin_service.authenticate('admin', '123456')
        if token:
            print("✅ Admin authentication works")
            
            # Test session validation
            if admin_service.validate_session(token):
                print("✅ Session validation works")
                
                # Test logout
                admin_service.logout(token)
                if not admin_service.validate_session(token):
                    print("✅ Logout functionality works")
                else:
                    print("❌ Logout functionality failed")
                    return False
            else:
                print("❌ Session validation failed")
                return False
        else:
            print("❌ Admin authentication failed")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Admin service test error: {e}")
        traceback.print_exc()
        return False

def test_database_structure():
    """Test database structure and conversation schema"""
    print("\n🔧 Testing database structure...")
    try:
        from backend.models.database import db_manager
        
        # Test database connection
        users_count = db_manager.users.count_documents({})
        conversations_count = db_manager.conversations.count_documents({})
        
        print(f"✅ Database connected - {users_count} users, {conversations_count} conversations")
        
        # Check conversation schema
        sample_conversation = db_manager.conversations.find_one()
        if sample_conversation:
            required_fields = ['user_id', 'user_input', 'bot_response', 'timestamp']
            missing_fields = [field for field in required_fields if field not in sample_conversation]
            
            if not missing_fields:
                print("✅ Conversation schema is correct")
            else:
                print(f"❌ Missing conversation fields: {missing_fields}")
                return False
        else:
            print("ℹ️  No conversations found - schema cannot be validated")
        
        # Test get_all_conversations with aggregation
        try:
            from backend.services.admin_service import admin_service
            result = admin_service.get_all_conversations(page=1, limit=5)
            if result:
                print("✅ get_all_conversations with aggregation works")
            else:
                print("ℹ️  get_all_conversations returned None (no data)")
        except Exception as e:
            print(f"❌ get_all_conversations aggregation error: {e}")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Database test error: {e}")
        traceback.print_exc()
        return False

def test_api_routes():
    """Test API route definitions"""
    print("\n🔧 Testing API routes...")
    try:
        from backend.routes.admin_routes import admin_bp
        
        # Check routes by reading the routes file directly
        routes_file = "backend/routes/admin_routes.py"
        if os.path.exists(routes_file):
            with open(routes_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
                required_routes = [
                    '/admin/api/conversations',
                    '/admin/api/users/<user_id>/conversations',
                    '/admin/logout'
                ]
                
                for route in required_routes:
                    if route in content:
                        print(f"✅ Route {route} is defined")
                    else:
                        print(f"❌ Route {route} is missing from routes file")
                        return False
        else:
            print("❌ admin_routes.py file not found")
            return False
        
        return True
    except Exception as e:
        print(f"❌ API routes test error: {e}")
        traceback.print_exc()
        return False

def test_frontend_files():
    """Test frontend file structure and key methods"""
    print("\n🔧 Testing frontend files...")
    try:
        # Check if admin dashboard JS exists
        js_file = "static/js/admin-dashboard.js"
        if os.path.exists(js_file):
            print("✅ admin-dashboard.js exists")
            
            # Read and check for key methods
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
                required_methods = [
                    'loadConversations',
                    'renderConversationsPagination', 
                    'showUserConversations',
                    'logout',
                    'displayAnalytics'
                ]
                
                for method in required_methods:
                    if f'{method}(' in content:
                        print(f"✅ Method {method} found")
                    else:
                        print(f"❌ Method {method} missing")
                        return False
                        
        else:
            print(f"❌ {js_file} not found")
            return False
            
        # Check template file
        template_file = "templates/admin/dashboard.html"
        if os.path.exists(template_file):
            print("✅ dashboard.html exists")
            
            with open(template_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # Check for logout button update
                if 'window.adminDashboard.logout()' in content:
                    print("✅ Logout button updated")
                else:
                    print("❌ Logout button not updated")
                    return False
        else:
            print(f"❌ {template_file} not found")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Frontend files test error: {e}")
        traceback.print_exc()
        return False

def test_objectid_conversion():
    """Test ObjectId to string conversion utility"""
    print("\n🔧 Testing ObjectId conversion...")
    try:
        from backend.routes.admin_routes import convert_objectids_to_strings
        from bson import ObjectId
        from datetime import datetime
        
        # Test data with ObjectIds
        test_data = {
            'id': ObjectId(),
            'user_id': ObjectId(),
            'timestamp': datetime.utcnow(),
            'nested': {
                'another_id': ObjectId(),
                'list': [ObjectId(), 'string', 123]
            }
        }
        
        converted = convert_objectids_to_strings(test_data)
        
        # Check if ObjectIds are converted to strings
        if isinstance(converted['id'], str):
            print("✅ ObjectId conversion works")
        else:
            print("❌ ObjectId conversion failed")
            return False
            
        # Check nested conversion
        if isinstance(converted['nested']['another_id'], str):
            print("✅ Nested ObjectId conversion works")
        else:
            print("❌ Nested ObjectId conversion failed")
            return False
        
        return True
    except Exception as e:
        print(f"❌ ObjectId conversion test error: {e}")
        traceback.print_exc()
        return False

def generate_test_report():
    """Generate comprehensive test report"""
    print("\n" + "="*60)
    print("🚀 ADMIN DASHBOARD FIXES VALIDATION REPORT")
    print("="*60)
    
    tests = [
        ("Import System", test_imports),
        ("Admin Service Methods", test_admin_service_methods),  
        ("Database Structure", test_database_structure),
        ("API Routes", test_api_routes),
        ("Frontend Files", test_frontend_files),
        ("ObjectId Conversion", test_objectid_conversion)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n📋 Running {test_name} Test...")
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results[test_name] = False
    
    # Summary
    print("\n" + "="*60)
    print("📊 TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:.<30} {status}")
    
    print(f"\nOverall Result: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! The admin dashboard fixes are working correctly.")
        print("\n📝 Next Steps:")
        print("1. Start Flask app: python app.py")
        print("2. Navigate to: http://127.0.0.1:5000/admin/dashboard") 
        print("3. Test conversations loading with proper pagination")
        print("4. Test user conversations modal with pagination")
        print("5. Test logout functionality")
        print("6. Verify enhanced analytics display")
    else:
        print(f"\n⚠️  {total - passed} tests failed. Please check the errors above.")
        
    return passed == total

if __name__ == "__main__":
    try:
        success = generate_test_report()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⏹️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Fatal error: {e}")
        traceback.print_exc()
        sys.exit(1)