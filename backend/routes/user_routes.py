from flask import Blueprint, request, jsonify
import uuid
import logging
from backend.models.database import db_manager
from backend.services.device_auth_service import device_auth_required

logger = logging.getLogger(__name__)
user_bp = Blueprint('user', __name__)

@user_bp.route('/register', methods=['POST'])
@device_auth_required
def register_user():
    """Register a new user with name, phone, and language"""
    try:
        data = request.get_json()
        name = data.get('name', '').strip()
        phone = data.get('phone', '').strip()
        language = data.get('language', 'english').strip().lower()
        device_id = request.device_id  # From device_auth_required decorator
        
        if not name or not phone:
            return jsonify({'error': 'Name and phone are required'}), 400
        
        # Create user in database with device_id
        user_id = db_manager.create_user(name, phone, language, device_id)
        
        # Generate session ID
        session_id = str(uuid.uuid4())
        
        return jsonify({
            'user_id': str(user_id),
            'session_id': session_id,
            'name': name,
            'phone': phone,
            'language': language,
            'device_id': device_id,
            'message': 'User registered successfully'
        })
        
    except Exception as e:
        logger.error(f"Error registering user: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@user_bp.route('/profile/<phone>', methods=['GET'])
@device_auth_required
def get_user_profile(phone):
    """Get user profile by phone number"""
    try:
        device_id = request.device_id
        user = db_manager.get_user(phone)
        
        if user:
            # Only return user if it belongs to the requesting device
            if user.get('device_id') == device_id or user.get('device_id') is None:
                return jsonify({
                    'user_id': str(user['_id']),
                    'name': user['name'],
                    'phone': user['phone'],
                    'language': user['language'],
                    'created_at': user['created_at'].isoformat()
                })
            else:
                return jsonify({'error': 'User not found'}), 404
        else:
            return jsonify({'error': 'User not found'}), 404
            
    except Exception as e:
        logger.error(f"Error getting user profile: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@user_bp.route('/conversation_history/<user_id>', methods=['GET'])
@device_auth_required
def get_conversation_history(user_id):
    """Get conversation history for a user"""
    try:
        session_id = request.args.get('session_id')
        limit = int(request.args.get('limit', 50))
        
        conversations = db_manager.get_conversation_history(user_id, session_id, limit)
        
        # Format conversations for response
        formatted_conversations = []
        for conv in conversations:
            formatted_conversations.append({
                'user_input': conv.get('user_input', ''),
                'bot_response': conv.get('bot_response', ''),
                'timestamp': conv.get('timestamp').isoformat() if conv.get('timestamp') else None
            })
        
        return jsonify({
            'conversations': formatted_conversations,
            'count': len(formatted_conversations)
        })
        
    except Exception as e:
        logger.error(f"Error getting conversation history: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@user_bp.route('/session/<user_id>', methods=['POST'])
@device_auth_required
def create_new_session(user_id):
    """Create a new conversation session for user"""
    try:
        session_id = str(uuid.uuid4())
        
        return jsonify({
            'session_id': session_id,
            'user_id': user_id,
            'message': 'New session created'
        })
        
    except Exception as e:
        logger.error(f"Error creating new session: {e}")
        return jsonify({'error': 'Internal server error'}), 500