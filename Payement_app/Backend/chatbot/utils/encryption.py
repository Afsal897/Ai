"""Encrypt and decrypt email"""

import logging
import base64
import hashlib
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

logger = logging.getLogger("api_logger")


def get_cipher():
    """
    Returns a Fernet cipher object for encrypting and decrypting data using the Django SECRET_KEY.
    """

    key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    fernet_key = base64.urlsafe_b64encode(key[:32])
    return Fernet(fernet_key)


def encrypt_email(email):
    """encrypt the email"""

    try:
        cipher = get_cipher()
        return cipher.encrypt(email.encode()).decode()
    except (TypeError, ValueError, AttributeError) as e:
        logger.error("Email encryption failed: %s", str(e))
        return None


def decrypt_email(encrypted_email):
    """decrypt the email"""

    try:
        cipher = get_cipher()
        return cipher.decrypt(encrypted_email.encode()).decode()
    except InvalidToken:
        logger.error("Invalid encryption token provided for decryption.")
    except (TypeError, ValueError) as error:
        logger.error("Email decryption failed: %s", str(error))
    return None
