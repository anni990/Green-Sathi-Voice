import json
import re
import logging
from backend.utils.config import Config

# LLM SDKs
import google.generativeai as genai
from openai import OpenAI
import vertexai
from vertexai.preview.generative_models import GenerativeModel  # preview API (intentional)
from openai import AzureOpenAI

logger = logging.getLogger(__name__)

# ============================================================
# SHARED HELPERS
# ============================================================

def strip_code_blocks(text: str) -> str:
    """Remove markdown-style code blocks from model output"""
    if not text:
        return ""
    if "```json" in text:
        return text.split("```json")[1].split("```")[0].strip()
    if "```" in text:
        return text.split("```")[1].split("```")[0].strip()
    return text


def clean_phone_number(phone):
    """Normalize and validate Indian phone numbers (10–11 digits only)"""
    if not phone:
        return None

    phone = re.sub(r"[^\d+]", "", phone)
    digits_only = re.sub(r"[^\d]", "", phone)

    if 10 <= len(digits_only) <= 11:
        return phone

    return None


# ============================================================
# SHARED PROMPTS
# ============================================================

extract_name_phone_prompt = """
Extract the name and phone number from the following Hindi/Indian text.
The text may contain spaces or gaps in phone numbers due to speech recognition.

Return JSON with keys "name" and "phone".
If a field is missing, return null.

Rules:
- Phone numbers must be 10–11 digits
- Indian mobile numbers start with 6–9
- Join separated digits
- Names may be Hindi or Indian languages

Return ONLY valid JSON.
"""

detect_language_prompt = """
Detect the language of the following text.
Supported languages:
hindi, bengali, tamil, telugu, gujarati, marathi

Return only the language name.
Default to hindi.
"""

generate_response_prompt = """
You are Green Sathi, a helpful agricultural voice assistant for Indian farmers.

Rules:
- Simple, rural-friendly language
- Actionable steps
- No symbols or formatting
- End with exactly ONE follow-up question
"""

# ============================================================
# SHARED ERROR MESSAGES
# ============================================================

def get_localized_error(language):
    """Return error message in user's language"""
    return {
        "hindi": "माफ करें, अभी जवाब देने में समस्या हो रही है।",
        "bengali": "দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না।",
        "tamil": "மன்னிக்கவும், இப்போது பதில் அளிக்க முடியவில்லை।",
        "telugu": "క్షమించండి, ప్రస్తుతం సమాధానం ఇవ్వలేకపోతున్నాను।",
        "gujarati": "માફ કરશો, હાલમાં જવાબ આપી શકતો નથી।",
        "marathi": "माफ करा, सध्या उत्तर देता येत नाही."
    }.get(language, "माफ करें, समस्या हो रही है।")


def build_conversation_context(conversation_history):
    """Build conversation context string from history"""
    if not conversation_history:
        return ""
    
    context = ""
    for conv in conversation_history[-5:]:
        context += f"User: {conv.get('user_input', '')}"
        context += f"Assistant: {conv.get('bot_response', '')}"
    return context

# ============================================================
# GEMINI SERVICE (Direct API)
# ============================================================

