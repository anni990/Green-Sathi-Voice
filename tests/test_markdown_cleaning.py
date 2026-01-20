"""
Test Markdown Cleaning for TTS
This script tests the markdown cleaning utility
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.utils.markdown_utils import clean_markdown_for_tts

def test_markdown_cleaning():
    """Test markdown to plain text conversion"""
    
    print("Testing Markdown Cleaning for TTS")
    print("=" * 80)
    
    # Test cases
    test_cases = [
        {
            "name": "Bold and Lists",
            "input": """**समस्या:** टमाटर में पीले पत्ते

**समाधान:**
1. पहले पानी की जांच करें
2. खाद की मात्रा देखें
3. कीटनाशक का प्रयोग करें

**सुझाव:** नियमित निगरानी रखें

क्या आप और जानकारी चाहते हैं?"""
        },
        {
            "name": "Bullets and Headers",
            "input": """## मुख्य बिंदु

- पहला बिंदु
- दूसरा बिंदु
* तीसरा बिंदु

### उप-शीर्षक
यहाँ कुछ जानकारी है।"""
        },
        {
            "name": "Mixed Formatting",
            "input": """**गेहूं की खेती:**

1. **मिट्टी:** दोमट मिट्टी सबसे अच्छी
2. **बुवाई:** नवंबर-दिसंबर में
3. **पानी:** 4-5 सिंचाई

*महत्वपूर्ण:* नियमित देखभाल जरूरी है।

क्या आप __बीज__ की जानकारी चाहते हैं?"""
        },
        {
            "name": "Simple Text (No Markdown)",
            "input": "यह एक साधारण टेक्स्ट है बिना किसी फॉर्मेटिंग के।"
        }
    ]
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n{i}. Test: {test['name']}")
        print("-" * 80)
        print("INPUT (Markdown):")
        print(test['input'])
        print("\n" + "~" * 80)
        print("OUTPUT (Cleaned for TTS):")
        cleaned = clean_markdown_for_tts(test['input'])
        print(cleaned)
        print("=" * 80)
    
    # Verify key cleaning operations
    print("\n\nVERIFICATION:")
    print("-" * 80)
    
    test_text = "**Bold** and *italic* with 1. numbered 2. list and - bullet points"
    cleaned = clean_markdown_for_tts(test_text)
    
    checks = [
        ("Bold markers removed", "**" not in cleaned),
        ("Italic markers removed", "*" not in cleaned and "_" not in cleaned),
        ("List numbers removed", "1." not in cleaned and "2." not in cleaned),
        ("Bullet markers removed", "- " not in cleaned),
        ("Text content preserved", "Bold" in cleaned and "italic" in cleaned)
    ]
    
    for check_name, passed in checks:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {check_name}")
    
    print("\n" + "=" * 80)
    print("Test Complete!")

if __name__ == "__main__":
    test_markdown_cleaning()
