"""
Migration script to convert string user_ids to ObjectId in conversations collection
Run this once to fix existing data inconsistency
"""

import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.models.database import db_manager
from bson import ObjectId
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_user_ids():
    """Convert all string user_ids to ObjectId in conversations"""
    try:
        # Find all conversations with string user_id
        conversations = db_manager.conversations.find({})
        
        migrated_count = 0
        skipped_count = 0
        error_count = 0
        
        logger.info("Starting user_id migration...")
        
        for conv in conversations:
            try:
                user_id = conv.get('user_id')
                
                # Check if user_id is string
                if isinstance(user_id, str):
                    try:
                        # Convert to ObjectId
                        object_id = ObjectId(user_id)
                        
                        # Update the conversation
                        db_manager.conversations.update_one(
                            {'_id': conv['_id']},
                            {'$set': {'user_id': object_id}}
                        )
                        
                        migrated_count += 1
                        
                        if migrated_count % 100 == 0:
                            logger.info(f"Migrated {migrated_count} conversations...")
                    
                    except Exception as e:
                        logger.warning(f"Invalid ObjectId string: {user_id} - {e}")
                        error_count += 1
                
                elif isinstance(user_id, ObjectId):
                    # Already ObjectId, skip
                    skipped_count += 1
                
                else:
                    logger.warning(f"Unknown user_id type: {type(user_id)}")
                    error_count += 1
            
            except Exception as e:
                logger.error(f"Error processing conversation {conv.get('_id')}: {e}")
                error_count += 1
        
        logger.info(f"\nMigration completed!")
        logger.info(f"  - Migrated: {migrated_count}")
        logger.info(f"  - Already ObjectId: {skipped_count}")
        logger.info(f"  - Errors: {error_count}")
        
        return True
    
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        return False

def verify_migration():
    """Verify that all user_ids are now ObjectId"""
    try:
        # Count conversations with string user_id (shouldn't be any after migration)
        string_count = 0
        objectid_count = 0
        
        conversations = db_manager.conversations.find({})
        
        for conv in conversations:
            user_id = conv.get('user_id')
            if isinstance(user_id, str):
                string_count += 1
            elif isinstance(user_id, ObjectId):
                objectid_count += 1
        
        logger.info(f"\nVerification results:")
        logger.info(f"  - ObjectId type: {objectid_count}")
        logger.info(f"  - String type: {string_count}")
        
        if string_count == 0:
            logger.info("✅ Migration successful - all user_ids are ObjectId")
            return True
        else:
            logger.warning(f"⚠️  Still have {string_count} conversations with string user_id")
            return False
    
    except Exception as e:
        logger.error(f"Verification failed: {e}")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("User ID Migration Script")
    print("=" * 60)
    print("\nThis script will convert all string user_ids to ObjectId")
    print("in the conversations collection for consistent $lookup joins.")
    print("\n⚠️  WARNING: This will modify your database!")
    print("\nRecommended: Take a backup before proceeding.")
    print("=" * 60)
    
    response = input("\nProceed with migration? (yes/no): ").lower().strip()
    
    if response == 'yes':
        print("\nStarting migration...\n")
        
        success = migrate_user_ids()
        
        if success:
            print("\nRunning verification...\n")
            verify_migration()
        else:
            print("\n❌ Migration failed!")
    else:
        print("\nMigration cancelled.")
