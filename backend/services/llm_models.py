
def gemini_model_id(id: int):
    GEMINI_MODELS = {
    0: "gemini-2.5-flash-lite",     # 💸 Cheapest | ⚡ Fastest | ✅ Best for voicebots, IVR, PSTN calls
    1: "gemini-2.0-flash-lite",     # 💸 Very cheap | ⚡ Fast | 🗣️ Simple Q&A, fallback model
    2: "gemini-2.5-flash-preview",  # 🧠 Better reasoning | ⚡ Fast | 🧪 Preview (may change)
    3: "gemini-2.5-flash",          # ⚖️ Balanced | 👍 Stable | 💬 Better conversation quality
    4: "gemini-2.0-flash",          # ⚖️ Stable | 🧠 Moderate reasoning | 📦 Legacy flash
    5: "gemini-2.5-pro",            # 🧠🧠 Strong reasoning | 💰 Expensive | ❌ Not ideal for voice
    6: "gemini-3-pro"               # 🧠🧠🧠 Top-tier | 💰💰 Very expensive | 🚫 Overkill for bots
    }
    
    return GEMINI_MODELS[id]

def openai_model_id(id: int):
    OPENAI_MODELS = {
        0: "gpt-4o-mini",        # 💸 Cheapest | ⚡ Fast | ✅ Best for voicebots & real-time chat
        1: "gpt-4.1-mini",       # 💸 Low cost | 🧠 Better than 4o-mini | 👍 Good conversations
        2: "gpt-4o",             # ⚖️ Balanced | 🧠 Strong | 🎧 Good for voice + tools
        3: "gpt-4.1",            # 🧠 Strong reasoning | 💰 Costly | ❌ Not ideal for PSTN bots
        4: "o4-mini",            # 🧪 Reasoning-optimized | ⚠️ Slower | Not voice-first
        5: "o3",                 # 🧠🧠 Heavy reasoning | 💰💰 Expensive | 🚫 Overkill for bots
    }

    return OPENAI_MODELS[id]

def groq_model_id(id: int):
    GROQ_MODELS = {
        0: "llama-3.1-8b-instant",    # 💸 Cheapest | ⚡ Fast | ✅ Best for voicebots & real-time chat
        1: "llama-3.1-16b-instant",   # 💸 Low cost | 🧠 Better than 8b | 👍 Good conversations
        2: "llama-3.1-70b-instant",   # ⚖️ Balanced | 🧠 Strong | 🎧 Good for voice + tools
        3: "llama-3.1-70b",           # 🧠 Strong reasoning | 💰 Costly | ❌ Not ideal for PSTN bots
    }

    return GROQ_MODELS[id]

def ollama_model_id(id: int):
    OLLAMA_MODELS = {
        0: "llama3:8b",          # 🖥️ Local | ⚡ Fast | ✅ Best local voicebot choice
        1: "phi3:mini",          # 🖥️ Very light | 💸 Free | 🧪 Simple Q&A
        2: "mistral:7b",         # 🧠 Balanced | ⚡ Decent | 👍 Chat & instructions
        3: "qwen2.5:7b",         # 🧠 Better reasoning | ⚠️ Slightly slower | Good dialog
        4: "llama3:70b",         # 🧠🧠 Strong | 🐢 Slow | 🚫 Not for real-time voice
    }
    
    return OLLAMA_MODELS[id]

def azure_model_id(id: int):
    AZURE_MODELS = {
        0: "gpt-4.1-mini"
    }
    return AZURE_MODELS[id]

'''Models available via OpenRouter free tier:
OPENROUTER_FREE_MODELS = {
    # AllenAI
    "allenai/olmo-3.1-32b-think:free": "Large reasoning model, decent multilingual",
    "allenai/olmo-3-32b-think:free": "Older but stable",
    
    # NVIDIA
    "nvidia/nemotron-3-nano-30b-a3b:free": "Fast, okay reasoning, weak Hindi",
    "nvidia/nemotron-nano-12b-v2-vl:free": "Multimodal, limited language quality",
    "nvidia/nemotron-nano-9b-v2:free": "Lightweight, experimental",

    # Mistral
    "mistralai/devstral-2512:free": "Good instruction following",
    "mistralai/mistral-small-3.1-24b-instruct:free": "One of the better free ones",
    "mistralai/mistral-7b-instruct:free": "Very small, weak Hindi",

    # Meta / LLaMA
    "meta-llama/llama-3.3-70b-instruct:free": "BEST free quality (rate-limited)",
    "meta-llama/llama-3.2-3b-instruct:free": "Tiny, demo-only",

    # Google Gemma
    "google/gemma-3-27b-it:free": "Decent multilingual, Hindi OK-ish",
    "google/gemma-3-12b-it:free": "Smaller, weaker",
    "google/gemma-3-4b-it:free": "Toy model",

    # DeepSeek
    "deepseek/deepseek-r1-0528:free": "Reasoning-heavy, slow",
    "tngtech/deepseek-r1t-chimera:free": "Experimental",

    # Qwen
    "qwen/qwen3-4b:free": "Light multilingual",
    "qwen/qwen2.5-vl-7b-instruct:free": "Vision + text, Hindi OK",

    # Moonshot
    "moonshotai/kimi-k2:free": "Small context, Chinese-leaning",

    # Alibaba
    "alibaba/tongyi-deepresearch-30b-a3b:free": "Research-focused, not chatty",

    # Z.AI
    "z-ai/glm-4.5-air:free": "Surprisingly usable multilingual",

    # OpenAI OSS
    "openai/gpt-oss-120b:free": "Very limited availability",
    "openai/gpt-oss-20b:free": "Small, unstable",

    # Misc
    "arcee-ai/trinity-mini:free": "Small instruct model",
    "kwaipilot/kat-coder-pro:free": "Coder only",
}

'''

def openrouter_model_id(id: int):
    OPENROUTER_MODELS = {
        0: "openrouter/openai/gpt-3.5-turbo",           # Classic GPT-style model (fast & cheap)
        1: "openrouter/openai/gpt-3.5-turbo-16k",       # Longer context variant
        2: "openrouter/openai/gpt-4",                   # Full-powered GPT-4 via OpenAI
        3: "openrouter/openai/gpt-4-32k",               # GPT-4 with 32k context
        4: "openrouter/anthropic/claude-2",              # Claude 2 from Anthropic
        5: "openrouter/anthropic/claude-instant-v1",     # Claude Instant (faster)
        6: "openrouter/google/palm-2-chat-bison",        # Google PaLM-2 chat
        7: "openrouter/google/palm-2-codechat-bison",    # Google PaLM-2 code focused
        8: "openrouter/meta-llama/llama-2-13b-chat",     # Meta Llama 2 conversational
        # …plus many more provider/model combos available in the catalog
    }
    return OPENROUTER_MODELS[id]

def open_ai_voices(id: int):
    OPENAI_TTS_VOICES = {
        0: "alloy",
        1: "ash",
        2: "ballad",
        3: "coral",
        4: "echo",
        5: "fable",
        6: "onyx",
        7: "nova",
        8: "sage",
        9: "shimmer",
        10: "verse",
        11: "marin",
        12: "cedar"
    }
    return OPENAI_TTS_VOICES[id]
