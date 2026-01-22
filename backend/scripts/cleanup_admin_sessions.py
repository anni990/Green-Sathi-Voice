"""
Admin Session Cleanup Script
Cleans up expired admin sessions from the database.
Can be run as a cron job or scheduled task.
"""

import sys
import os
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from datetime import datetime
from backend.models.database import db_manager
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def cleanup_expired_sessions():
    """Remove expired admin sessions from database"""
    try:
        result = db_manager.admin_sessions.delete_many({
            'expires_at': {'$lt': datetime.utcnow()}
        })
        
        if result.deleted_count > 0:
            logger.info(f"Cleaned up {result.deleted_count} expired admin session(s)")
        else:
            logger.info("No expired sessions to clean up")
        
        return result.deleted_count
    except Exception as e:
        logger.error(f"Session cleanup failed: {e}")
        return 0

if __name__ == "__main__":
    print("=" * 60)
    print("ADMIN SESSION CLEANUP")
    print("=" * 60)
    print()
    
    count = cleanup_expired_sessions()
    
    print()
    print("=" * 60)
    print(f"CLEANUP COMPLETE - Removed {count} session(s)")
    print("=" * 60)
