"""
Custom authentication class using JWT tokens.

This module defines a `CustomIsAuthenticated` class that:
- Extracts and validates JWT tokens from the Authorization header.
- Decodes the token and ensures it's a valid 'access' token.
- Retrieves and authenticates the user based on the token data.
"""

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import BasePermission
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from django.core.exceptions import ObjectDoesNotExist
from dotenv import load_dotenv
from api.models import User
from chatbot.utils.messages.error_messages import (
    TOKEN_ERROR_MESSAGES,
    USER_ERROR_MESSAGES,
)
from chatbot.utils.token.jwt_token import decode_token


load_dotenv()


class CustomIsAuthenticated(BaseAuthentication):
    """
    Custom authentication class that verifies JWT access tokens
    from the Authorization header and authenticates users.
    """

    def authenticate(self, request):
        """
        Authenticate the request by extracting the token, decoding it,
        and returning the authenticated user along with the token.
        """
        token = self.get_token_from_header(request)
        decoded_token = self.decode_and_validate_token(token)
        return self.get_user_and_token(decoded_token), token

    def get_token_from_header(self, request):
        """
        Extract the JWT token from the 'Authorization' header.

        Raises:
            AuthenticationFailed: If header is missing or doesn't start with 'Bearer'.
        """
        auth_header = request.META.get("HTTP_AUTHORIZATION")
        if not auth_header or not auth_header.startswith("Bearer"):
            raise AuthenticationFailed(TOKEN_ERROR_MESSAGES["token_required"])
        return auth_header.split(" ")[1]

    def decode_and_validate_token(self, token):
        """
        Decode the JWT token and validate its structure and type.

        Raises:
            AuthenticationFailed: If token is expired or invalid, or not an access token.
        """

        try:
            payload = decode_token(token, purpose="access")
        except ExpiredSignatureError as e:

            raise AuthenticationFailed(TOKEN_ERROR_MESSAGES["expired_token"]) from e
        except InvalidTokenError as e:

            raise AuthenticationFailed(TOKEN_ERROR_MESSAGES["invalid_token"]) from e
        return payload

    def get_user_and_token(self, decoded_token):
        """
        Retrieve the user from the database using the decoded token data.

        Raises:
            AuthenticationFailed: If user does not exist.
        """
        user_id = decoded_token.get("sub")
        try:
            user = User.objects.get(id=user_id)
        except ObjectDoesNotExist as e:
            raise AuthenticationFailed(USER_ERROR_MESSAGES["user_not_found"]) from e
        return user

    def authenticate_header(self, request):
        """
        Return the value for the `WWW-Authenticate` header used in authentication responses.
        """
        return 'Bearer realm="api"'


class IsAdminUser(BasePermission):
    """
    Custom permission to only allow admin users.
    """

    def has_permission(self, request, view):
        """
        Method to check the authenticated user is admin or not
        """
        return request.user and request.user.is_admin()


