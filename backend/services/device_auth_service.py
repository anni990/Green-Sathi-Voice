import jwt
import bcrypt
import secrets
import logging
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
from backend.models.database import db_manager
from backend.utils.config import Config

logger = logging.getLogger(__name__)

class DeviceAuthService:
    """Handles device authentication, token generation, and session management"""
    
    def __init__(self):
        self.jwt_secret = Config.JWT_SECRET_KEY
        self.access_token_expiry = Config.ACCESS_TOKEN_EXPIRY
        self.refresh_token_expiry = Config.REFRESH_TOKEN_EXPIRY
        logger.info("Device authentication service initialized")
    
    def hash_password(self, password):
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def verify_password(self, password, password_hash):
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    
    def generate_access_token(self, device_id):
        """Generate JWT access token (1 hour expiry)"""
        payload = {
            'device_id': device_id,
            'type': 'access',
            'exp': datetime.utcnow() + timedelta(seconds=self.access_token_expiry),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, self.jwt_secret, algorithm='HS256')
    
    def generate_refresh_token(self, device_id):
        """Generate JWT refresh token (24 hour expiry)"""
        payload = {
            'device_id': device_id,
            'type': 'refresh',
            'exp': datetime.utcnow() + timedelta(seconds=self.refresh_token_expiry),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, self.jwt_secret, algorithm='HS256')
    
    def decode_token(self, token):
        """Decode and validate JWT token"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return None
    
    def register_device(self, device_name, password, pipeline_type='library', llm_service='gemini'):
        """Register a new device with pipeline configuration"""
        try:
            # Validate inputs
            if not device_name or len(device_name.strip()) < 3:
                return None, "Device name must be at least 3 characters"
            
            if not password or len(password) < 8:
                return None, "Password must be at least 8 characters"
            
            # Get next device ID
            device_id = db_manager.get_next_device_id()
            
            # Check if device_id already exists (shouldn't happen, but safety check)
            existing_device = db_manager.get_device_by_id(device_id)
            if existing_device:
                return None, "Device ID already exists. Please try again."
            
            # Hash password
            password_hash = self.hash_password(password)
            
            # Generate tokens
            access_token = self.generate_access_token(device_id)
            refresh_token = self.generate_refresh_token(device_id)
            
            # Create device record with pipeline configuration
            db_manager.create_device(
                device_id=device_id,
                device_name=device_name.strip(),
                password_hash=password_hash,
                access_token=access_token,
                refresh_token=refresh_token,
                pipeline_type=pipeline_type,
                llm_service=llm_service
            )
            
            logger.info(f"Device registered successfully: ID {device_id} with {pipeline_type} pipeline and {llm_service} LLM")
            return {
                'device_id': device_id,
                'device_name': device_name.strip(),
                'pipeline_type': pipeline_type,
                'llm_service': llm_service,
                'access_token': access_token,
                'refresh_token': refresh_token
            }, None
            
        except Exception as e:
            logger.error(f"Device registration failed: {e}")
            return None, "Registration failed. Please try again."
    
    def login_device(self, device_id, password):
        """Login device and generate new tokens (invalidates old session)"""
        try:
            # Get device from database
            device = db_manager.get_device_by_id(device_id)
            
            if not device:
                return None, "Invalid device ID or password"
            
            # Verify password
            if not self.verify_password(password, device['password_hash']):
                return None, "Invalid device ID or password"
            
            # Generate new tokens (this invalidates old tokens - single session)
            access_token = self.generate_access_token(device_id)
            refresh_token = self.generate_refresh_token(device_id)
            
            # Update tokens in database
            db_manager.update_device_tokens(device_id, access_token, refresh_token)
            
            logger.info(f"Device logged in successfully: ID {device_id}")
            return {
                'device_id': device_id,
                'device_name': device['device_name'],
                'access_token': access_token,
                'refresh_token': refresh_token
            }, None
            
        except Exception as e:
            logger.error(f"Device login failed: {e}")
            return None, "Login failed. Please try again."
    
    def refresh_access_token(self, refresh_token):
        """Generate new access token using refresh token"""
        try:
            # Decode refresh token
            payload = self.decode_token(refresh_token)
            
            if not payload or payload.get('type') != 'refresh':
                return None, "Invalid refresh token"
            
            device_id = payload.get('device_id')
            
            # Verify refresh token exists in database
            device = db_manager.get_device_by_token(refresh_token, 'refresh')
            
            if not device or device['device_id'] != device_id:
                return None, "Refresh token not found or invalid"
            
            # Generate new access token
            new_access_token = self.generate_access_token(device_id)
            
            # Update access token in database
            db_manager.update_device_tokens(device_id, new_access_token, refresh_token)
            
            logger.info(f"Access token refreshed for device: ID {device_id}")
            return {
                'access_token': new_access_token,
                'device_id': device_id
            }, None
            
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            return None, "Token refresh failed"
    
    def logout_device(self, device_id):
        """Logout device by invalidating tokens"""
        try:
            db_manager.invalidate_device_tokens(device_id)
            logger.info(f"Device logged out: ID {device_id}")
            return True
        except Exception as e:
            logger.error(f"Logout failed: {e}")
            return False
    
    def get_device_from_token(self, token):
        """Get device info from access token"""
        try:
            payload = self.decode_token(token)
            
            if not payload or payload.get('type') != 'access':
                return None
            
            device_id = payload.get('device_id')
            
            # Verify token exists in database
            device = db_manager.get_device_by_token(token, 'access')
            
            if device and device['device_id'] == device_id:
                return device
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get device from token: {e}")
            return None


# Global service instance
device_auth_service = DeviceAuthService()


def device_auth_required(f):
    """Decorator to protect routes with device authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({'error': 'No authorization token provided'}), 401
        
        # Extract token (format: "Bearer <token>")
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({'error': 'Invalid authorization header format'}), 401
        
        token = parts[1]
        
        # Verify token and get device
        device = device_auth_service.get_device_from_token(token)
        
        if not device:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Attach device info to request
        request.device = device
        request.device_id = device['device_id']
        
        return f(*args, **kwargs)
    
    return decorated_function
