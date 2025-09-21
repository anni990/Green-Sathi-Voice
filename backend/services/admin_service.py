import hashlib
import secrets
import logging
from datetime import datetime, timedelta
from backend.models.database import db_manager

logger = logging.getLogger(__name__)

class AdminService:
    """Handles admin authentication and management operations"""
    
    def __init__(self):
        self.admin_credentials = {
            'username': 'admin',
            'password': self._hash_password('123456')  # Default password
        }
        self.sessions = {}  # In-memory session storage
        logger.info("Admin service initialized")
    
    def _hash_password(self, password):
        """Hash password using SHA256"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def authenticate(self, username, password):
        """Authenticate admin user"""
        if (username == self.admin_credentials['username'] and 
            self._hash_password(password) == self.admin_credentials['password']):
            # Generate session token
            token = secrets.token_hex(32)
            self.sessions[token] = {
                'username': username,
                'login_time': datetime.utcnow()
            }
            return token
        return None
    
    def validate_session(self, token):
        """Validate admin session token"""
        if token in self.sessions:
            session = self.sessions[token]
            # Check if session is less than 24 hours old
            if datetime.utcnow() - session['login_time'] < timedelta(hours=24):
                return True
            else:
                # Remove expired session
                del self.sessions[token]
        return False
    
    def logout(self, token):
        """Logout admin and remove session"""
        if token in self.sessions:
            del self.sessions[token]
            return True
        return False
    
    def change_password(self, token, current_password, new_password):
        """Change admin password"""
        if not self.validate_session(token):
            return False, "Invalid session"
        
        if self._hash_password(current_password) != self.admin_credentials['password']:
            return False, "Current password is incorrect"
        
        if len(new_password) < 6:
            return False, "Password must be at least 6 characters long"
        
        self.admin_credentials['password'] = self._hash_password(new_password)
        return True, "Password changed successfully"
    
    def get_dashboard_stats(self):
        """Get comprehensive dashboard statistics"""
        try:
            user_stats = db_manager.get_user_statistics()
            conversation_stats = db_manager.get_conversation_statistics()
            
            if not user_stats or not conversation_stats:
                return None
            
            # System stats
            system_stats = {
                'uptime': '24/7',  # This could be calculated from app start time
                'status': 'Active',
                'version': '1.0.0'
            }
            
            return {
                'users': user_stats,
                'conversations': conversation_stats,
                'system': system_stats
            }
        except Exception as e:
            logger.error(f"Failed to get dashboard stats: {e}")
            return None
    
    def get_users_list(self, page=1, limit=20):
        """Get paginated users list"""
        return db_manager.get_all_users(page, limit)
    
    def get_user_details(self, user_id):
        """Get detailed user information with conversations"""
        try:
            from bson import ObjectId
            user = db_manager.users.find_one({'_id': ObjectId(user_id)})
            if user:
                conversations = db_manager.get_user_conversations(user_id, limit=5)
                user['recent_conversations'] = conversations['conversations'] if conversations else []
                return user
        except Exception as e:
            logger.error(f"Failed to get user details: {e}")
        return None
    
    def search_users(self, query):
        """Search users by name or phone"""
        return db_manager.search_users(query)
    
    def get_all_conversations(self, page=1, limit=20):
        """Get paginated conversations with user details"""
        try:
            from bson import ObjectId
            
            skip = (page - 1) * limit
            
            # Use aggregation to join conversations with users
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
                    '$unwind': {
                        'path': '$user_info',
                        'preserveNullAndEmptyArrays': True
                    }
                },
                {
                    '$addFields': {
                        'user_name': '$user_info.name',
                        'user_phone': '$user_info.phone',
                        'user_language': '$user_info.language'
                    }
                },
                {
                    '$project': {
                        'user_info': 0  # Remove the user_info field to clean up
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
            
            conversations = list(db_manager.conversations.aggregate(pipeline))
            total = db_manager.conversations.count_documents({})
            
            return {
                'conversations': conversations,
                'total': total,
                'page': page,
                'pages': (total + limit - 1) // limit
            }
        except Exception as e:
            logger.error(f"Failed to get all conversations: {e}")
            return None

    def get_conversation_analytics(self, days=30):
        """Get detailed conversation analytics"""
        try:
            from datetime import datetime, timedelta
            
            # Get conversations from last N days
            start_date = datetime.utcnow() - timedelta(days=days)
            
            conversations = list(db_manager.conversations.find({
                'timestamp': {'$gte': start_date}
            }))
            
            # Analyze conversation patterns
            hourly_distribution = {}
            language_distribution = {}
            avg_response_length = 0
            
            for conv in conversations:
                # Hour distribution
                hour = conv['timestamp'].hour
                hourly_distribution[hour] = hourly_distribution.get(hour, 0) + 1
                
                # Response length
                if 'bot_response' in conv:
                    avg_response_length += len(conv['bot_response'])
            
            if conversations:
                avg_response_length = avg_response_length / len(conversations)
            
            return {
                'total_conversations': len(conversations),
                'hourly_distribution': hourly_distribution,
                'avg_response_length': round(avg_response_length, 2),
                'period_days': days
            }
        except Exception as e:
            logger.error(f"Failed to get conversation analytics: {e}")
            return None

# Global admin service instance
admin_service = AdminService()