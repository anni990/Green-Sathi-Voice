"""
Test Markdown Formatting in LLM Responses
This script tests that the LLM service returns properly formatted markdown
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.llm_service import gemini_service, azure_openai_service

def test_markdown_response():
    """Test that LLM returns markdown formatted response"""
    
    print("Testing Markdown Formatting in Responses...")
    print("=" * 60)
    
    # Test query
    user_query = "टमाटर में पीले पत्ते क्यों हो रहे हैं?"
    language = "hindi"
    
    print(f"\nUser Query: {user_query}")
    print(f"Language: {language}")
    print("\n" + "=" * 60)
    
    # Test with Gemini
    print("\n1. GEMINI SERVICE:")
    print("-" * 60)
    try:
        response = gemini_service.generate_response(user_query, language)
        print(response)
        
        # Check for markdown elements
        has_bold = "**" in response
        has_bullets = any(marker in response for marker in ["- ", "* ", "1. ", "2. "])
        has_newlines = "\n" in response
        
        print("\n" + "=" * 60)
        print("Markdown Detection:")
        print(f"  ✓ Bold (**): {'Yes' if has_bold else 'No'}")
        print(f"  ✓ Lists: {'Yes' if has_bullets else 'No'}")
        print(f"  ✓ Line breaks: {'Yes' if has_newlines else 'No'}")
        
    except Exception as e:
        print(f"Error with Gemini: {e}")
    
    # Test with Azure OpenAI
    print("\n\n2. AZURE OPENAI SERVICE:")
    print("-" * 60)
    try:
        response = azure_openai_service.generate_response(user_query, language)
        print(response)
        
        # Check for markdown elements
        has_bold = "**" in response
        has_bullets = any(marker in response for marker in ["- ", "* ", "1. ", "2. "])
        has_newlines = "\n" in response
        
        print("\n" + "=" * 60)
        print("Markdown Detection:")
        print(f"  ✓ Bold (**): {'Yes' if has_bold else 'No'}")
        print(f"  ✓ Lists: {'Yes' if has_bullets else 'No'}")
        print(f"  ✓ Line breaks: {'Yes' if has_newlines else 'No'}")
        
    except Exception as e:
        print(f"Error with Azure: {e}")
    
    print("\n" + "=" * 60)
    print("Test Complete!")
    print("=" * 60)

if __name__ == "__main__":
    test_markdown_response()
