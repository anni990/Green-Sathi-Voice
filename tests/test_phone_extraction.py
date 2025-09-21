#!/usr/bin/env python3
"""
Test script to validate phone number extraction issue
"""
import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_phone_extraction():
    """Test phone extraction with the problematic input"""
    
    # Test input from the log
    test_text = "मेरा नाम अनिकेत कुमार मिश्रा है और मेरा नंबर 885588 55        है"
    
    print("🧪 Testing Phone Number Extraction")
    print("=" * 50)
    print(f"Input text: {test_text}")
    print()
    
    # Test regex patterns for phone extraction
    import re
    
    phone_patterns = [
        (r'(\+?91[-.\s]?\d{10})', 'Indian numbers with country code'),
        (r'([6-9]\d{9})', 'Valid Indian mobile number pattern'),
        (r'(\d{10})', '10-digit numbers'),
        (r'(\d{8,12})', 'General number pattern (8-12 digits)'),
        (r'([\d\s]+)', 'Any digits with spaces'),
    ]
    
    print("Testing regex patterns:")
    for pattern, description in phone_patterns:
        matches = re.findall(pattern, test_text)
        print(f"  {description}: {matches}")
    
    print()
    
    # Test cleaning function
    def clean_phone_number(phone):
        """Clean and validate phone number"""
        if not phone:
            return None
            
        # Remove all non-digit characters except +
        cleaned = re.sub(r'[^\d+]', '', phone)
        
        # Basic validation - phone should have at least 10 digits
        digits_only = re.sub(r'[^\d]', '', cleaned)
        if len(digits_only) >= 10:
            return cleaned
        
        return None
    
    # Extract all possible phone numbers
    all_digits = re.findall(r'([\d\s]+)', test_text)
    print("All digit sequences found:")
    for digits in all_digits:
        cleaned = clean_phone_number(digits)
        print(f"  '{digits}' -> '{cleaned}'")
    
    print()
    
    # Recommended solution
    print("💡 SOLUTION:")
    print("The issue is that the speech recognition is adding extra spaces in the phone number.")
    print("The number '885588 55        है' should be '8855885555'")
    print()
    print("Improvements needed:")
    print("1. Better regex pattern to handle spaces in numbers")
    print("2. Improved prompt for Gemini to extract complete numbers")
    print("3. Fallback extraction that joins digit sequences")
    
    # Test improved extraction
    print("\n🔧 Testing improved extraction:")
    
    # Join all digits to form complete number
    all_text_digits = ''.join(re.findall(r'\d', test_text))
    print(f"All digits joined: {all_text_digits}")
    
    # Look for valid 10-digit mobile numbers in the joined digits
    mobile_patterns = [
        r'([6-9]\d{9})',  # Valid Indian mobile starting with 6-9
        r'(\d{10})',      # Any 10-digit number
    ]
    
    for pattern in mobile_patterns:
        matches = re.findall(pattern, all_text_digits)
        if matches:
            print(f"Extracted mobile number: {matches[0]}")
            break
    
    return True

if __name__ == '__main__':
    test_phone_extraction()