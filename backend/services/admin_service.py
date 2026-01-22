import jwt
import bcrypt
import secrets
import logging
from datetime import datetime, timedelta
from backend.models.database import db_manager
from backend.utils.config import Config

logger = logging.getLogger(__name__)

class AdminService:
    """Handles admin authentication and management operations with secure database storage"""
    
    def __init__(self):
        self.jwt_secret = Config.JWT_SECRET_KEY
        self.session_expiry = 86400  # 24 hours in seconds
        self._ensure_admin_exists()
        logger.info("Admin service initialized with database authentication")
    
    def _ensure_admin_exists(self):
        """Ensure default admin user exists in database"""
        try:
            admin = db_manager.admins.find_one({'username': 'admin'})
            if not admin:
                # Create default admin with password '123456'
                default_password = self._hash_password('123456')
                db_manager.admins.insert_one({
                    'username': 'admin',
                    'password_hash': default_password,
                    'created_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow()
                })
                logger.info("Default admin user created with username: admin, password: 123456")
        except Exception as e:
            logger.error(f"Failed to ensure admin exists: {e}")
    
    def _hash_password(self, password):
        """Hash password using bcrypt (secure)"""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def _verify_password(self, password, password_hash):
        """Verify password against bcrypt hash"""
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    
    def _generate_jwt_token(self, username):
        """Generate JWT session token"""
        payload = {
            'username': username,
            'type': 'admin_session',
            'exp': datetime.utcnow() + timedelta(seconds=self.session_expiry),
            'iat': datetime.utcnow(),
            'jti': secrets.token_hex(16)  # Unique token ID
        }
        return jwt.encode(payload, self.jwt_secret, algorithm='HS256')
    
    def _decode_jwt_token(self, token):
        """Decode and validate JWT token"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=['HS256'])
            if payload.get('type') != 'admin_session':
                return None
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Admin token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid admin token: {e}")
            return None
    
    def authenticate(self, username, password):
        """Authenticate admin user with database verification"""
        try:
            # Get admin from database
            admin = db_manager.admins.find_one({'username': username})
            
            if not admin:
                logger.warning(f"Admin login attempt with invalid username: {username}")
                return None
            
            # Verify password
            if not self._verify_password(password, admin['password_hash']):
                logger.warning(f"Admin login attempt with incorrect password for: {username}")
                return None
            
            # Generate JWT token
            token = self._generate_jwt_token(username)
            
            # Store session in database
            db_manager.admin_sessions.insert_one({
                'username': username,
                'token': token,
                'login_time': datetime.utcnow(),
                'expires_at': datetime.utcnow() + timedelta(seconds=self.session_expiry),
                'ip_address': None  # Can be added from request context
            })
            
            logger.info(f"Admin logged in successfully: {username}")
            return token
            
        except Exception as e:
            logger.error(f"Admin authentication error: {e}")
            return None
    
    def validate_session(self, token):
        """Validate admin session token"""
        try:
            # Decode JWT token
            payload = self._decode_jwt_token(token)
            if not payload:
                return False
            
            # Verify token exists in database and not expired
            session = db_manager.admin_sessions.find_one({
                'token': token,
                'expires_at': {'$gt': datetime.utcnow()}
            })
            
            if session:
                return True
            
            # Clean up expired session if found
            db_manager.admin_sessions.delete_one({'token': token})
            return False
            
        except Exception as e:
            logger.error(f"Session validation error: {e}")
            return False
    
    def logout(self, token):
        """Logout admin and remove session from database"""
        try:
            result = db_manager.admin_sessions.delete_one({'token': token})
            if result.deleted_count > 0:
                logger.info("Admin logged out successfully")
                return True
            return False
        except Exception as e:
            logger.error(f"Logout error: {e}")
            return False
    
    def change_password(self, token, current_password, new_password):
        """Change admin password in database"""
        try:
            # Validate session
            if not self.validate_session(token):
                return False, "Invalid session"
            
            # Get username from token
            payload = self._decode_jwt_token(token)
            if not payload:
                return False, "Invalid token"
            
            username = payload.get('username')
            
            # Get admin from database
            admin = db_manager.admins.find_one({'username': username})
            if not admin:
                return False, "Admin user not found"
            
            # Verify current password
            if not self._verify_password(current_password, admin['password_hash']):
                return False, "Current password is incorrect"
            
            # Validate new password
            if len(new_password) < 6:
                return False, "Password must be at least 6 characters long"
            
            # Hash and update new password
            new_password_hash = self._hash_password(new_password)
            db_manager.admins.update_one(
                {'username': username},
                {
                    '$set': {
                        'password_hash': new_password_hash,
                        'updated_at': datetime.utcnow()
                    }
                }
            )
            
            # Invalidate all existing sessions for security
            db_manager.admin_sessions.delete_many({'username': username})
            
            logger.info(f"Password changed successfully for admin: {username}")
            return True, "Password changed successfully. Please login again."
            
        except Exception as e:
            logger.error(f"Password change error: {e}")
            return False, "Password change failed"
    
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