class GeminiService:
    """Handles Gemini AI API interactions"""

    def __init__(self):
        genai.configure(api_key=Config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel("gemini-2.0-flash")

    def extract_name_phone(self, text):
        try:
            prompt = extract_name_phone_prompt + f'Text: "{text}"'

            response = self.model.generate_content(prompt)
            response_text = strip_code_blocks(response.text.strip())
            result = json.loads(response_text)

            return {
                "name": result.get("name"),
                "phone": clean_phone_number(result.get("phone"))
            }

        except json.JSONDecodeError as e:
            logger.warning(f"Gemini JSON decode error: {e}")
            return fallback_extract_name_phone(text)

        except Exception as e:
            logger.error(f"Gemini extract_name_phone failed: {e}")
            return {"name": None, "phone": None}

    def detect_language(self, text):
        try:
            prompt = detect_language_prompt + f'\n\nText: "{text}"'

            response = self.model.generate_content(prompt)
            lang = response.text.strip().lower()

            return lang if lang in Config.SUPPORTED_LANGUAGES else "hindi"

        except Exception as e:
            logger.error(f"Gemini detect_language failed: {e}")
            return "hindi"

    def generate_response(self, user_input, language="hindi", conversation_history=None):
        try:
            context = build_conversation_context(conversation_history)

            prompt = f"""Respond strictly in {language}
                {f"Previous conversation context:{context}" if context else ""}""" + generate_response_prompt + f"""
                User message:
                "{user_input}"
            """

            response = self.model.generate_content(prompt)
            return response.text.strip()

        except Exception as e:
            logger.error(f"Gemini generate_response failed: {e}")
            return get_localized_error(language)


# ============================================================
# VERTEX GEMINI SERVICE
# ============================================================

class VertexGeminiService:
    """Handles Gemini interactions via Vertex AI"""

    def __init__(self):
        vertexai.init(
            project=Config.VERTEX_PROJECT_ID,
            location=Config.VERTEX_LOCATION
        )
        self.model = GenerativeModel("gemini-2.0-flash")

    def extract_name_phone(self, text):
        try:
            prompt = extract_name_phone_prompt + f'\n\nText: "{text}"\n\nReturn ONLY valid JSON.'

            response = self.model.generate_content(prompt)
            response_text = strip_code_blocks(response.text.strip())
            result = json.loads(response_text)

            return {
                "name": result.get("name"),
                "phone": clean_phone_number(result.get("phone"))
            }

        except json.JSONDecodeError as e:
            logger.warning(f"Vertex JSON decode error: {e}")
            return fallback_extract_name_phone(text)

        except Exception as e:
            logger.error(f"Vertex extract_name_phone failed: {e}")
            return {"name": None, "phone": None}

    def detect_language(self, text):
        try:
            prompt = detect_language_prompt + f'\n\nText: "{text}"'

            response = self.model.generate_content(prompt)
            lang = response.text.strip().lower()

            return lang if lang in Config.SUPPORTED_LANGUAGES else "hindi"

        except Exception as e:
            logger.error(f"Vertex detect_language failed: {e}")
            return "hindi"

    def generate_response(self, user_input, language="hindi", conversation_history=None):
        try:
            context = build_conversation_context(conversation_history)

            prompt = f"""Respond strictly in {language}
                {f"Previous conversation context:{context}" if context else ""}""" + generate_response_prompt + f"""
                User message:
                "{user_input}"
            """

            response = self.model.generate_content(prompt)
            return response.text.strip()

        except Exception as e:
            logger.error(f"Vertex generate_response failed: {e}")
            return get_localized_error(language)


# ============================================================
# OPENAI SERVICE
# ============================================================

class OpenAIService:
    """Handles OpenAI model interactions"""

    def __init__(self):
        self.client = OpenAI(api_key=Config.OPENAI_API_KEY)
        self.model = "gpt-4o-mini"

    def extract_name_phone(self, text):
        response_text = ""
        try:
            prompt = extract_name_phone_prompt + f'\n\nText: "{text}"\n\nReturn ONLY valid JSON.'

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0
            )

            response_text = strip_code_blocks(response.choices[0].message.content.strip())
            result = json.loads(response_text)

            return {
                "name": result.get("name"),
                "phone": clean_phone_number(result.get("phone"))
            }

        except json.JSONDecodeError as e:
            logger.warning(f"OpenAI JSON decode error: {e}, response: {response_text}")
            return fallback_extract_name_phone(text)

        except Exception as e:
            logger.error(f"OpenAI extract_name_phone failed: {e}")
            return {"name": None, "phone": None}

    def detect_language(self, text):
        try:
            prompt = detect_language_prompt + f'\n\nText: "{text}"'

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0
            )

            lang = response.choices[0].message.content.strip().lower()
            return lang if lang in Config.SUPPORTED_LANGUAGES else "hindi"

        except Exception as e:
            logger.error(f"OpenAI detect_language failed: {e}")
            return "hindi"

    def generate_response(self, user_input, language="hindi", conversation_history=None):
        try:
            context = build_conversation_context(conversation_history)

            prompt = f"""Respond strictly in {language}
                {f"Previous conversation context:{context}" if context else ""}""" + generate_response_prompt + f"""
                User message:
                "{user_input}"
            """

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            logger.error(f"OpenAI generate_response failed: {e}")
            return get_localized_error(language)


