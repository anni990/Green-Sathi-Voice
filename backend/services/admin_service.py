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
        """Get paginated conversations with user and device details"""
        return db_manager.get_all_conversations(page, limit)

    def get_conversation_analytics(self, days=30, device_id=None):
        """Get detailed conversation analytics with optional device filtering"""
        try:
            from datetime import datetime, timedelta
            from bson import ObjectId
            
            # Get conversations from last N days
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Build match criteria
            match_criteria = {'timestamp': {'$gte': start_date}}
            if device_id and device_id != 'all':
                try:
                    match_criteria['device_id'] = int(device_id)
                except (ValueError, TypeError):
                    match_criteria['device_id'] = device_id
            
            # Aggregation pipeline to get conversations with user data
            pipeline = [
                {
                    '$match': match_criteria
                },
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
                }
            ]
            
            conversations = list(db_manager.conversations.aggregate(pipeline))
            
            # Analyze conversation patterns
            hourly_distribution = {}
            language_distribution = {}
            daily_trend = {}
            device_distribution = {}
            avg_response_length = 0
            total_users = set()
            
            for conv in conversations:
                # Hour distribution
                hour = conv['timestamp'].hour
                hourly_distribution[hour] = hourly_distribution.get(hour, 0) + 1
                
                # Daily trend
                date_str = conv['timestamp'].strftime('%Y-%m-%d')
                daily_trend[date_str] = daily_trend.get(date_str, 0) + 1
                
                # Language distribution (from user_info)
                if 'user_info' in conv and conv['user_info']:
                    language = conv['user_info'].get('language', 'Unknown')
                    language_distribution[language] = language_distribution.get(language, 0) + 1
                    
                    # Track unique users
                    if '_id' in conv['user_info']:
                        total_users.add(str(conv['user_info']['_id']))
                
                # Device distribution
                if 'device_id' in conv and conv['device_id']:
                    device_id = conv['device_id']
                    device_distribution[device_id] = device_distribution.get(device_id, 0) + 1
                
                # Response length
                if 'bot_response' in conv:
                    avg_response_length += len(conv['bot_response'])
            
            if conversations:
                avg_response_length = avg_response_length / len(conversations)
            
            # Sort daily trend by date
            daily_trend_sorted = [{'date': k, 'count': v} for k, v in sorted(daily_trend.items())]
            
            # Convert language_distribution to list format
            language_dist_list = [{'language': k, 'count': v} for k, v in language_distribution.items()]
            
            # Convert device_distribution to list format
            device_dist_list = [{'device_id': k, 'count': v} for k, v in device_distribution.items()]
            
            return {
                'total_conversations': len(conversations),
                'unique_users': len(total_users),
                'hourly_distribution': hourly_distribution,
                'language_distribution': language_dist_list,
                'daily_trend': daily_trend_sorted,
                'device_distribution': device_dist_list,
                'avg_response_length': round(avg_response_length, 2),
                'period_days': days
            }
        except Exception as e:
            logger.error(f"Failed to get conversation analytics: {e}")
            return None
    
    def get_devices_list(self, page=1, limit=20):
        """Get paginated devices list"""
        return db_manager.get_all_devices(page, limit)
    
    def get_device_details(self, device_id):
        """Get detailed device information"""
        try:
            device = db_manager.get_device_by_id(int(device_id))
            if device:
                # Get user count for this device
                user_count = db_manager.users.count_documents({'device_id': int(device_id)})
                device['user_count'] = user_count
                
                # Remove sensitive data
                device.pop('password_hash', None)
                device.pop('access_token', None)
                device.pop('refresh_token', None)
                
                return device
        except Exception as e:
            logger.error(f"Failed to get device details: {e}")
        return None
    
    def update_device_pipeline(self, device_id, pipeline_type=None, llm_service=None):
        """Update device pipeline configuration"""
        try:
            return db_manager.update_device_pipeline_config(int(device_id), pipeline_type, llm_service)
        except Exception as e:
            logger.error(f"Failed to update device pipeline: {e}")
            return False

# Global admin service instance
admin_service = AdminService()