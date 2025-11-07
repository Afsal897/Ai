"""Custom Exception"""

import logging
from rest_framework.views import exception_handler
from rest_framework.exceptions import (
    APIException,
    ValidationError,
    AuthenticationFailed,
)
from rest_framework import status

logger = logging.getLogger("api_logger")


class UserAlreadyExistsException(APIException):
    """Exception raised when a user with the given email already exists."""

    status_code = status.HTTP_409_CONFLICT
    default_detail = "Email address already registered"


def custom_exception_handler(exc, context):
    """Custom exception handler"""
    response = exception_handler(exc, context)

    if response is not None:
        if isinstance(exc, ValidationError):
            response.data = {"error": response.data}

        elif isinstance(exc, AuthenticationFailed):
            message = exc.detail

            response.data = {"error": message}
            response.status_code = 401
    else:
        logger.exception("Unhandled exception: %s", str(exc))

    return response
