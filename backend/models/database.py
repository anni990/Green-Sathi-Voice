from pymongo import MongoClient
from datetime import datetime
import pytz
import logging
from backend.utils.config import Config

logger = logging.getLogger(__name__)

# IST Timezone
IST = pytz.timezone('Asia/Kolkata')

def get_ist_time():
    """Get current time in IST timezone (timezone-naive for MongoDB storage)"""
    # Get UTC time, convert to IST, then remove timezone info
    utc_time = datetime.utcnow()
    ist_time = pytz.utc.localize(utc_time).astimezone(IST)
    return ist_time.replace(tzinfo=None)  # Return naive datetime in IST

class DatabaseManager:
    """Handles MongoDB database operations"""
    
    def __init__(self):
        try:
            self.client = MongoClient(Config.MONGODB_URL)
            self.db = self.client[Config.DB_NAME]
            self.users = self.db.users
            self.conversations = self.db.conversations
            self.devices = self.db.devices
            self.admins = self.db.admins
            self.admin_sessions = self.db.admin_sessions
            logger.info("Connected to MongoDB successfully")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    
    def create_user(self, name, phone, language, device_id=None):
        """Create a new user record (name is optional)"""
        try:
            user_data = {
                'phone': phone,
                'language': language,
                'device_id': device_id,
                'created_at': get_ist_time(),
                'updated_at': get_ist_time()
            }
            
            # Add name only if provided
            if name:
                user_data['name'] = name
            
            # Check if user already exists
            existing_user = self.users.find_one({'phone': phone})
            if existing_user:
                # Update existing user
                update_data = {
                    'language': language,
                    'device_id': device_id,
                    'updated_at': get_ist_time()
                }
                # Only update name if provided
                if name:
                    update_data['name'] = name
                    
                self.users.update_one(
                    {'phone': phone},
                    {'$set': update_data}
                )
                return existing_user['_id']
            else:
                # Create new user
                result = self.users.insert_one(user_data)
                return result.inserted_id
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            raise
    
    def get_user(self, phone):
        """Get user by phone number"""
        try:
            return self.users.find_one({'phone': phone})
        except Exception as e:
            logger.error(f"Failed to get user: {e}")
            return None
    
    def create_conversation(self, user_id, user_input, bot_response, device_id=None, session_id=None):
        """Save conversation turn to database"""
        try:
            from bson import ObjectId
            
            # Ensure user_id is ObjectId for consistent $lookup joins
            if isinstance(user_id, str):
                user_id = ObjectId(user_id)
            
            conversation_data = {
                'user_id': user_id,
                'device_id': device_id,
                'session_id': session_id,
                'user_input': user_input,
                'bot_response': bot_response,
                'timestamp': get_ist_time()
            }
            result = self.conversations.insert_one(conversation_data)
            return result.inserted_id
        except Exception as e:
            logger.error(f"Failed to save conversation: {e}")
            raise
    
    def get_conversation_history(self, user_id, session_id=None, limit=50):
        """Get conversation history for a user"""
        try:
            query = {'user_id': user_id}
            if session_id:
                query['session_id'] = session_id
            
            conversations = self.conversations.find(query).sort('timestamp', -1).limit(limit)
            return list(conversations)
        except Exception as e:
            logger.error(f"Failed to get conversation history: {e}")
            return []
    
    def get_user_statistics(self):
        """Get user statistics for admin dashboard"""
        try:
            total_users = self.users.count_documents({})
            
            # Users by language
            language_stats = list(self.users.aggregate([
                {"$group": {"_id": "$language", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]))
            
            # Recent users (last 7 days)
            from datetime import timedelta
            seven_days_ago = get_ist_time() - timedelta(days=7)
            recent_users = self.users.count_documents({
                "created_at": {"$gte": seven_days_ago}
            })
            
            # Users by date (last 30 days)
            thirty_days_ago = get_ist_time() - timedelta(days=30)
            daily_users = list(self.users.aggregate([
                {"$match": {"created_at": {"$gte": thirty_days_ago}}},
                {"$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                    "count": {"$sum": 1}
                }},
                {"$sort": {"_id": 1}}
            ]))
            
            return {
                'total_users': total_users,
                'language_stats': language_stats,
                'recent_users': recent_users,
                'daily_users': daily_users
            }
        except Exception as e:
            logger.error(f"Failed to get user statistics: {e}")
            return None
    
    def get_conversation_statistics(self):
        """Get conversation statistics for admin dashboard"""
        try:
            total_conversations = self.conversations.count_documents({})
            
            # Conversations by date (last 30 days)
            from datetime import timedelta
            thirty_days_ago = get_ist_time() - timedelta(days=30)
            daily_conversations = list(self.conversations.aggregate([
                {"$match": {"timestamp": {"$gte": thirty_days_ago}}},
                {"$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                    "count": {"$sum": 1}
                }},
                {"$sort": {"_id": 1}}
            ]))
            
            # Average conversations per user
            avg_conversations = list(self.conversations.aggregate([
                {"$group": {"_id": "$user_id", "count": {"$sum": 1}}},
                {"$group": {"_id": None, "avg": {"$avg": "$count"}}}
            ]))
            
            avg_conv_per_user = avg_conversations[0]['avg'] if avg_conversations else 0
            
            # Most active users
            active_users = list(self.conversations.aggregate([
                {"$group": {"_id": "$user_id", "conversation_count": {"$sum": 1}}},
                {"$lookup": {
                    "from": "users",
                    "localField": "_id",
                    "foreignField": "_id",
                    "as": "user_info"
                }},
                {"$unwind": {
                    "path": "$user_info",
                    "preserveNullAndEmptyArrays": True
                }},
                {"$addFields": {
                    "name": "$user_info.name",
                    "phone": "$user_info.phone",
                    "language": "$user_info.language"
                }},
                {"$project": {
                    "user_info": 0
                }},
                {"$sort": {"conversation_count": -1}},
                {"$limit": 10}
            ]))
            
            return {
                'total_conversations': total_conversations,
                'daily_conversations': daily_conversations,
                'avg_conversations_per_user': round(avg_conv_per_user, 2),
                'active_users': active_users
            }
        except Exception as e:
            logger.error(f"Failed to get conversation statistics: {e}")
            return None
    
    def get_all_users(self, page=1, limit=20):
        """Get paginated user list for admin"""
        try:
            skip = (page - 1) * limit
            users = list(self.users.find({}).sort('created_at', -1).skip(skip).limit(limit))
            total = self.users.count_documents({})
            
            return {
                'users': users,
                'total': total,
                'page': page,
                'pages': (total + limit - 1) // limit
            }
        except Exception as e:
            logger.error(f"Failed to get users: {e}")
            return None
    
    def get_user_conversations(self, user_id, page=1, limit=10):
        """Get conversations for a specific user"""
        try:
            from bson import ObjectId
            
            # Ensure user_id is ObjectId for querying
            if isinstance(user_id, str):
                user_id = ObjectId(user_id)
            
            skip = (page - 1) * limit
            conversations = list(self.conversations.find({
                'user_id': user_id
            }).sort('timestamp', -1).skip(skip).limit(limit))
            
            total = self.conversations.count_documents({'user_id': user_id})
            
            return {
                'conversations': conversations,
                'total': total,
                'page': page,
                'pages': (total + limit - 1) // limit
            }
        except Exception as e:
            logger.error(f"Failed to get user conversations: {e}")
            return None
    
    def search_users(self, query):
        """Search users by name or phone"""
        try:
            search_filter = {
                "$or": [
                    {"name": {"$regex": query, "$options": "i"}},
                    {"phone": {"$regex": query, "$options": "i"}}
                ]
            }
            users = list(self.users.find(search_filter).sort('created_at', -1).limit(50))
            return users
        except Exception as e:
            logger.error(f"Failed to search users: {e}")
            return []
    
    def get_all_conversations(self, page=1, limit=20):
        """Get paginated conversations with user and device details"""
        try:
            from bson import ObjectId
            
            skip = (page - 1) * limit
            
            # Aggregation pipeline to join with users and devices
            pipeline = [
                {
                    '$lookup': {
                        'from': 'users',
                        'localField': 'user_id',
                        'foreignField': '_id',
                        'as': 'user_info'
                    }
                },
                {
                    '$lookup': {
                        'from': 'devices',
                        'localField': 'device_id',
                        'foreignField': 'device_id',
                        'as': 'device_info'
                    }
                },
                {
                    '$unwind': {
                        'path': '$user_info',
                        'preserveNullAndEmptyArrays': True
                    }
                },
                {
                    '$unwind': {
                        'path': '$device_info',
                        'preserveNullAndEmptyArrays': True
                    }
                },
                {
                    '$addFields': {
                        'user_name': '$user_info.name',
                        'user_phone': '$user_info.phone',
                        'user_language': '$user_info.language',
                        'device_name': '$device_info.device_name'
                    }
                },
                {
                    '$project': {
                        'user_info': 0,
                        'device_info': 0
                    }
                },
                {
                    '$sort': {'timestamp': -1}
                },
                {
                    '$skip': skip
                },
                {
                    '$limit': limit
                }
            ]
            
            conversations = list(self.conversations.aggregate(pipeline))
            total = self.conversations.count_documents({})
            
            return {
                'conversations': conversations,
                'total': total,
                'page': page,
                'pages': (total + limit - 1) // limit
            }
        except Exception as e:
            logger.error(f"Failed to get all conversations: {e}")
            return None
    
    # ===== Device Management Methods =====
    
    def get_all_devices(self, page=1, limit=20):
        """Get paginated device list for admin"""
        try:
            skip = (page - 1) * limit
            
            # Aggregation to include user count per device
            pipeline = [
                {
                    '$lookup': {
                        'from': 'users',
                        'localField': 'device_id',
                        'foreignField': 'device_id',
                        'as': 'users'
                    }
                },
                {
                    '$addFields': {
                        'user_count': {'$size': '$users'},
                        'last_active': {'$max': '$users.updated_at'}
                    }
                },
                {
                    '$project': {
                        'users': 0,  # Remove the users array
                        'password_hash': 0,  # Don't expose password hash
                        'access_token': 0,  # Don't expose tokens
                        'refresh_token': 0
                    }
                },
                {
                    '$sort': {'created_at': -1}
                },
                {
                    '$skip': skip
                },
                {
                    '$limit': limit
                }
            ]
            
            devices = list(self.devices.aggregate(pipeline))
            total = self.devices.count_documents({})
            
            return {
                'devices': devices,
                'total': total,
                'page': page,
                'pages': (total + limit - 1) // limit
            }
        except Exception as e:
            logger.error(f"Failed to get devices: {e}")
            return None
    
    def get_device_statistics(self):
        """Get device statistics for admin dashboard"""
        try:
            total_devices = self.devices.count_documents({})
            
            # Devices by pipeline type
            pipeline_stats = list(self.devices.aggregate([
                {"$group": {"_id": "$pipeline_type", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]))
            
            # Devices by LLM service
            llm_stats = list(self.devices.aggregate([
                {"$group": {"_id": "$llm_service", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]))
            
            # Active devices (logged in within last 7 days)
            from datetime import timedelta
            seven_days_ago = get_ist_time() - timedelta(days=7)
            active_devices = self.devices.count_documents({
                "last_login": {"$gte": seven_days_ago}
            })
            
            return {
                'total_devices': total_devices,
                'active_devices': active_devices,
                'pipeline_stats': pipeline_stats,
                'llm_stats': llm_stats
            }
        except Exception as e:
            logger.error(f"Failed to get device statistics: {e}")
            return None
    
    def get_next_device_id(self):
        """Get the next available device ID (auto-increment starting from 1201)"""
        try:
            # Find the highest device_id
            last_device = self.devices.find_one(
                sort=[('device_id', -1)]
            )
            
            if last_device and 'device_id' in last_device:
                return last_device['device_id'] + 1
            else:
                # No devices yet, start from configured start value
                return Config.DEVICE_ID_START
        except Exception as e:
            logger.error(f"Failed to get next device ID: {e}")
            return Config.DEVICE_ID_START
    
    def create_device(self, device_id, device_name, password_hash, access_token, refresh_token, pipeline_type='library', llm_service='azure_openai'):
        """Create a new device record"""
        try:
            device_data = {
                'device_id': device_id,
                'device_name': device_name,
                'password_hash': password_hash,
                'access_token': access_token,
                'refresh_token': refresh_token,
                'pipeline_type': pipeline_type,  # 'library' or 'api'
                'llm_service': llm_service,  # 'gemini', 'openai', 'azure_openai', 'vertex'
                'created_at': get_ist_time(),
                'last_login': get_ist_time()
            }
            
            result = self.devices.insert_one(device_data)
            return result.inserted_id
        except Exception as e:
            logger.error(f"Failed to create device: {e}")
            raise
    
    def get_device_by_id(self, device_id):
        """Get device by device_id"""
        try:
            return self.devices.find_one({'device_id': device_id})
        except Exception as e:
            logger.error(f"Failed to get device: {e}")
            return None
    
    def get_device_by_android_id(self, android_id):
        """Get device by Android ID (for kiosk mode)"""
        try:
            return self.devices.find_one({'device_id': android_id})
        except Exception as e:
            logger.error(f"Failed to get device by Android ID: {e}")
            return None
    
    def create_device_for_android_id(self, android_id, source='android-webview', pipeline_type='library', llm_service='azure_openai'):
        """Create a new device record using Android ID as device_id (no auth)"""
        try:
            device_name = f"Device-{android_id[:8]}" if len(android_id) > 8 else f"Device-{android_id}"
            
            device_data = {
                'device_id': android_id,  # Android ID as primary key
                'device_name': device_name,
                'source': source,  # 'android-webview' or 'web'
                'pipeline_type': pipeline_type,
                'llm_service': llm_service,
                'created_at': get_ist_time(),
                'last_active': get_ist_time()
            }
            
            result = self.devices.insert_one(device_data)
            logger.info(f"Created device with Android ID: {android_id}")
            return result.inserted_id
        except Exception as e:
            logger.error(f"Failed to create device for Android ID: {e}")
            raise
    
    def update_device_last_active(self, device_id):
        """Update last_active timestamp for device"""
        try:
            result = self.devices.update_one(
                {'device_id': device_id},
                {'$set': {'last_active': get_ist_time()}}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to update device last_active: {e}")
            return False
   
    def get_device_by_token(self, token, token_type='access'):
        """Get device by access or refresh token"""
        try:
            field = f'{token_type}_token'
            return self.devices.find_one({field: token})
        except Exception as e:
            logger.error(f"Failed to get device by token: {e}")
            return None
    
    def update_device_tokens(self, device_id, access_token, refresh_token):
        """Update device tokens (called on login or token refresh)"""
        try:
            result = self.devices.update_one(
                {'device_id': device_id},
                {
                    '$set': {
                        'access_token': access_token,
                        'refresh_token': refresh_token,
                        'last_login': get_ist_time()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to update device tokens: {e}")
            return False
    
    def invalidate_device_tokens(self, device_id):
        """Invalidate device tokens (called on logout)"""
        try:
            result = self.devices.update_one(
                {'device_id': device_id},
                {
                    '$set': {
                        'access_token': None,
                        'refresh_token': None
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to invalidate device tokens: {e}")
            return False
    
    def get_device_pipeline_config(self, device_id):
        """Get pipeline configuration for a device"""
        try:
            device = self.devices.find_one(
                {'device_id': device_id},
                {'pipeline_type': 1, 'llm_service': 1, '_id': 0}
            )
            if device:
                return {
                    'pipeline_type': device.get('pipeline_type', 'library'),
                    'llm_service': device.get('llm_service', 'gemini')
                }
            return None
        except Exception as e:
            logger.error(f"Failed to get device pipeline config: {e}")
            return None
    
    def update_device_pipeline_config(self, device_id, pipeline_type=None, llm_service=None):
        """Update pipeline configuration for a device"""
        try:
            update_data = {}
            if pipeline_type is not None:
                update_data['pipeline_type'] = pipeline_type
            if llm_service is not None:
                update_data['llm_service'] = llm_service
            
            if not update_data:
                return False
            
            result = self.devices.update_one(
                {'device_id': device_id},
                {'$set': update_data}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to update device pipeline config: {e}")
            return False
    
    def delete_device_with_cascade(self, device_id):
        """Delete device and all associated users and conversations (CASCADE DELETE)"""
        try:
            logger.info(f"Starting cascade delete for device: {device_id}")
            
            # Step 1: Get all users associated with this device
            users = list(self.users.find({'device_id': device_id}))
            user_ids = [user['_id'] for user in users]
            
            logger.info(f"Found {len(user_ids)} users associated with device {device_id}")
            
            # Step 2: Delete all conversations for these users
            conversations_result = self.conversations.delete_many({'user_id': {'$in': user_ids}})
            logger.info(f"Deleted {conversations_result.deleted_count} conversations")
            
            # Step 3: Delete all users associated with this device
            users_result = self.users.delete_many({'device_id': device_id})
            logger.info(f"Deleted {users_result.deleted_count} users")
            
            # Step 4: Delete the device itself
            device_result = self.devices.delete_one({'device_id': device_id})
            logger.info(f"Deleted device: {device_result.deleted_count} device(s)")
            
            # Return summary of deletion
            return {
                'success': True,
                'device_deleted': device_result.deleted_count > 0,
                'users_deleted': users_result.deleted_count,
                'conversations_deleted': conversations_result.deleted_count,
                'total_deleted': device_result.deleted_count + users_result.deleted_count + conversations_result.deleted_count
            }
        except Exception as e:
            logger.error(f"Failed to cascade delete device {device_id}: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def close_connection(self):
        """Close database connection"""
        if self.client:
            self.client.close()

# Global database instance
db_manager = DatabaseManager()