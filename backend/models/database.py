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
            logger.info("Connected to MongoDB successfully")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    
    def create_user(self, name, phone, language):
        """Create a new user record"""
        try:
            user_data = {
                'name': name,
                'phone': phone,
                'language': language,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            
            # Check if user already exists
            existing_user = self.users.find_one({'phone': phone})
            if existing_user:
                # Update existing user
                self.users.update_one(
                    {'phone': phone},
                    {'$set': {
                        'name': name,
                        'language': language,
                        'updated_at': datetime.utcnow()
                    }}
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
    
    def create_conversation(self, user_id, user_input, bot_response, session_id=None):
        """Save conversation turn to database"""
        try:
            conversation_data = {
                'user_id': user_id,
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
    
    def close_connection(self):
        """Close database connection"""
        if self.client:
            self.client.close()

# Global database instance
db_manager = DatabaseManager()