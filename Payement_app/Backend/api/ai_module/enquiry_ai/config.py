import os

from dotenv import load_dotenv

load_dotenv()

class Config:
    TONE_THRESHOLD = 0.3
    VERBOSITY_THRESHOLD = 0.2
    MAX_RECENT_QUERIES = 5
    MAX_INTEREST_ITEMS = 20
    TONE_INCREMENT = 0.15
    TONE_DECAY = 0.85
    VERBOSITY_INCREMENT = 0.15
    VERBOSITY_DECAY = 0.8
    INTEREST_DECAY = 0.95
    INTEREST_INCREMENT = 0.2
    DEFAULT_USER_ROLE = "general user"
    db_host = os.environ.get("HOST", "127.0.0.1")
    db_port = int(os.environ.get("PORT", 5555))
    db_user = os.environ.get("DB_USERNAME")
    db_password = os.environ.get("DB_PASSWORD", "12345678")
    db_name = os.environ.get("DB_NAME", "chatbot")
    GOOGLE_API_KEY_1 = os.environ.get("GOOGLE_API_KEY_1")
    GOOGLE_API_KEY_2 = os.environ.get("GOOGLE_API_KEY_2")
    GOOGLE_API_KEY_3 = os.environ.get("GOOGLE_API_KEY_3")
    TEMPLATE_PATH = os.environ.get("PPT_TEMPLATE", "template.pptx")
    OUTPUT_FOLDER = os.environ.get("OUTPUT_FOLDER", "generated_ppts")
