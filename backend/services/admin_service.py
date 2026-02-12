import jwt
import bcrypt
import secrets
import logging
from datetime import datetime, timedelta
import pytz
from backend.models.database import db_manager
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
                    'created_at': get_ist_time(),
                    'updated_at': get_ist_time()
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
                'login_time': get_ist_time(),
                'expires_at': get_ist_time() + timedelta(seconds=self.session_expiry),
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
                'expires_at': {'$gt': get_ist_time()}
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
                        'updated_at': get_ist_time()
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
            from datetime import timedelta
            from bson import ObjectId
            
            # Get conversations from last N days
            start_date = get_ist_time() - timedelta(days=days)
            
            # Build match criteria
            match_criteria = {'timestamp': {'$gte': start_date}}
            if device_id and device_id != 'all':
                # Accept any device_id format (UUID, Android ID, legacy numeric string)
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
    
    def get_devices_list(self, page=1, limit=20, filters=None):
        """Get paginated devices list with optional filters"""
        if filters:
            # Build filter criteria
            match_stage = {}
            
            # Filter by source
            if filters.get('by_source'):
                match_stage['source'] = filters['by_source']
            
            # Filter by user count
            if filters.get('by_user_count'):
                if filters['by_user_count'] == 'zero_users':
                    # Will be filtered after aggregation
                    pass
                elif filters['by_user_count'] == 'min_users' and 'min_users' in filters:
                    # Will be filtered after aggregation
                    pass
            
            # Build aggregation pipeline
            pipeline = [
                {'$match': match_stage} if match_stage else {'$match': {}},
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
                        'user_count': {'$size': '$users'}
                    }
                },
                {'$project': {'users': 0}}  # Remove users array
            ]
            
            # Add user count filter
            if filters.get('by_user_count') == 'zero_users':
                pipeline.append({'$match': {'user_count': 0}})
            elif filters.get('by_user_count') == 'min_users' and 'min_users' in filters:
                pipeline.append({'$match': {'user_count': {'$gte': int(filters['min_users'])}}})
            
            # Add sorting
            pipeline.append({'$sort': {'created_at': -1}})
            
            # Get total count
            count_pipeline = pipeline + [{'$count': 'total'}]
            count_result = list(db_manager.devices.aggregate(count_pipeline))
            total = count_result[0]['total'] if count_result else 0
            
            # Add pagination
            skip = (page - 1) * limit
            pipeline.extend([
                {'$skip': skip},
                {'$limit': limit}
            ])
            
            devices = list(db_manager.devices.aggregate(pipeline))
            
            return {
                'devices': devices,
                'total': total,
                'page': page,
                'pages': (total + limit - 1) // limit
            }
        else:
            # No filters, use normal pagination
            return db_manager.get_all_devices(page, limit)
    
    def get_device_details(self, device_id):
        """Get detailed device information"""
        try:
            # Accept any device_id format (UUID, Android ID, legacy numeric string)
            device = db_manager.get_device_by_id(device_id)
            if device:
                # Get user count for this device
                user_count = db_manager.users.count_documents({'device_id': device_id})
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
            # Accept any device_id format (UUID, Android ID, legacy numeric string)
            return db_manager.update_device_pipeline_config(device_id, pipeline_type, llm_service)
        except Exception as e:
            logger.error(f"Failed to update device pipeline: {e}")
            return False
    
    def delete_device(self, device_id):
        """Delete device and all associated data (CASCADE DELETE)"""
        try:
            logger.info(f"Admin requesting cascade delete for device: {device_id}")
            result = db_manager.delete_device_with_cascade(device_id)
            
            if result.get('success'):
                logger.info(f"Successfully deleted device {device_id} with {result['users_deleted']} users and {result['conversations_deleted']} conversations")
            else:
                logger.error(f"Failed to delete device {device_id}: {result.get('error')}")
            
            return result
        except Exception as e:
            logger.error(f"Failed to delete device: {e}")
            return {'success': False, 'error': str(e)}
    
    def export_devices_data(self, filters=None):
        """Export devices data with optional filters"""
        try:
            # Build query based on filters
            query = {}
            
            if filters:
                # Filter by source (android-webview, web, etc.)
                if filters.get('source') and filters['source'] != 'all':
                    query['source'] = filters['source']
                
                # Filter by pipeline_type
                if filters.get('pipeline_type') and filters['pipeline_type'] != 'all':
                    query['pipeline_type'] = filters['pipeline_type']
                
                # Filter by llm_service
                if filters.get('llm_service') and filters['llm_service'] != 'all':
                    query['llm_service'] = filters['llm_service']
            
            # Get devices with user count
            pipeline = [
                {'$match': query},
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
                        'user_count': {'$size': '$users'}
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
                }
            ]
            
            devices = list(db_manager.devices.aggregate(pipeline))
            
            # Select columns based on filter
            selected_columns = filters.get('columns', ['device_id', 'device_name', 'pipeline_type', 'llm_service', 'source', 'user_count', 'created_at']) if filters else ['device_id', 'device_name', 'pipeline_type', 'llm_service', 'source', 'user_count', 'created_at']
            
            # Filter each device to only include selected columns
            filtered_devices = []
            for device in devices:
                filtered_device = {}
                for col in selected_columns:
                    if col in device:
                        value = device[col]
                        # Convert datetime to string
                        if isinstance(value, datetime):
                            filtered_device[col] = value.strftime('%Y-%m-%d %H:%M:%S')
                        else:
                            filtered_device[col] = value
                    else:
                        filtered_device[col] = None
                filtered_devices.append(filtered_device)
            
            return {
                'success': True,
                'devices': filtered_devices,
                'total': len(filtered_devices),
                'filters_applied': filters or {}
            }
        except Exception as e:
            logger.error(f"Failed to export devices data: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_available_sources(self):
        """Get list of unique sources from devices collection"""
        try:
            sources = db_manager.devices.distinct('source')
            return {
                'success': True,
                'sources': [s for s in sources if s]  # Filter out None/empty values
            }
        except Exception as e:
            logger.error(f"Failed to get available sources: {e}")
            return {'success': False, 'error': str(e)}
    
    def bulk_delete_devices(self, criteria):
        """Bulk delete devices based on criteria"""
        try:
            query = {}
            
            # Build query based on criteria
            if criteria.get('by_source'):
                query['source'] = criteria['by_source']
            
            if criteria.get('by_user_count') and criteria['by_user_count'] == 'zero_users':
                # We need to use aggregation to find devices with 0 users
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
                            'user_count': {'$size': '$users'}
                        }
                    },
                    {
                        '$match': {'user_count': 0}
                    },
                    {
                        '$project': {'device_id': 1}
                    }
                ]
                
                # Apply source filter if specified
                if query:
                    pipeline.insert(0, {'$match': query})
                
                devices_to_delete = list(db_manager.devices.aggregate(pipeline))
                device_ids = [d['device_id'] for d in devices_to_delete]
            else:
                # Get all devices matching the query
                devices_to_delete = list(db_manager.devices.find(query, {'device_id': 1}))
                device_ids = [d['device_id'] for d in devices_to_delete]
            
            if not device_ids:
                return {
                    'success': True,
                    'message': 'No devices match the criteria',
                    'summary': {
                        'devices_deleted': 0,
                        'users_deleted': 0,
                        'conversations_deleted': 0
                    }
                }
            
            # Delete each device with cascade
            total_devices = 0
            total_users = 0
            total_conversations = 0
            
            for device_id in device_ids:
                result = db_manager.delete_device_with_cascade(device_id)
                if result.get('success'):
                    total_devices += 1
                    total_users += result.get('users_deleted', 0)
                    total_conversations += result.get('conversations_deleted', 0)
            
            logger.info(f"Bulk delete completed: {total_devices} devices, {total_users} users, {total_conversations} conversations")
            
            return {
                'success': True,
                'message': f'Successfully deleted {total_devices} devices',
                'summary': {
                    'devices_deleted': total_devices,
                    'users_deleted': total_users,
                    'conversations_deleted': total_conversations
                }
            }
        except Exception as e:
            logger.error(f"Failed to bulk delete devices: {e}")
            return {'success': False, 'error': str(e)}
    
    def bulk_configure_devices(self, criteria, config):
        """Bulk update device configurations based on criteria"""
        try:
            query = {}
            
            # Build query based on criteria
            if criteria.get('by_source'):
                query['source'] = criteria['by_source']
            
            if criteria.get('by_user_count') and criteria.get('min_users'):
                # Use aggregation to find devices with user count >= min_users
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
                            'user_count': {'$size': '$users'}
                        }
                    },
                    {
                        '$match': {'user_count': {'$gte': int(criteria['min_users'])}}
                    },
                    {
                        '$project': {'device_id': 1}
                    }
                ]
                
                # Apply source filter if specified
                if query:
                    pipeline.insert(0, {'$match': query})
                
                devices_to_update = list(db_manager.devices.aggregate(pipeline))
                device_ids = [d['device_id'] for d in devices_to_update]
            else:
                # Get all devices matching the query
                devices_to_update = list(db_manager.devices.find(query, {'device_id': 1}))
                device_ids = [d['device_id'] for d in devices_to_update]
            
            if not device_ids:
                return {
                    'success': True,
                    'message': 'No devices match the criteria',
                    'devices_updated': 0
                }
            
            # Build update document
            update_doc = {}
            if config.get('pipeline_type'):
                update_doc['pipeline_type'] = config['pipeline_type']
            if config.get('llm_service'):
                update_doc['llm_service'] = config['llm_service']
            
            if not update_doc:
                return {
                    'success': False,
                    'error': 'No configuration provided'
                }
            
            # Update all matching devices
            result = db_manager.devices.update_many(
                {'device_id': {'$in': device_ids}},
                {'$set': update_doc}
            )
            
            logger.info(f"Bulk configure completed: {result.modified_count} devices updated")
            
            return {
                'success': True,
                'message': f'Successfully updated {result.modified_count} devices',
                'devices_updated': result.modified_count
            }
        except Exception as e:
            logger.error(f"Failed to bulk configure devices: {e}")
            return {'success': False, 'error': str(e)}

# Global admin service instance
admin_service = AdminService()