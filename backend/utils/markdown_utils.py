import re

def clean_markdown_for_tts(text):
    """
    Remove markdown formatting and special characters for TTS.
    Converts markdown to clean plain text with natural pauses for speech.
    """
    if not text:
        return ""
    
    cleaned = text
    
    # 1. Remove Images and Links (do first to keep link text but lose URLs)
    cleaned = re.sub(r'!\[.+?\]\(.+?\)', '', cleaned)
    cleaned = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', cleaned)
    
    # 2. Remove Block-level elements (Headers, Horizontal Rules, Blockquotes)
    cleaned = re.sub(r'^#{1,6}\s+', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'^\s*[-*_]{3,}\s*$', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'^\s*>\s+', '', cleaned, flags=re.MULTILINE)

    # 3. FIX: Handle Lists (Bullets and Numbers) anywhere in the text
    # We check for the start of a line OR a preceding space/punctuation
    # This ensures "1. " is caught even if it's not the very first character of the string
    cleaned = re.sub(r'(^|[\s,;])[-*+]\s+', r'\1', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'(^|[\s,;])\d+\.\s+', r'\1', cleaned, flags=re.MULTILINE)
    
    # 4. Remove Inline Formatting
    cleaned = re.sub(r'\*\*\*(.+?)\*\*\*', r'\1', cleaned) # Bold-Italic
    cleaned = re.sub(r'\*\*(.+?)\*\*', r'\1', cleaned)    # Bold
    cleaned = re.sub(r'__(.+?)__', r'\1', cleaned)        # Bold
    cleaned = re.sub(r'\*(.+?)\*', r'\1', cleaned)        # Italic
    cleaned = re.sub(r'_(.+?)_', r'\1', cleaned)          # Italic
    cleaned = re.sub(r'~~(.+?)~~', r'\1', cleaned)       # Strikethrough
    
    # 5. Remove Code
    cleaned = re.sub(r'```[\s\S]*?```', '', cleaned)
    cleaned = re.sub(r'`(.+?)`', r'\1', cleaned)
    
    # 6. Remove HTML tags
    cleaned = re.sub(r'<[^>]+>', '', cleaned)
    
    # 7. TTS Specific Formatting (The "Pause" Logic)
    # Multiple spaces to single space
    cleaned = re.sub(r'[ \t]+', ' ', cleaned)
    
    # Convert double newlines (paragraphs) to a full stop for a long pause
    cleaned = re.sub(r'\n\s*\n+', '. ', cleaned)
    
    # Convert single newlines (usually list items) to a comma for a short breath
    cleaned = re.sub(r'\n', ', ', cleaned)
    
    # Final cleanup of double punctuation or stray symbols
    cleaned = re.sub(r',\s*,', ',', cleaned)
    cleaned = re.sub(r'\.\s*,', '.', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned) # Final space normalize
    
    cleaned = cleaned.strip()
    
    # Ensure it ends with a proper sentence finisher if characters exist
    if cleaned and cleaned[-1] not in ('.', '!', '?', '।'):
        if cleaned.endswith(','):
            cleaned = cleaned[:-1] + '.'
        else:
            cleaned = cleaned + '.'

    return cleaned

def markdown_to_plain_text(text):
    return clean_markdown_for_tts(text)