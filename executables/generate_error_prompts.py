"""
Generate Static Error Prompt Audio Files
This script generates audio files for error messages and fallback scenarios
"""
from gtts import gTTS
import os

# Create static/audio directory if it doesn't exist
AUDIO_DIR = os.path.join('static', 'audio')
os.makedirs(AUDIO_DIR, exist_ok=True)

# Error prompts for different languages
ERROR_PROMPTS = {
    'extraction_error': {
        'hindi': 'माफ़ कीजिये मैं समझ नहीं पाई। कृपया अपना फ़ोन नंबर दर्ज करें।',
        'bengali': 'ক্ষমা করবেন আমি বুঝতে পারিনি। অনুগ্রহ করে আপনার ফোন নম্বর লিখুন।',
        'tamil': 'மன்னிக்கவும் என்னால் புரிந்துகொள்ள முடியவில்லை. தயவுசெய்து உங்கள் தொலைபேசி எண்ணை உள்ளிடவும்.',
        'telugu': 'క్షమించండి నేను అర్థం చేసుకోలేకపోయాను. దయచేసి మీ ఫోన్ నంబర్‌ను నమోదు చేయండి.',
        'gujarati': 'માફ કરશો હું સમજી શક્યો નહીં. કૃપા કરીને તમારો ફોન નંબર દાખલ કરો.',
        'marathi': 'माफ करा मला समजले नाही. कृपया तुमचा फोन नंबर टाका.'
    },
    'language_error': {
        'hindi': 'माफ़ कीजिये मैं समझ नहीं पाई। कृपया अपनी पसंदीदा भाषा बताएं।',
        'bengali': 'ক্ষমা করবেন আমি বুঝতে পারিনি। অনুগ্রহ করে আপনার পছন্দের ভাষা বলুন।',
        'tamil': 'மன்னிக்கவும் என்னால் புரிந்துகொள்ள முடியவில்லை. தயவுசெய்து உங்கள் விருப்ப மொழியைச் சொல்லுங்கள்.',
        'telugu': 'క్షమించండి నేను అర్థం చేసుకోలేకపోయాను. దయచేసి మీ ఇష్టమైన భాషను చెప్పండి.',
        'gujarati': 'માફ કરશો હું સમજી શક્યો નહીં. કૃપા કરીને તમારી પસંદની ભાષા જણાવો.',
        'marathi': 'माफ करा मला समजले नाही. कृपया तुमची पसंतीची भाषा सांगा.'
    }
}

# Language codes for gTTS
LANGUAGE_CODES = {
    'hindi': 'hi',
    'bengali': 'bn',
    'tamil': 'ta',
    'telugu': 'te',
    'gujarati': 'gu',
    'marathi': 'mr'
}

def generate_error_audio(prompt_type, language, text):
    """Generate audio file for error prompt"""
    try:
        lang_code = LANGUAGE_CODES.get(language, 'hi')
        filename = f"static_{prompt_type}_{language}.mp3"
        filepath = os.path.join(AUDIO_DIR, filename)
        
        # Skip if file already exists
        if os.path.exists(filepath):
            print(f"✓ {filename} already exists")
            return True
        
        # Generate audio
        tts = gTTS(text=text, lang=lang_code, slow=False)
        tts.save(filepath)
        print(f"✓ Generated: {filename}")
        return True
        
    except Exception as e:
        print(f"✗ Error generating {prompt_type} for {language}: {e}")
        return False

def main():
    """Generate all error prompt audio files"""
    print("Generating error prompt audio files...")
    print(f"Output directory: {AUDIO_DIR}\n")
    
    generated_count = 0
    failed_count = 0
    
    for prompt_type, languages in ERROR_PROMPTS.items():
        print(f"\n{prompt_type.upper()}:")
        for language, text in languages.items():
            if generate_error_audio(prompt_type, language, text):
                generated_count += 1
            else:
                failed_count += 1
    
    print(f"\n{'='*50}")
    print(f"Summary: {generated_count} files generated, {failed_count} failed")
    print(f"{'='*50}")
    
    # List all static audio files
    print("\nAll static audio files in directory:")
    audio_files = sorted([f for f in os.listdir(AUDIO_DIR) if f.endswith('.mp3')])
    for i, file in enumerate(audio_files, 1):
        print(f"  {i}. {file}")

if __name__ == '__main__':
    main()
