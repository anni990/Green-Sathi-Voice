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
# GEMINI SERVICE (Direct API)
# ============================================================

class GeminiService:
    """Handles Gemini AI API interactions"""

    def __init__(self):
        genai.configure(api_key=Config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel("gemini-2.0-flash")

    def extract_name_phone(self, text):
        try:
            prompt = f"""
Extract the name and phone number from the following Hindi/Indian text.
The text may contain spaces or gaps in phone numbers due to speech recognition.

Return JSON with keys "name" and "phone".
If a field is missing, return null.

Rules:
- Phone numbers must be 10–11 digits
- Indian mobile numbers start with 6–9
- Join separated digits
- Names may be Hindi or Indian languages

Text: "{text}"

Return ONLY valid JSON.
            """

            response = self.model.generate_content(prompt)
            response_text = strip_code_blocks(response.text.strip())
            result = json.loads(response_text)

            return {
                "name": result.get("name"),
                "phone": clean_phone_number(result.get("phone"))
            }

        except json.JSONDecodeError as e:
            logger.warning(f"Gemini JSON decode error: {e}")
            return self._extract_name_phone_fallback(text)

        except Exception as e:
            logger.error(f"Gemini extract_name_phone failed: {e}")
            return {"name": None, "phone": None}

    def detect_language(self, text):
        try:
            prompt = f"""
Detect the language of the following text.
Supported languages:
hindi, bengali, tamil, telugu, gujarati, marathi

Text: "{text}"

Return only the language name.
Default to hindi.
            """

            response = self.model.generate_content(prompt)
            lang = response.text.strip().lower()

            return lang if lang in Config.SUPPORTED_LANGUAGES else "hindi"

        except Exception as e:
            logger.error(f"Gemini detect_language failed: {e}")
            return "hindi"

    def generate_response(self, user_input, language="hindi", conversation_history=None):
        try:
            context = ""
            if conversation_history:
                for conv in conversation_history[-5:]:
                    context += f"User: {conv.get('user_input', '')}"
                    context += f"Assistant: {conv.get('bot_response', '')}"

            prompt = f"""
You are Green Sathi, a helpful agricultural voice assistant for Indian farmers.

Rules:
- Respond strictly in {language}
- Simple, rural-friendly language
- Actionable steps
- No symbols or formatting
- End with exactly ONE follow-up question

{f"Previous conversation context:{context}" if context else ""}

User message:
"{user_input}"
            """

            response = self.model.generate_content(prompt)
            return response.text.strip()

        except Exception as e:
            logger.error(f"Gemini generate_response failed: {e}")
            return self._localized_error(language)

    def _localized_error(self, language):
        return {
            "hindi": "माफ करें, अभी जवाब देने में समस्या हो रही है।",
            "bengali": "দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না।",
            "tamil": "மன்னிக்கவும், இப்போது பதில் அளிக்க முடியவில்லை।",
            "telugu": "క్షమించండి, ప్రస్తుతం సమాధానం ఇవ్వలేకపోతున్నాను।",
            "gujarati": "માફ કરશો, હાલમાં જવાબ આપી શકતો નથી।",
            "marathi": "माफ करा, सध्या उत्तर देता येत नाही."
        }.get(language, "माफ करें, समस्या हो रही है।")

    def _extract_name_phone_fallback(self, text):
        return fallback_extract_name_phone(text)


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
            prompt = f"""
Extract the name and phone number from the following Hindi/Indian text.
Return JSON with keys "name" and "phone".

Text: "{text}"

Rules:
- 10–11 digit Indian mobile
- Join separated digits
- Return null if missing

Return ONLY JSON.
            """

            response = self.model.generate_content(prompt)
            response_text = strip_code_blocks(response.text.strip())
            result = json.loads(response_text)

            return {
                "name": result.get("name"),
                "phone": clean_phone_number(result.get("phone"))
            }

        except json.JSONDecodeError as e:
            logger.warning(f"Vertex JSON decode error: {e}")
            return self._extract_name_phone_fallback(text)

        except Exception as e:
            logger.error(f"Vertex extract_name_phone failed: {e}")
            return {"name": None, "phone": None}

    def detect_language(self, text):
        try:
            prompt = f"""
Detect the language of the following text.
Supported languages:
hindi, bengali, tamil, telugu, gujarati, marathi

Text: "{text}"
            """

            response = self.model.generate_content(prompt)
            lang = response.text.strip().lower()

            return lang if lang in Config.SUPPORTED_LANGUAGES else "hindi"

        except Exception as e:
            logger.error(f"Vertex detect_language failed: {e}")
            return "hindi"

    def generate_response(self, user_input, language="hindi", conversation_history=None):
        try:
            context = ""
            if conversation_history:
                for conv in conversation_history[-5:]:
                    context += f"User: {conv.get('user_input', '')}"
                    context += f"Assistant: {conv.get('bot_response', '')}"

            prompt = f"""
You are Green Sathi, a helpful agricultural voice assistant.

Rules:
- Respond in {language}
- Simple language
- Actionable
- No formatting
- End with one follow-up question

{f"Context:{context}" if context else ""}

User:
"{user_input}"
            """

            response = self.model.generate_content(prompt)
            return response.text.strip()

        except Exception as e:
            logger.error(f"Vertex generate_response failed: {e}")
            return self._localized_error(language)

    def _localized_error(self, language):
        return GeminiService()._localized_error(language)

    def _extract_name_phone_fallback(self, text):
        return fallback_extract_name_phone(text)


# ============================================================
# OPENAI SERVICE
# ============================================================

class OpenAIService:
    """Handles OpenAI model interactions"""

    def __init__(self):
        self.client = OpenAI(api_key=Config.OPENAI_API_KEY)
        self.model = "gpt-4o-mini"

    def extract_name_phone(self, text):
        response_text = ""  # critical fix
        try:
            prompt = f"""
Extract the name and phone number from the following Hindi/Indian text.
Return JSON with keys "name" and "phone".

Text: "{text}"

Rules:
- 10–11 digit Indian mobile
- Join separated digits
- Return null if missing

Return ONLY JSON.
            """

            response = self.client.responses.create(
                model=self.model,
                input=prompt,
                temperature=0
            )

            response_text = strip_code_blocks(response.output_text.strip())
            result = json.loads(response_text)

            return {
                "name": result.get("name"),
                "phone": clean_phone_number(result.get("phone"))
            }

        except json.JSONDecodeError as e:
            logger.warning(f"OpenAI JSON decode error: {e}, response: {response_text}")
            return self._extract_name_phone_fallback(text)

        except Exception as e:
            logger.error(f"OpenAI extract_name_phone failed: {e}")
            return {"name": None, "phone": None}

    def detect_language(self, text):
        try:
            prompt = f"""
Detect the language of the following text.
Supported languages:
hindi, bengali, tamil, telugu, gujarati, marathi

Text: "{text}"
            """

            response = self.client.responses.create(
                model=self.model,
                input=prompt,
                temperature=0
            )

            lang = response.output_text.strip().lower()
            return lang if lang in Config.SUPPORTED_LANGUAGES else "hindi"

        except Exception as e:
            logger.error(f"OpenAI detect_language failed: {e}")
            return "hindi"

    def generate_response(self, user_input, language="hindi", conversation_history=None):
        try:
            context = ""
            if conversation_history:
                for conv in conversation_history[-5:]:
                    context += f"User: {conv.get('user_input', '')}"
                    context += f"Assistant: {conv.get('bot_response', '')}"

            prompt = f"""
You are Green Sathi, a helpful agricultural voice assistant.

Rules:
- Respond in {language}
- Simple language
- Actionable
- No formatting
- End with one follow-up question

{f"Context:{context}" if context else ""}

User:
"{user_input}"
            """

            response = self.client.responses.create(
                model=self.model,
                input=prompt,
                temperature=0.4
            )

            return response.output_text.strip()

        except Exception as e:
            logger.error(f"OpenAI generate_response failed: {e}")
            return GeminiService()._localized_error(language)

    def _extract_name_phone_fallback(self, text):
        return fallback_extract_name_phone(text)


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
        response_text = ""  # critical for safe logging
        try:
            prompt = f"""
Extract the name and phone number from the following Hindi/Indian text.
The text may have spaces or gaps in the phone number due to speech recognition.

Return the result in JSON format with keys "name" and "phone".
If either field is not found, return null.

Rules:
- Phone numbers must be 10–11 digits
- Indian mobile numbers start with 6–9
- Join separated digits
- Names may be Hindi or Indian languages

Text: "{text}"

Return ONLY valid JSON.
            """

            response = self.client.responses.create(
                model=self.deployment,
                input=prompt,
                temperature=0
            )

            response_text = strip_code_blocks(response.output_text.strip())
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
            prompt = f"""
Detect the language of the following text.
Supported languages:
hindi, bengali, tamil, telugu, gujarati, marathi

Text: "{text}"

Return only the language name.
If unclear, return "hindi".
            """

            response = self.client.responses.create(
                model=self.deployment,
                input=prompt,
                temperature=0
            )

            language = response.output_text.strip().lower()
            return language if language in Config.SUPPORTED_LANGUAGES else "hindi"

        except Exception as e:
            logger.error(f"Azure OpenAI detect_language failed: {e}")
            return "hindi"

    def generate_response(self, user_input, language="hindi", conversation_history=None):
        """Generate a farmer-friendly, context-aware response as Green Sathi"""
        try:
            context = ""
            if conversation_history:
                for conv in conversation_history[-5:]:
                    context += f"User: {conv.get('user_input', '')}"
                    context += f"Assistant: {conv.get('bot_response', '')}"

            prompt = f"""
You are Green Sathi, a helpful agricultural voice assistant for Indian farmers.

Rules:
- Respond strictly in {language}
- Use simple, rural-friendly language
- Keep responses short but complete and actionable
- Include steps farmers can immediately implement
- Do NOT use symbols, bullets, markdown, or formatting
- End with exactly ONE relevant follow-up question
- Be friendly and supportive

{f"Previous conversation context:{context}" if context else ""}

User message:
"{user_input}"

Respond naturally in {language}.
            """

            response = self.client.responses.create(
                model=self.deployment,
                input=prompt,
                temperature=0.4
            )

            return response.output_text.strip()

        except Exception as e:
            logger.error(f"Azure OpenAI generate_response failed: {e}")
            return self._localized_error(language)

    # ------------------------------------------------------------------
    # HELPERS
    # ------------------------------------------------------------------

    def _localized_error(self, language):
        return {
            "hindi": "माफ करें, मुझे अभी आपके सवाल का जवाब देने में परेशानी हो रही है। कृपया थोड़ी देर बाद फिर से कोशिश करें।",
            "bengali": "দুঃখিত, এই মুহূর্তে আপনার প্রশ্নের উত্তর দিতে সমস্যা হচ্ছে।",
            "tamil": "மன்னிக்கவும், உங்கள் கேள்விக்கு இப்போது பதிலளிக்க முடியவில்லை।",
            "telugu": "క్షమించండి, ప్రస్తుతం మీ ప్రశ్నకు సమాధానం ఇవ్వలేకపోతున్నాను।",
            "gujarati": "માફ કરશો, હાલમાં તમારા પ્રશ્નનો જવાબ આપી શકતો નથી।",
            "marathi": "माफ करा, सध्या तुमच्या प्रश्नाचे उत्तर देता येत नाही."
        }.get(language, "माफ करें, समस्या हो रही है।")


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
vertex_service = VertexGeminiService() if Config.VERTEX_PROJECT_ID and Config.VERTEX_PROJECT_ID != 'none' and Config.VERTEX_LOCATION and Config.VERTEX_LOCATION != 'none' else None
openai_service = OpenAIService()
azure_openai_service = AzureOpenAIService()