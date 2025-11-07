# log.py
import logging
from datetime import datetime
import os, re

LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

# Global logger
logger = logging.getLogger("message_logger")
logger.setLevel(logging.DEBUG)

# Track log file handler
file_handler = None

#set the logger name befor logging data
def set_log_filename(filename: str):
    """
    Set log filename dynamically based on the given filename.
    """
    global file_handler
    #Sanitize message text
    safe_text = re.sub(r'[^a-zA-Z0-9_-]', '_', filename.strip())  # keep only safe chars

    #Truncate if too long
    safe_text = safe_text[:50] if len(safe_text) > 50 else safe_text  # limit filename to 50 chars


    # Remove old file handler if exists
    if file_handler:
        logger.removeHandler(file_handler)

    base_name = os.path.splitext(os.path.basename(safe_text))[0]
    log_filename = f"{base_name}_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.log"
    log_path = os.path.join(LOG_DIR, log_filename)

    file_handler = logging.FileHandler(log_path)
    file_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(filename)s - %(lineno)d - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)

    # Console handler (only once)
    if not any(isinstance(h, logging.StreamHandler) for h in logger.handlers):
        console_handler = logging.StreamHandler()
        console_formatter = logging.Formatter(
            '[%(levelname)s] %(asctime)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)

    logger.info(f"Log file created: {log_path}")
