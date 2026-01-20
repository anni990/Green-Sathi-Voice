from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv
import os
import logging
from backend.routes.voice_routes import voice_bp
from backend.routes.user_routes import user_bp
from backend.routes.admin_routes import admin_bp
from backend.routes.device_routes import device_bp
from backend.utils.config import Config

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    """Create and configure Flask application"""
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(Config)
    
    # Add secret key for sessions
    app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
    
    # Enable CORS for all routes
    CORS(app)
    
    # Create temp audio directory if it doesn't exist
    os.makedirs(app.config['AUDIO_UPLOAD_FOLDER'], exist_ok=True)
    
    # Register blueprints
    app.register_blueprint(voice_bp, url_prefix='/api/voice')
    app.register_blueprint(user_bp, url_prefix='/api/user')
    app.register_blueprint(admin_bp, url_prefix='/')
    app.register_blueprint(device_bp, url_prefix='/')
    
    # Main route
    @app.route('/')
    def index():
        return render_template('index.html')
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    logger.info("Starting Voice Bot application...")
    app.run(
        host=os.getenv('HOST', '0.0.0.0'),
        port=int(os.getenv('PORT', 5000)),
        debug=os.getenv('DEBUG', 'True').lower() == 'true'
    )

# app = create_app()