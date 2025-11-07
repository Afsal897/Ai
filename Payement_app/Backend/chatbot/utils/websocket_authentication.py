import jwt
from channels.exceptions import DenyConnection
from channels.db import database_sync_to_async
from urllib.parse import parse_qs
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist

class JWTWebSocketAuth:
    """
    Authenticate a WebSocket connection using a JWT access token.
    """

    def __init__(self, headers=None, query_string=None):
        """
        Accept either headers or query_string for the token.
        """
        self.headers = {k.decode(): v.decode() for k, v in headers}
        self.query_string = query_string.decode() if query_string else ""

    async def authenticate(self):
        token = self.get_token()
        if not token:
            raise DenyConnection("Missing token")
        payload = self.decode_token(token)
        user = await self.get_user(payload.get("sub"))
        return user

    def get_token(self):
        # From header
        auth_header = self.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            return auth_header.split(" ")[1]

        # From query string
        params = parse_qs(self.query_string)
        if "token" in params:
            return params["token"][0]

        return None
    
    def decode_token(self, token):
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
            # Optional: check token type if you include it in payload
            return payload
        except jwt.ExpiredSignatureError:
            raise DenyConnection("Token expired")
        except jwt.InvalidTokenError:
            raise DenyConnection("Invalid token")

    @database_sync_to_async
    def get_user(self, user_id):
        from api.models.user_model import User  # lazy import can be used if needed
        try:
            return User.objects.get(id=user_id)
        except ObjectDoesNotExist:
            raise DenyConnection("User not found")
