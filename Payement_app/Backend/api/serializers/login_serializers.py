"""Handles serialization for login and password."""

from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.hashers import check_password
from django.core.exceptions import ObjectDoesNotExist
from chatbot.utils.messages.error_messages import (
    COMMON_ERROR_MESSAGES,
    USER_ERROR_MESSAGES,
    EMAIL_ERROR_MESSAGES,
)
from api.validator import validate_password_field
from api.models import User


class LoginSerializer(serializers.Serializer):
    """Serializer for handling user login authentication."""

    email = serializers.EmailField(
        error_messages={
            **COMMON_ERROR_MESSAGES,
            "invalid": EMAIL_ERROR_MESSAGES["invalid_email_address"],
        }
    )
    password = serializers.CharField(
        error_messages=COMMON_ERROR_MESSAGES, write_only=True
    )

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        try:
            user = User.objects.get(email=email)
        except ObjectDoesNotExist as e:
            raise AuthenticationFailed(
                USER_ERROR_MESSAGES["invalid_credentials"]
            ) from e

        if not user.password or not check_password(password, user.password):
            raise AuthenticationFailed(USER_ERROR_MESSAGES["invalid_credentials"])

        attrs["user"] = user
        return attrs

    def create(self, validated_data):
        raise NotImplementedError(
            "Create method is not implemented for LoginSerializer."
        )


class PasswordSerializer(serializers.Serializer):
    """Serializer for handling password reset."""

    password = serializers.CharField(
        error_messages=COMMON_ERROR_MESSAGES, write_only=True
    )

    def validate_password(self, value):
        """validate password"""
        return validate_password_field(value)

    def create(self, validated_data):
        raise NotImplementedError(
            "Create method is not implemented for LoginSerializer."
        )
