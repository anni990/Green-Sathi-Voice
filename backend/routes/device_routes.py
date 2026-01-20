from flask import Blueprint, request, jsonify, render_template
import logging
from backend.services.device_auth_service import device_auth_service, device_auth_required
from backend.models.database import db_manager
from backend.services.pipeline_service import pipeline_service
from backend.utils.config import Config

logger = logging.getLogger(__name__)

device_bp = Blueprint('device', __name__)

@device_bp.route('/register', methods=['GET'])
def register_page():
    """Render device registration page"""
    return render_template('device_register.html')

@device_bp.route('/login', methods=['GET'])
def login_page():
    """Render device login page"""
    return render_template('device_login.html')

@device_bp.route('/settings', methods=['GET'])
def settings_page():
    """Render device settings page"""
    return render_template('device_settings.html')

@device_bp.route('/api/device/suggest_id', methods=['GET'])
def suggest_device_id():
    """Get the next available device ID for registration"""
    try:
        next_id = db_manager.get_next_device_id()
        return jsonify({
            'success': True,
            'device_id': next_id
        }), 200
    except Exception as e:
        logger.error(f"Failed to suggest device ID: {e}")
        return jsonify({'error': 'Failed to generate device ID'}), 500

@device_bp.route('/api/device/register', methods=['POST'])
def register_device():
    """Register a new device"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        device_name = data.get('device_name', '').strip()
        password = data.get('password', '')
        confirm_password = data.get('confirm_password', '')
        pipeline_type = data.get('pipeline_type', Config.DEFAULT_PIPELINE_TYPE)
        llm_service = data.get('llm_service', Config.DEFAULT_LLM_SERVICE_TYPE)
        
        # Validate inputs
        if not device_name:
            return jsonify({'error': 'Device name is required'}), 400
        
        if len(device_name) < 3:
            return jsonify({'error': 'Device name must be at least 3 characters'}), 400
        
        if not password:
            return jsonify({'error': 'Password is required'}), 400
        
        if len(password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters'}), 400
        
        if password != confirm_password:
            return jsonify({'error': 'Passwords do not match'}), 400
        
        # Validate pipeline configuration
        if pipeline_type not in Config.VALID_PIPELINE_TYPES:
            return jsonify({'error': f'Invalid pipeline type. Must be one of: {Config.VALID_PIPELINE_TYPES}'}), 400
        
        if llm_service not in Config.VALID_LLM_SERVICES:
            return jsonify({'error': f'Invalid LLM service. Must be one of: {Config.VALID_LLM_SERVICES}'}), 400
        
        # Register device with pipeline configuration
        result, error = device_auth_service.register_device(
            device_name, password, pipeline_type, llm_service
        )
        
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Device registered successfully',
            'device_id': result['device_id'],
            'device_name': result['device_name'],
            'pipeline_type': result.get('pipeline_type', pipeline_type),
            'llm_service': result.get('llm_service', llm_service),
            'access_token': result['access_token'],
            'refresh_token': result['refresh_token']
        }), 201
        
    except Exception as e:
        logger.error(f"Registration endpoint error: {e}")
        return jsonify({'error': 'Registration failed'}), 500

@device_bp.route('/api/device/login', methods=['POST'])
def login_device():
    """Login device and generate tokens"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        device_id = data.get('device_id')
        password = data.get('password', '')
        
        # Validate inputs
        if not device_id:
            return jsonify({'error': 'Device ID is required'}), 400
        
        try:
            device_id = int(device_id)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid device ID format'}), 400
        
        if not password:
            return jsonify({'error': 'Password is required'}), 400
        
        # Login device
        result, error = device_auth_service.login_device(device_id, password)
        
        if error:
            return jsonify({'error': error}), 401
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'device_id': result['device_id'],
            'device_name': result['device_name'],
            'access_token': result['access_token'],
            'refresh_token': result['refresh_token']
        }), 200
        
    except Exception as e:
        logger.error(f"Login endpoint error: {e}")
        return jsonify({'error': 'Login failed'}), 500

