"""Custom middleware for app key"""

from django.http import JsonResponse
from django.conf import settings


class AppKeyMiddleware:
    """class to check app key for certain routes"""

    def __init__(self, get_response):
        self.get_response = get_response
        self.valid_app_key = settings.X_APP_KEY

        # Define paths where App-Key is required
        self.protected_paths = [
            "/api/login",
            "/api/signup",
            "/api/signup/email",
            "/api/password-reset",
        ]

    def __call__(self, request):
        # Only apply logic for specified paths

        request.app_key_validated = False
        if request.path in self.protected_paths:
            app_key = request.headers.get("X-APP-KEY")

            if app_key:
                if app_key == self.valid_app_key:
                    request.app_key_validated = True
                    request.app_key = app_key
                else:
                    return JsonResponse(
                        {"error": {"app_key": "Invalid app key"}}, status=400
                    )

        return self.get_response(request)
