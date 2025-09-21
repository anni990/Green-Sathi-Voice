#!/usr/bin/env python3
"""
Setup script to initialize the Voice Bot application.
This script generates static audio prompts and sets up the environment.
"""

import os
import sys
from gtts import gTTS
from backend.utils.config import Config

def create_static_audio_files():
    """Generate all static audio files for different languages"""
    
    print("Generating static audio files...")
    
    # Create static audio directory
    static_audio_dir = os.path.join('static', 'audio')
    os.makedirs(static_audio_dir, exist_ok=True)
    
    # Generate audio for each prompt type and language
    for prompt_type, prompts in Config.LANGUAGE_PROMPTS.items():
        for language, text in prompts.items():
            try:
                filename = f"static_{prompt_type}_{language}.mp3"
                filepath = os.path.join(static_audio_dir, filename)
                
                print(f"Generating: {filename}")
                
                # Create TTS
                tts = gTTS(text=text, lang=language, slow=False)
                tts.save(filepath)
                
                print(f"✓ Created: {filepath}")
                
            except Exception as e:
                print(f"✗ Error creating {filename}: {e}")
    
    print("Static audio files generation completed!")

def setup_directories():
    """Create necessary directories"""
    
    directories = [
        'temp_audio',
        'static/audio',
        'static/css',
        'static/js'
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"✓ Directory created: {directory}")

def check_environment():
    """Check if all required environment variables are set"""
    
    required_vars = [
        'MONGODB_URL',
        'GEMINI_API_KEY'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("⚠️  Warning: The following environment variables are not set:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\nPlease copy .env.example to .env and fill in the required values.")
    else:
        print("✓ All required environment variables are set")

def main():
    """Main setup function"""
    
    print("🤖 Voice Bot Setup")
    print("==================")
    
    # Check if we're in the right directory
    if not os.path.exists('app.py'):
        print("❌ Please run this script from the Voice Bot root directory")
        sys.exit(1)
    
    # Setup directories
    print("\n1. Setting up directories...")
    setup_directories()
    
    # Check environment
    print("\n2. Checking environment...")
    check_environment()
    
    # Generate static audio (only if environment is properly set)
    if os.getenv('GEMINI_API_KEY'):
        print("\n3. Generating static audio files...")
        try:
            create_static_audio_files()
        except Exception as e:
            print(f"❌ Error generating static audio: {e}")
            print("You can generate audio files later by running this script again.")
    else:
        print("\n3. Skipping audio generation (GEMINI_API_KEY not set)")
    
    print("\n🎉 Setup completed!")
    print("\nNext steps:")
    print("1. Copy .env.example to .env and fill in your API keys")
    print("2. Install dependencies: pip install -r requirements.txt")
    print("3. Start the application: python app.py")

if __name__ == "__main__":
    main()