#!/usr/bin/env python3
"""
Test individual admin API endpoints
"""

import requests
import sys
from datetime import datetime

def test_admin_login():
    """Test admin login functionality"""
    print("1. Testing admin login...")
    
    login_url = "http://127.0.0.1:5000/admin/api/login"
    login_data = {
        'username': 'admin',
        'password': '123456'
    }
    
    try:
        response = requests.post(login_url, json=login_data)
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ Admin login successful")
                return data.get('token')
            else:
                print(f"❌ Login failed: {data.get('message')}")
                return None
        else:
            print(f"❌ Login request failed with status: {response.status_code}")
            return None
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Flask app. Please start it with: python app.py")
        return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_dashboard_api(token):
    """Test dashboard API endpoint"""
    print("\n2. Testing dashboard API...")
    
    dashboard_url = "http://127.0.0.1:5000/admin/api/dashboard"
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.get(dashboard_url, headers=headers)
        print(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("Raw response:")
            print(f"Success: {data.get('success')}")
            
            if data.get('success') and 'data' in data:
                stats = data['data']
                print("✅ Dashboard API working!")
                print(f"User stats: {stats.get('users', {})}")
                print(f"Conversation stats: {stats.get('conversations', {})}")
                print(f"System stats: {stats.get('system', {})}")
                return True
            else:
                print(f"❌ Dashboard API failed: {data}")
                return False
        else:
            print(f"❌ Dashboard API returned {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Dashboard API error: {e}")
        return False

def test_users_api(token):
    """Test users list API endpoint"""
    print("\n3. Testing users API...")
    
    users_url = "http://127.0.0.1:5000/admin/api/users"
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.get(users_url, headers=headers)
        print(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Users API working!")
            print(f"Success: {data.get('success')}")
            if 'data' in data and 'users' in data['data']:
                users = data['data']['users']
                print(f"Found {len(users)} users")
                if users:
                    print(f"First user: {users[0]}")
            return True
        else:
            print(f"❌ Users API returned {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Users API error: {e}")
        return False

def test_search_api(token):
    """Test search API endpoint"""
    print("\n4. Testing search API...")
    
    search_url = "http://127.0.0.1:5000/admin/api/search?q=test"
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.get(search_url, headers=headers)
        print(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Search API working!")
            print(f"Success: {data.get('success')}")
            print(f"Found {len(data.get('data', []))} search results")
            return True
        else:
            print(f"❌ Search API returned {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Search API error: {e}")
        return False

def main():
    print("Testing Admin API Endpoints")
    print("=" * 50)
    
    # Test login first
    token = test_admin_login()
    if not token:
        print("\n❌ Cannot proceed without valid login token")
        return False
    
    print(f"\nUsing token: {token[:20]}...")
    
    # Test each endpoint
    results = []
    results.append(test_dashboard_api(token))
    results.append(test_users_api(token))
    results.append(test_search_api(token))
    
    print("\n" + "=" * 50)
    print("Test Summary:")
    print(f"Dashboard API: {'✅' if results[0] else '❌'}")
    print(f"Users API: {'✅' if results[1] else '❌'}")
    print(f"Search API: {'✅' if results[2] else '❌'}")
    
    return all(results)

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)