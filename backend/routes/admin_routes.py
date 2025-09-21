from flask import Blueprint, request, jsonify, render_template, session, redirect, url_for
import logging
from backend.services.admin_service import admin_service
from backend.models.database import db_manager
from bson import ObjectId
from datetime import datetime

logger = logging.getLogger(__name__)

def convert_objectids_to_strings(obj):
    """Recursively convert ObjectIds to strings in dictionaries and lists"""
    if isinstance(obj, dict):
        return {key: convert_objectids_to_strings(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_objectids_to_strings(item) for item in obj]
    elif isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, datetime):
        return obj.strftime('%Y-%m-%d %H:%M:%S')
    else:
        return obj
admin_bp = Blueprint('admin', __name__)

def require_admin_auth():
    """Decorator to require admin authentication"""
    def decorator(f):
        def decorated_function(*args, **kwargs):
            token = session.get('admin_token')
            if not token or not admin_service.validate_session(token):
                # For AJAX requests, return JSON error instead of redirect
                if request.is_json or request.path.startswith('/admin/api/'):
                    return jsonify({'success': False, 'message': 'Authentication required'}), 401
                return redirect(url_for('admin.login'))
            return f(*args, **kwargs)
        decorated_function.__name__ = f.__name__
        return decorated_function
    return decorator

@admin_bp.route('/admin')
def admin_redirect():
    """Redirect /admin to /admin/login"""
    return redirect(url_for('admin.login'))

@admin_bp.route('/admin/login', methods=['GET', 'POST'])
def login():
    """Admin login page"""
    if request.method == 'POST':
        try:
            data = request.get_json()
            username = data.get('username')
            password = data.get('password')
            
            token = admin_service.authenticate(username, password)
            if token:
                session['admin_token'] = token
                return jsonify({'success': True, 'message': 'Login successful'})
            else:
                return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
                
        except Exception as e:
            logger.error(f"Login error: {e}")
            return jsonify({'success': False, 'message': 'Internal server error'}), 500
    
    # Check if already logged in
    token = session.get('admin_token')
    if token and admin_service.validate_session(token):
        return redirect(url_for('admin.dashboard'))
    
    return render_template('admin/login.html')

@admin_bp.route('/admin/logout', methods=['GET', 'POST'])
def logout():
    """Admin logout"""
    try:
        token = session.get('admin_token')
        if token:
            admin_service.logout(token)
        
        # Clear all session data
        session.clear()
        
        # For AJAX requests, return JSON
        if request.is_json or request.method == 'POST':
            return jsonify({'success': True, 'message': 'Logged out successfully'})
        
        # For regular requests, redirect to login
        return redirect(url_for('admin.login'))
    except Exception as e:
        logger.error(f"Error during logout: {e}")
        if request.is_json or request.method == 'POST':
            return jsonify({'success': False, 'message': 'Logout failed'}), 500
        return redirect(url_for('admin.login'))

@admin_bp.route('/admin/dashboard')
@require_admin_auth()
def dashboard():
    """Admin dashboard page"""
    return render_template('admin/dashboard.html')

@admin_bp.route('/admin/api/dashboard')
@require_admin_auth()
def get_stats():
    """API endpoint for dashboard statistics"""
    try:
        stats = admin_service.get_dashboard_stats()
        if stats:
            # Convert all ObjectIds to strings using the utility function
            stats = convert_objectids_to_strings(stats)
            return jsonify({'success': True, 'data': stats})
        else:
            # Return default empty stats if no data is available
            default_stats = {
                'users': {
                    'total_users': 0,
                    'recent_users': 0,
                    'language_stats': [],
                    'daily_users': []
                },
                'conversations': {
                    'total_conversations': 0,
                    'daily_conversations': [],
                    'avg_conversations_per_user': 0,
                    'active_users': []
                },
                'system': {
                    'uptime': '24/7',
                    'status': 'Active',
                    'version': '1.0.0'
                }
            }
            return jsonify({'success': True, 'data': default_stats})
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        return jsonify({'success': False, 'message': f'Internal server error: {str(e)}'}), 500

