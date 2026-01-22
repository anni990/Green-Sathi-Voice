"""
Admin Setup Script
Creates or updates the admin user with a secure password in the database.
Run this script once after deployment to set your admin password.
"""

import sys
import os
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

import bcrypt
from datetime import datetime
from backend.models.database import db_manager
import getpass

def hash_password(password):
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def setup_admin():
    """Setup admin user with secure password"""
    print("=" * 60)
    print("ADMIN USER SETUP")
    print("=" * 60)
    print()
    
    # Check if admin already exists
    existing_admin = db_manager.admins.find_one({'username': 'admin'})
    
    if existing_admin:
        print("⚠️  Admin user already exists!")
        print()
        response = input("Do you want to reset the password? (yes/no): ").strip().lower()
        if response != 'yes':
            print("❌ Setup cancelled.")
            return
        print()
    
    # Get new password
    while True:
        password = getpass.getpass("Enter new admin password (min 8 characters): ")
        
        if len(password) < 8:
            print("❌ Password must be at least 8 characters long!")
            continue
        
        confirm_password = getpass.getpass("Confirm admin password: ")
        
        if password != confirm_password:
            print("❌ Passwords do not match!")
            continue
        
        break
    
    # Hash password
    print("\n🔒 Hashing password...")
    password_hash = hash_password(password)
    
    # Update or create admin user
    if existing_admin:
        db_manager.admins.update_one(
            {'username': 'admin'},
            {
                '$set': {
                    'password_hash': password_hash,
                    'updated_at': datetime.utcnow()
                }
            }
        )
        print("✅ Admin password updated successfully!")
    else:
        db_manager.admins.insert_one({
            'username': 'admin',
            'password_hash': password_hash,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        })
        print("✅ Admin user created successfully!")
    
    # Clean up old sessions
    result = db_manager.admin_sessions.delete_many({'username': 'admin'})
    if result.deleted_count > 0:
        print(f"🧹 Cleaned up {result.deleted_count} old session(s)")
    
    print()
    print("=" * 60)
    print("SETUP COMPLETE")
    print("=" * 60)
    print("\n📝 Admin Credentials:")
    print(f"   Username: admin")
    print(f"   Password: {password}")
    print("\n⚠️  IMPORTANT: Save this password securely and delete this output!")
    print()

if __name__ == "__main__":
    try:
        setup_admin()
    except KeyboardInterrupt:
        print("\n\n❌ Setup cancelled by user.")
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        import traceback
        traceback.print_exc()
