"""
Migration Script: Convert existing JWT-based devices to Android ID-based auth
This script:
1. Lists all existing devices with numeric device_id
2. For each device, creates a migration record with a unique Android ID-like identifier
3. Optionally removes auth fields (password_hash, access_token, refresh_token)
4. Updates device schema to match new auth-free design

Run this ONCE after deploying the new Android ID auth system.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.models.database import db_manager
from datetime import datetime
import uuid

def generate_migration_device_id(numeric_id):
    """Generate a stable device ID for migration from numeric ID"""
    # Use UUID based on device number for reproducibility
    return f"migrated-{numeric_id}-{uuid.uuid5(uuid.NAMESPACE_DNS, str(numeric_id))}"

def migrate_devices(dry_run=True):
    """
    Migrate existing devices to Android ID auth model
    
    Args:
        dry_run: If True, only print changes without applying them
    """
    print("=" * 80)
    print("DEVICE MIGRATION TO ANDROID ID AUTH")
    print("=" * 80)
    print()
    
    # Get all existing devices
    try:
        devices = list(db_manager.devices.find({}))
        print(f"Found {len(devices)} devices in database")
        print()
    except Exception as e:
        print(f"Error fetching devices: {e}")
        return
    
    # Separate devices by type
    numeric_devices = []
    migrated_devices = []
    android_devices = []
    
    for device in devices:
        device_id = device.get('device_id')
        if isinstance(device_id, int):
            numeric_devices.append(device)
        elif isinstance(device_id, str):
            if device_id.startswith('migrated-'):
                migrated_devices.append(device)
            else:
                android_devices.append(device)
    
    print(f"Device breakdown:")
    print(f"  - Numeric IDs (old system): {len(numeric_devices)}")
    print(f"  - Migrated IDs: {len(migrated_devices)}")
    print(f"  - Android IDs: {len(android_devices)}")
    print()
    
    if not numeric_devices:
        print("✅ No devices to migrate. All devices already using Android ID auth.")
        return
    
    # Migration plan
    print("Migration Plan:")
    print("-" * 80)
    
    for device in numeric_devices:
        old_id = device.get('device_id')
        new_id = generate_migration_device_id(old_id)
        device_name = device.get('device_name', 'Unknown')
        pipeline = device.get('pipeline_type', 'library')
        llm = device.get('llm_service', 'gemini')
        
        print(f"Device: {device_name}")
        print(f"  Old ID: {old_id} (numeric)")
        print(f"  New ID: {new_id}")
        print(f"  Pipeline: {pipeline}")
        print(f"  LLM Service: {llm}")
        print(f"  Will remove: password_hash, access_token, refresh_token, last_login")
        print()
    
    if dry_run:
        print()
        print("=" * 80)
        print("DRY RUN MODE - No changes applied")
        print("To apply migration, run with: python migrate_to_android_id_auth.py --apply")
        print("=" * 80)
        return
    
    # Confirm migration
    print()
    print("⚠️  WARNING: This will modify device records and remove authentication fields!")
    confirm = input("Type 'MIGRATE' to confirm: ")
    
    if confirm != 'MIGRATE':
        print("❌ Migration cancelled")
        return
    
    print()
    print("Applying migration...")
    print("-" * 80)
    
    migrated_count = 0
    error_count = 0
    
    for device in numeric_devices:
        old_id = device.get('device_id')
        new_id = generate_migration_device_id(old_id)
        device_name = device.get('device_name', 'Unknown')
        
        try:
            # Update device record
            update_result = db_manager.devices.update_one(
                {'_id': device['_id']},
                {
                    '$set': {
                        'device_id': new_id,
                        'source': 'migrated',
                        'last_active': datetime.utcnow()
                    },
                    '$unset': {
                        'password_hash': '',
                        'access_token': '',
                        'refresh_token': '',
                        'last_login': ''
                    }
                }
            )
            
            if update_result.modified_count > 0:
                print(f"✅ Migrated: {device_name} ({old_id} → {new_id})")
                migrated_count += 1
            else:
                print(f"⚠️  No changes: {device_name} (already migrated?)")
        except Exception as e:
            print(f"❌ Error migrating {device_name}: {e}")
            error_count += 1
    
    print()
    print("=" * 80)
    print(f"Migration complete: {migrated_count} devices migrated, {error_count} errors")
    print("=" * 80)
    
    if error_count == 0:
        print()
        print("✅ All devices successfully migrated to Android ID auth!")
        print()
        print("Next steps:")
        print("1. Clear localStorage on all client devices (or have users reload)")
        print("2. Devices will auto-register on next load with their migrated IDs")
        print("3. Old /login and /register pages can be archived")
    else:
        print()
        print(f"⚠️  {error_count} device(s) failed to migrate. Check errors above.")

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Migrate devices to Android ID auth')
    parser.add_argument('--apply', action='store_true', 
                       help='Apply migration (default is dry-run)')
    
    args = parser.parse_args()
    
    migrate_devices(dry_run=not args.apply)
