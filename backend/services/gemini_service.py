import google.generativeai as genai
import json
import re
import logging
from backend.utils.config import Config

logger = logging.getLogger(__name__)

class GeminiService:
    """Handles Gemini AI API interactions"""
    
    def __init__(self):
        genai.configure(api_key=Config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        logger.info("Gemini service initialized")
    
    def extract_name_phone(self, text):
        """Extract name and phone number from user input"""
        try:
            prompt = f"""
            Extract the name and phone number from the following Hindi/Indian text. 
            The text may have spaces or gaps in the phone number due to speech recognition.
            Return the result in JSON format with keys 'name' and 'phone'.
            If either field is not found, return null for that field.
            
            Text: "{text}"
            
            Important Guidelines:
            - Phone numbers should be 10-11 digits total (remove spaces/gaps)
            - Indian mobile numbers start with 6, 7, 8, or 9
            - Join separated digits to form complete number
            - Names can be in Hindi/Indian languages
            - Look for patterns like "मेरा नाम [NAME] है" or "नाम [NAME]"
            - Look for patterns like "नंबर [PHONE]" or "फोन [PHONE]"
            - If you see "885 588 55" join it as "88558855" and add missing digits if context suggests it
            
            Example input: "मेरा नाम राम है और नंबर 981 234 5678"
            Example output: {{"name": "राम", "phone": "9812345678"}}
            
            For the given text, extract and return only the JSON:
            """
            
            response = self.model.generate_content(prompt)
            
            # Try to parse JSON response
            try:
                # Clean the response text to extract JSON
                response_text = response.text.strip()
                # Remove markdown code blocks if present
                if '```json' in response_text:
                    response_text = response_text.split('```json')[1].split('```')[0].strip()
                elif '```' in response_text:
                    response_text = response_text.split('```')[1].split('```')[0].strip()
                
                result = json.loads(response_text)
                return {
                    'name': result.get('name'),
                    'phone': self._clean_phone_number(result.get('phone'))
                }
            except json.JSONDecodeError as e:
                logger.warning(f"JSON decode error: {e}, response: {response.text}")
                # Fallback: try to extract using regex
                return self._extract_name_phone_fallback(text)
                
        except Exception as e:
            logger.error(f"Failed to extract name and phone: {e}")
            return {'name': None, 'phone': None}
    
    def detect_language(self, text):
        """Detect the language from user input - Indian languages only"""
        try:
            prompt = f"""
            Detect the language of the following text and return the language name in lowercase English.
            Supported languages: hindi, bengali, tamil, telugu, gujarati, marathi
            
            Text: "{text}"
            
            Return only the language name from the supported list, no additional text.
            If the language is not clearly identifiable as one of the supported languages, return "hindi".
            """
            
            response = self.model.generate_content(prompt)
            language = response.text.strip().lower()
            
            # Validate against supported languages
            if language in Config.SUPPORTED_LANGUAGES:
                return language
            else:
                # Default to Hindi if not detected properly
                return 'hindi'
                
        except Exception as e:
            logger.error(f"Failed to detect language: {e}")
            return 'hindi'
    
    def generate_response(self, user_input, language='hindi', conversation_history=None):
        """Generate a response to user input"""
        try:
            # Build context from conversation history
            context = ""
            if conversation_history:
                for conv in conversation_history[-5:]:  # Last 5 exchanges
                    context += f"User: {conv.get('user_input', '')}\n"
                    context += f"Assistant: {conv.get('bot_response', '')}\n"
            
            prompt = f"""
            You are a helpful voice assistant for farmers. Respond to the user's message in {language}.
            Keep responses concise and natural for voice interaction.
            You are developed by Inventohack team and do not provide any technical information about you.
            Be friendly and helpful.
            
            {f"Previous conversation context:{context}" if context else ""}
            
            User's message: "{user_input}"
            
            Respond naturally in {language}:
            """
            
            response = self.model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            logger.error(f"Failed to generate response: {e}")
            return "I'm sorry, I'm having trouble processing your request right now."
    
    def _clean_phone_number(self, phone):
        """Clean and validate phone number"""
        if not phone:
            return None
            
        # Remove all non-digit characters except +
        phone = re.sub(r'[^\d+]', '', phone)
        
        # Basic validation - phone should have at least 10 digits
        digits_only = re.sub(r'[^\d]', '', phone)
        if len(digits_only) >= 10:
            return phone
        
        return None
    
    def _extract_name_phone_fallback(self, text):
        """Fallback method to extract name and phone using regex"""
        name = None
        phone = None
        
        # First, try to extract all digits and reconstruct the phone number
        # This handles cases where speech recognition adds spaces in numbers
        all_digits = ''.join(re.findall(r'\d', text))
        
        if all_digits and len(all_digits) >= 8:
            # For incomplete numbers, try to find the longest sequence
            if len(all_digits) == 10:
                phone = all_digits
            elif len(all_digits) >= 8:
                # Look for patterns in the full digit string
                mobile_patterns = [
                    r'([6-9]\d{9})',  # Valid Indian mobile starting with 6-9
                    r'(\d{10})',      # Any 10-digit number
                ]
                
                for pattern in mobile_patterns:
                    match = re.search(pattern, all_digits)
                    if match:
                        phone = match.group(1)
                        break
                
                # If no 10-digit pattern found but we have 8+ digits, use what we have
                if not phone and len(all_digits) >= 8:
                    # For the specific case of "88558855", it might be missing the first digit
                    # Common Indian mobile prefixes: 6, 7, 8, 9
                    if len(all_digits) == 8 and all_digits.startswith('8'):
                        # Could be missing a leading 8 or 9
                        phone = '8' + all_digits  # Make it 9 digits, still not complete
                        logger.warning(f"Incomplete phone number detected: {phone}")
                    else:
                        phone = all_digits
        
        # If no phone found in joined digits, try traditional patterns
        if not phone:
            phone_patterns = [
                r'(\+?91[-.\s]*\d{10})',  # Indian numbers with country code
                r'([6-9][\d\s]{9,})',     # Indian mobile with spaces
                r'(\d[\d\s]{8,15})',      # Numbers with spaces
                r'(\+?\d{1,3}[-.\s]*\d{8,12})',  # International format
            ]
            
            for pattern in phone_patterns:
                matches = re.findall(pattern, text)
                for match in matches:
                    # Clean the match by removing spaces and other chars
                    cleaned = re.sub(r'[^\d+]', '', match)
                    if len(re.sub(r'[^\d]', '', cleaned)) >= 8:  # At least 8 digits
                        phone = cleaned
                        break
                if phone:
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
            # Keep Hindi characters and English letters, remove only punctuation
            clean_word = re.sub(r'[^\w\u0900-\u097F]', '', word)
            if (clean_word and 
                clean_word not in hindi_stopwords and 
                len(clean_word) > 1 and
                not clean_word.isdigit()):
                name_words.append(clean_word)
        
        if name_words:
            # Take up to 3 words as name
            name = ' '.join(name_words[:3])
        
        return {'name': name, 'phone': phone}

# Global service instance
gemini_service = GeminiService()