# ============================================================
# AZURE OPENAI SERVICE
# ============================================================

class AzureOpenAIService:
    """
    Handles Azure OpenAI model interactions.
    Feature-parity implementation with GeminiService, VertexGeminiService, OpenAIService.
    """

    def __init__(self):
        self.client = AzureOpenAI(
            api_key=Config.AZURE_OPENAI_API_KEY,
            azure_endpoint=Config.AZURE_OPENAI_ENDPOINT,
            api_version=Config.AZURE_OPENAI_API_VERSION,
        )
        self.deployment = Config.AZURE_OPENAI_DEPLOYMENT

    # ------------------------------------------------------------------
    # CORE SERVICES
    # ------------------------------------------------------------------

    def extract_name_phone(self, text):
        """Extract name and phone number from Hindi / Indian speech-style text"""
        response_text = ""
        try:
            prompt = extract_name_phone_prompt + f'\n\nText: "{text}"\n\nReturn ONLY valid JSON.'

            response = self.client.chat.completions.create(
                model=self.deployment,
                messages=[{"role": "user", "content": prompt}],
                temperature=0
            )

            response_text = strip_code_blocks(response.choices[0].message.content.strip())
            result = json.loads(response_text)

            return {
                "name": result.get("name"),
                "phone": clean_phone_number(result.get("phone"))
            }

        except json.JSONDecodeError as e:
            logger.warning(
                f"Azure OpenAI JSON decode error: {e}, response: {response_text}"
            )
            return fallback_extract_name_phone(text)

        except Exception as e:
            logger.error(f"Azure OpenAI extract_name_phone failed: {e}")
            return {"name": None, "phone": None}

    def detect_language(self, text):
        """Detect Indian language from constrained supported set"""
        try:
            prompt = detect_language_prompt + f'\n\nText: "{text}"'

            response = self.client.chat.completions.create(
                model=self.deployment,
                messages=[{"role": "user", "content": prompt}],
                temperature=0
            )

            language = response.choices[0].message.content.strip().lower()
            return language if language in Config.SUPPORTED_LANGUAGES else "hindi"

        except Exception as e:
            logger.error(f"Azure OpenAI detect_language failed: {e}")
            return "hindi"

    def generate_response(self, user_input, language="hindi", conversation_history=None):
        """Generate a farmer-friendly, context-aware response as Green Sathi"""
        try:
            context = build_conversation_context(conversation_history)

            prompt = f"""Respond strictly in {language}
                {f"Previous conversation context:{context}" if context else ""}""" + generate_response_prompt + f"""
                User message:
                "{user_input}"
            """

            response = self.client.chat.completions.create(
                model=self.deployment,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            logger.error(f"Azure OpenAI generate_response failed: {e}")
            return get_localized_error(language)


# ============================================================
# FALLBACK EXTRACTION (SHARED)
# ============================================================

def fallback_extract_name_phone(text):
    name = None
    phone = None

    all_digits = "".join(re.findall(r"\d", text))

    if all_digits and len(all_digits) >= 8:
        match = re.search(r"([6-9]\d{9})", all_digits)
        phone = match.group(1) if match else all_digits

    text_for_name = re.sub(r"[\d+\-.\s()]+", " ", text)

    hindi_stopwords = {
        "मेरा", "नाम", "है", "और", "का", "की", "के", "में", "से", "को",
        "फोन", "नंबर", "number", "mobile", "मैं", "हूँ", "हूं"
    }

    words = text_for_name.split()
    name_words = [
        re.sub(r"[^\w\u0900-\u097F]", "", w)
        for w in words
        if w not in hindi_stopwords and len(w) > 1
    ]

    if name_words:
        name = " ".join(name_words[:3])

    return {"name": name, "phone": phone}


# ============================================================
# GLOBAL INSTANCES
# ============================================================

gemini_service = GeminiService()
vertex_service = VertexGeminiService()
openai_service = OpenAIService()
azure_openai_service = AzureOpenAIService()