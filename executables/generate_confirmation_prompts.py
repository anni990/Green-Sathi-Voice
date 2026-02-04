"""
Generate additional Hindi voice prompts for confirmation flow
"""

from gtts import gTTS
import os
import sys

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Create output directory if it doesn't exist
output_dir = os.path.join('static', 'audio')
os.makedirs(output_dir, exist_ok=True)

# Define prompts for confirmation flow (Kiosk with numerical keyboard only)
prompts = {
    'confirm_details': {
        'hi': 'कृपया अपनी जानकारी की पुष्टि करें। यदि नाम और फ़ोन नंबर सही है तो एंटर दबाएं। नंबर गलत है तो बैकस्पेस से मिटाएं और सही नंबर दर्ज करें।',
        'file': 'static_confirm_details_hi.mp3'
    },
    'details_confirmed': {
        'hi': 'धन्यवाद! आपकी जानकारी प्राप्त हो गई है।',
        'file': 'static_details_confirmed_hi.mp3'
    },
    'edit_phone_hint': {
        'hi': 'नंबर बदलने के लिए बैकस्पेस से मिटाएं और नया नंबर दर्ज करें। फिर एंटर दबाएं।',
        'file': 'static_edit_phone_hint_hi.mp3'
    }
}

def generate_audio_files():
    """Generate all audio files"""
    for prompt_name, prompt_data in prompts.items():
        text = prompt_data['hi']
        filename = prompt_data['file']
        filepath = os.path.join(output_dir, filename)
        
        print("Generating:", filename)
        
        try:
            tts = gTTS(text=text, lang='hi', slow=False)
            tts.save(filepath)
            print("Saved:", filepath, "\n")
        except Exception as e:
            print("Error generating", filename, ":", str(e), "\n")

if __name__ == '__main__':
    print("=== Generating Confirmation Flow Audio Prompts ===\n")
    generate_audio_files()
    print("=== Generation Complete ===")
