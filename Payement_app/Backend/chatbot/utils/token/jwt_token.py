"""This module contains utility functions for handling token generation and decoding,
as well as generating email verification tokens for email verification.
"""

import logging
from datetime import datetime, timezone as dt_timezone
import jwt
from rest_framework.exceptions import (
    AuthenticationFailed,
)
from rest_framework.settings import api_settings
from rest_framework.fields import DateTimeField
from django.conf import settings
from django.utils import timezone
from chatbot.utils.messages.error_messages import TOKEN_ERROR_MESSAGES
from chatbot.utils.encryption import encrypt_email


logger = logging.getLogger("api_logger")
datetime_formatter = DateTimeField(format=api_settings.DATETIME_FORMAT)

def generate_token(data, purpose, expiry):
    """Generates JWT token(s) based on purpose."""

    now = timezone.now()

    if purpose in ["access", "refresh"]:
        payload = {
            "sub": data.id,
            "exp": now + expiry,
            "iat": now,
            "purpose": purpose,
        }
    else:
        exp = now + expiry
        encrypted_email = encrypt_email(data)
        payload = {
            "sub": encrypted_email,
            "exp": exp,
            "iat": now,
            "purpose": purpose,
        }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")

    return token


def decode_token(token, purpose):
    """
    Decodes a JWT token using the jwt secret key and HS256 algorithm.
    """

    payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
    token_purpose = payload.get("purpose")

    if token_purpose != purpose:
        if purpose == "refresh":
            raise AuthenticationFailed(TOKEN_ERROR_MESSAGES["invalid_refresh_token"])
        if purpose == "access":
            raise AuthenticationFailed(TOKEN_ERROR_MESSAGES["invalid_token"])

        raise AuthenticationFailed(TOKEN_ERROR_MESSAGES["invalid_token"])

    return payload


def format_exp_time_from_token(token, purpose):
    """Decode JWT token and format expiry time"""
    decoded = decode_token(token, purpose)
    exp = decoded.get("exp")
    return datetime.fromtimestamp(exp, tz=dt_timezone.utc) 


def build_token_response(access_token, refresh_token, user):
    """Helper to build the token and user response"""

    def format_dt(dt):
        return datetime_formatter.to_representation(dt) if dt else None
    
    return {
        "user": {
            "email": user.email,
            "name": user.name,
            "status": user.status,
            "last_login": format_dt(user.login_at),
            # "image_url": user.image_url,
            "signup_type": user.signup_type,
            "role": user.role,
            "password_at": format_dt(user.password_at),
        },
        "access_token": {
            "token": access_token,
            "expiry": format_dt(format_exp_time_from_token(access_token, "access")),
        },
        "refresh_token": {
            "token": refresh_token,
            "expiry": format_dt(format_exp_time_from_token(refresh_token, "refresh")),
        },
    }