@admin_bp.route('/admin/api/users')
@require_admin_auth()
def get_users():
    """API endpoint for users list"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        search = request.args.get('search', '').strip()
        
        if search:
            # Handle search separately
            users = admin_service.search_users(search)
            users_data = {
                'users': users[:limit],  # Limit results
                'total': len(users),
                'page': page,
                'total_pages': (len(users) + limit - 1) // limit
            }
        else:
            # Get paginated users
            users_data = admin_service.get_users_list(page, limit)
        
        if users_data and 'users' in users_data:
            # Convert all ObjectIds to strings using utility function
            users_data = convert_objectids_to_strings(users_data)
            return jsonify({'success': True, 'data': users_data})
        else:
            # Return empty data if no users found
            return jsonify({
                'success': True, 
                'data': {
                    'users': [],
                    'total': 0,
                    'page': page,
                    'total_pages': 0
                }
            })
    except Exception as e:
        logger.error(f"Error getting users: {e}")
        return jsonify({'success': False, 'message': f'Internal server error: {str(e)}'}), 500

@admin_bp.route('/admin/api/users/<user_id>')
@require_admin_auth()
def get_user_details(user_id):
    """API endpoint for specific user details"""
    try:
        user = admin_service.get_user_details(user_id)
        if user:
            # Convert all ObjectIds to strings using utility function
            user = convert_objectids_to_strings(user)
            return jsonify({'success': True, 'data': user})
        else:
            return jsonify({'success': False, 'message': 'User not found'}), 404
    except Exception as e:
        logger.error(f"Error getting user details: {e}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

@admin_bp.route('/admin/api/conversations')
@require_admin_auth()
def get_all_conversations():
    """API endpoint for all conversations"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        
        conversations_data = admin_service.get_all_conversations(page, limit)
        if conversations_data:
            # Convert all ObjectIds to strings using utility function
            conversations_data = convert_objectids_to_strings(conversations_data)
            return jsonify({'success': True, 'data': conversations_data})
        else:
            return jsonify({'success': True, 'data': {'conversations': [], 'total': 0, 'page': page, 'pages': 0}})
    except Exception as e:
        logger.error(f"Error getting conversations: {e}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

@admin_bp.route('/admin/api/users/<user_id>/conversations')
@require_admin_auth()
def get_user_conversations(user_id):
    """API endpoint for user conversations"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        
        conversations_data = db_manager.get_user_conversations(user_id, page, limit)
        if conversations_data:
            # Convert all ObjectIds to strings using utility function
            conversations_data = convert_objectids_to_strings(conversations_data)
            return jsonify({'success': True, 'data': conversations_data})
        else:
            return jsonify({'success': True, 'data': {'conversations': [], 'total': 0, 'page': page, 'pages': 0}})
    except Exception as e:
        logger.error(f"Error getting user conversations: {e}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

@admin_bp.route('/admin/api/search')
@require_admin_auth()
def search_users():
    """API endpoint for searching users"""
    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'success': False, 'message': 'Search query required'}), 400
        
        users = admin_service.search_users(query)
        
        # Convert all ObjectIds to strings using utility function
        users = convert_objectids_to_strings(users)
        
        return jsonify({'success': True, 'data': users})
    except Exception as e:
        logger.error(f"Error searching users: {e}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

@admin_bp.route('/admin/api/analytics')
@require_admin_auth()
def get_analytics():
    """API endpoint for detailed analytics"""
    try:
        days = request.args.get('days', 30, type=int)
        analytics = admin_service.get_conversation_analytics(days)
        
        if analytics:
            # Convert any ObjectIds to strings using utility function
            analytics = convert_objectids_to_strings(analytics)
            return jsonify({'success': True, 'data': analytics})
        else:
            return jsonify({'success': False, 'message': 'Failed to get analytics'}), 500
    except Exception as e:
        logger.error(f"Error getting analytics: {e}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

@admin_bp.route('/admin/api/change-password', methods=['POST'])
@require_admin_auth()
def change_password():
    """API endpoint for changing admin password"""
    try:
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        if not all([current_password, new_password, confirm_password]):
            return jsonify({'success': False, 'message': 'All fields are required'}), 400
        
        if new_password != confirm_password:
            return jsonify({'success': False, 'message': 'New passwords do not match'}), 400
        
        token = session.get('admin_token')
        success, message = admin_service.change_password(token, current_password, new_password)
        
        if success:
            return jsonify({'success': True, 'message': message})
        else:
            return jsonify({'success': False, 'message': message}), 400
            
    except Exception as e:
        logger.error(f"Error changing password: {e}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500