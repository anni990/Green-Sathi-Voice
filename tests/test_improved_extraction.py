#!/usr/bin/env python3
"""
Test the improved phone extraction
"""
import sys
import os
import re

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_fallback_extraction():
    """Test the improved fallback extraction method"""
    
    # Simulate the fallback extraction logic
    def extract_name_phone_fallback(text):
        """Test version of the fallback method"""
        name = None
        phone = None
        
        # First, try to extract all digits and reconstruct the phone number
        all_digits = ''.join(re.findall(r'\d', text))
        
        if all_digits:
            # Look for valid Indian mobile numbers in the joined digits
            mobile_patterns = [
                r'([6-9]\d{9})',  # Valid Indian mobile starting with 6-9
                r'(\d{10})',      # Any 10-digit number
                r'(\d{8,12})',    # 8-12 digit numbers
            ]
            
            for pattern in mobile_patterns:
                match = re.search(pattern, all_digits)
                if match:
                    candidate = match.group(1)
                    if len(candidate) >= 10:  # Ensure it's at least 10 digits
                        phone = candidate
                        break
        
        # Extract name by removing digits and common Hindi words
        text_for_name = text
        if phone:
            # Remove the phone number area from text
            text_for_name = re.sub(r'[\d+\-.\s()]+', ' ', text)
        
        # Remove common Hindi words
        hindi_stopwords = [
            'मेरा', 'नाम', 'है', 'और', 'का', 'की', 'के', 'में', 'से', 'को', 
            'फोन', 'नंबर', 'Mobile', 'number', 'से', 'की', 'मैं', 'हूँ', 'हूं'
        ]
        
        # Clean and extract name words
        words = text_for_name.split()
        name_words = []
        
        for word in words:
            # Remove punctuation and check if it's not a stopword
            clean_word = re.sub(r'[^\w]', '', word)
            if (clean_word and 
                clean_word not in hindi_stopwords and 
                len(clean_word) > 1 and
                not clean_word.isdigit()):
                name_words.append(clean_word)
        
        if name_words:
            # Take up to 3 words as name
            name = ' '.join(name_words[:3])
        
        return {'name': name, 'phone': phone}
    
    # Test cases
    test_cases = [
        "मेरा नाम अनिकेत कुमार मिश्रा है और मेरा नंबर 885588 55        है",
        "नाम राहुल और फोन 9876543210",
        "मैं अमित हूँ मेरा नंबर 98 76 54 32 10 है",
        "My name is Priya and number is 8855885555"
    ]
    
    print("🧪 Testing Improved Fallback Extraction")
    print("=" * 60)
    
    for i, text in enumerate(test_cases, 1):
        print(f"\nTest {i}:")
        print(f"Input: {text}")
        
        result = extract_name_phone_fallback(text)
        print(f"Output: {result}")
        
        # Show all digits extraction
        all_digits = ''.join(re.findall(r'\d', text))
        print(f"All digits: {all_digits}")
    
    print("\n" + "=" * 60)
    print("✅ The improved extraction should handle spaced phone numbers better!")
    
    return True

if __name__ == '__main__':
    test_fallback_extraction()