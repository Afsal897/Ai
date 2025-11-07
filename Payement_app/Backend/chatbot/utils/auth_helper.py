"""Helper function to verfiy mixed mode auth"""

from rest_framework.exceptions import ValidationError
from chatbot.utils.authentication import CustomIsAuthenticated


def conditional_auth(request):
    """Handles mixed-mode authentication"""

    email = request.data.get("email")
    password = request.data.get("password")

    if email and password:
        raise ValidationError({"field": "Cannot provide both email and password"})

    auth_header = request.headers.get("Authorization", "")
    has_token = auth_header.startswith("Bearer ")
    if has_token:
        return get_authenticated_user(request)
    return None


def get_authenticated_user(request):
    """return authenticated user"""
    auth = CustomIsAuthenticated()

    user, _ = auth.authenticate(request)
    return user
