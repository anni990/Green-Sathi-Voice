"""
Migration script to assign device_id=1200 to all existing users and conversations
Run this once after deploying device authentication system
"""

import sys
import os

# Add project root to Python path (go up two levels from scripts/ directory)
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, project_root)

from backend.models.database import db_manager
from backend.utils.config import Config
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_existing_data():
    """Assign default device_id to all existing users and conversations"""
    try:
        default_device_id = Config.DEFAULT_DEVICE_ID
        logger.info(f"Starting migration with default device_id: {default_device_id}")
        
        # Update all users without device_id
        users_result = db_manager.users.update_many(
            {'device_id': {'$exists': False}},
            {'$set': {'device_id': default_device_id}}
        )
        logger.info(f"Updated {users_result.modified_count} users with default device_id")
        
        # Also update users with null device_id
        users_null_result = db_manager.users.update_many(
            {'device_id': None},
            {'$set': {'device_id': default_device_id}}
        )
        logger.info(f"Updated {users_null_result.modified_count} users with null device_id")
        
        # Update all conversations without device_id
        conv_result = db_manager.conversations.update_many(
            {'device_id': {'$exists': False}},
            {'$set': {'device_id': default_device_id}}
        )
        logger.info(f"Updated {conv_result.modified_count} conversations with default device_id")
        
        # Also update conversations with null device_id
        conv_null_result = db_manager.conversations.update_many(
            {'device_id': None},
            {'$set': {'device_id': default_device_id}}
        )
        logger.info(f"Updated {conv_null_result.modified_count} conversations with null device_id")
        
        logger.info("Migration completed successfully!")
        
        # Print summary
        total_users = users_result.modified_count + users_null_result.modified_count
        total_convs = conv_result.modified_count + conv_null_result.modified_count
        
        print("\n" + "="*60)
        print("MIGRATION SUMMARY")
        print("="*60)
        print(f"Default Device ID: {default_device_id}")
        print(f"Total Users Migrated: {total_users}")
        print(f"Total Conversations Migrated: {total_convs}")
        print("="*60)
        
        return True
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        return False

if __name__ == '__main__':
    print("\n" + "="*60)
    print("DEVICE AUTHENTICATION DATA MIGRATION")
    print("="*60)
    print(f"This will assign device_id={Config.DEFAULT_DEVICE_ID} to all existing data")
    print("="*60 + "\n")
    
    confirm = input("Do you want to proceed? (yes/no): ")
    
    if confirm.lower() in ['yes', 'y']:
        success = migrate_existing_data()
        if success:
            print("\n✓ Migration completed successfully!")
        else:
            print("\n✗ Migration failed. Check logs for details.")
    else:
        print("\nMigration cancelled.")
