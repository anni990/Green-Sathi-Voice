from pymongo import MongoClient
from datetime import datetime
import logging
from backend.utils.config import Config

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Handles MongoDB database operations"""
    
    def __init__(self):
        try:
            self.client = MongoClient(Config.MONGODB_URL)
            self.db = self.client[Config.DB_NAME]
            self.users = self.db.users
            self.conversations = self.db.conversations
            self.devices = self.db.devices
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
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
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
                    'updated_at': datetime.utcnow()
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
            conversation_data = {
                'user_id': user_id,
                'device_id': device_id,
                'session_id': session_id,
                'user_input': user_input,
                'bot_response': bot_response,
                'timestamp': datetime.utcnow()
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
            from datetime import datetime, timedelta
            seven_days_ago = datetime.utcnow() - timedelta(days=7)
            recent_users = self.users.count_documents({
                "created_at": {"$gte": seven_days_ago}
            })
            
            # Users by date (last 30 days)
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
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
            from datetime import datetime, timedelta
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
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
            skip = (page - 1) * limit
            # user_id is stored as string in the database, not ObjectId
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
    
    # ===== Device Management Methods =====
    
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
    
    def create_device(self, device_id, device_name, password_hash, access_token, refresh_token, pipeline_type='library', llm_service='gemini'):
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
                'created_at': datetime.utcnow(),
                'last_login': datetime.utcnow()
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
                        'last_login': datetime.utcnow()
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
    
    def close_connection(self):
        """Close database connection"""
        if self.client:
            self.client.close()

# Global database instance
db_manager = DatabaseManager()