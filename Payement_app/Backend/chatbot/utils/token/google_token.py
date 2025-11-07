"""Verify google token for SSO"""

from google.oauth2 import id_token
from google.auth.transport import requests
from django.conf import settings


def verify_google_token(token):
    """To verify google gennerated token"""

    idinfo = id_token.verify_oauth2_token(token, requests.Request(), settings.CLIENT_ID)
    return idinfo