@device_bp.route('/api/device/refresh', methods=['POST'])
def refresh_token():
    """Refresh access token using refresh token"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        refresh_token = data.get('refresh_token')
        
        if not refresh_token:
            return jsonify({'error': 'Refresh token is required'}), 400
        
        # Refresh token
        result, error = device_auth_service.refresh_access_token(refresh_token)
        
        if error:
            return jsonify({'error': error}), 401
        
        return jsonify({
            'success': True,
            'access_token': result['access_token'],
            'device_id': result['device_id']
        }), 200
        
    except Exception as e:
        logger.error(f"Token refresh endpoint error: {e}")
        return jsonify({'error': 'Token refresh failed'}), 500

@device_bp.route('/api/device/logout', methods=['POST'])
@device_auth_required
def logout_device():
    """Logout device and invalidate tokens"""
    try:
        device_id = request.device_id
        
        success = device_auth_service.logout_device(device_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Logout successful'
            }), 200
        else:
            return jsonify({'error': 'Logout failed'}), 500
        
    except Exception as e:
        logger.error(f"Logout endpoint error: {e}")
        return jsonify({'error': 'Logout failed'}), 500

@device_bp.route('/api/device/info', methods=['GET'])
@device_auth_required
def get_device_info():
    """Get current device information"""
    try:
        device = request.device
        
        return jsonify({
            'success': True,
            'device_id': device['device_id'],
            'device_name': device['device_name'],
            'created_at': device['created_at'].strftime('%Y-%m-%d %H:%M:%S') if device.get('created_at') else None,
            'last_login': device['last_login'].strftime('%Y-%m-%d %H:%M:%S') if device.get('last_login') else None
        }), 200
        
    except Exception as e:
        logger.error(f"Get device info error: {e}")
        return jsonify({'error': 'Failed to get device info'}), 500

@device_bp.route('/api/device/validate', methods=['POST'])
def validate_token():
    """Validate access token (no decorator to avoid double validation)"""
    try:
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({'valid': False, 'error': 'No token provided'}), 401
        
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({'valid': False, 'error': 'Invalid header format'}), 401
        
        token = parts[1]
        device = device_auth_service.get_device_from_token(token)
        
        if device:
            return jsonify({
                'valid': True,
                'device_id': device['device_id'],
                'device_name': device['device_name']
            }), 200
        else:
            return jsonify({'valid': False, 'error': 'Invalid or expired token'}), 401
        
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        return jsonify({'valid': False, 'error': 'Validation failed'}), 500

@device_bp.route('/api/device/config', methods=['GET'])
@device_auth_required
def get_pipeline_config():
    """Get current device pipeline configuration"""
    try:
        device_id = request.device_id
        config = pipeline_service.get_device_config_info(device_id)
        
        if config:
            return jsonify({
                'success': True,
                'config': config
            }), 200
        else:
            return jsonify({'error': 'Configuration not found'}), 404
        
    except Exception as e:
        logger.error(f"Get pipeline config error: {e}")
        return jsonify({'error': 'Failed to get configuration'}), 500

@device_bp.route('/api/device/config', methods=['PUT'])
@device_auth_required
def update_pipeline_config():
    """Update device pipeline configuration"""
    try:
        device_id = request.device_id
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        pipeline_type = data.get('pipeline_type')
        llm_service = data.get('llm_service')
        
        # Validate inputs
        if pipeline_type and pipeline_type not in Config.VALID_PIPELINE_TYPES:
            return jsonify({
                'error': f'Invalid pipeline type. Must be one of: {Config.VALID_PIPELINE_TYPES}'
            }), 400
        
        if llm_service and llm_service not in Config.VALID_LLM_SERVICES:
            return jsonify({
                'error': f'Invalid LLM service. Must be one of: {Config.VALID_LLM_SERVICES}'
            }), 400
        
        # Update configuration
        success = db_manager.update_device_pipeline_config(
            device_id, pipeline_type, llm_service
        )
        
        if success:
            # Clear pipeline cache for this device
            pipeline_service.clear_pipeline_cache(device_id)
            
            return jsonify({
                'success': True,
                'message': 'Configuration updated successfully'
            }), 200
        else:
            return jsonify({'error': 'Failed to update configuration'}), 500
        
    except Exception as e:
        logger.error(f"Update pipeline config error: {e}")
        return jsonify({'error': 'Failed to update configuration'}), 500

@device_bp.route('/api/device/available_options', methods=['GET'])
def get_available_options():
    """Get available pipeline and LLM options"""
    return jsonify({
        'success': True,
        'options': {
            'pipeline_types': Config.VALID_PIPELINE_TYPES,
            'llm_services': Config.VALID_LLM_SERVICES,
            'defaults': {
                'pipeline_type': Config.DEFAULT_PIPELINE_TYPE,
                'llm_service': Config.DEFAULT_LLM_SERVICE_TYPE
            }
        }
    }), 200
