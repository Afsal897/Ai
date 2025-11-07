"""Handles serialization for signup and email"""

from django.utils import timezone
from django.contrib.auth.hashers import make_password
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from rest_framework import serializers
from rest_framework.exceptions import (
    AuthenticationFailed,
    PermissionDenied,
)

from api.validator import (
    validate_email_field,
    validate_name_field,
    validate_password_field,
)
from api.models import User
from api.models.enums import SignupType
from chatbot.utils.token.jwt_token import decode_token
from chatbot.utils.encryption import decrypt_email
from chatbot.utils.messages.error_messages import (
    COMMON_ERROR_MESSAGES,
    TOKEN_ERROR_MESSAGES,
    EMAIL_ERROR_MESSAGES,
)


class EmailSerializer(serializers.Serializer):
    """Serializer for handling email verification."""

    email = serializers.EmailField(
        error_messages={
            **COMMON_ERROR_MESSAGES,
            "invalid": EMAIL_ERROR_MESSAGES["invalid_email_address"],
        }
    )

    def validate_email(self, value):
        """validate email"""
        return validate_email_field(value)

    def create(self, validated_data):
        raise NotImplementedError(
            "Create method is not implemented for LoginSerializer."
        )


class SignUpSerializer(serializers.Serializer):
    """Serializer for handling user registration."""

    name = serializers.CharField(error_messages=COMMON_ERROR_MESSAGES)
    password = serializers.CharField(
        error_messages=COMMON_ERROR_MESSAGES, write_only=True
    )

    def validate_name(self, value):
        """validate email"""
        return validate_name_field(value)

    def validate_password(self, value):
        """validate password"""
        return validate_password_field(value)

    def validate(self, attrs):
        token = self.context.get("token")

        try:
            payload = decode_token(token, purpose="signup")
        except ExpiredSignatureError as e:

            raise PermissionDenied(
                {"error": TOKEN_ERROR_MESSAGES["expired_token"]}
            ) from e
        except InvalidTokenError as e:

            raise PermissionDenied(
                {"error": TOKEN_ERROR_MESSAGES["invalid_token"]}
            ) from e

        attrs["email"] = decrypt_email(payload.get("sub"))
        return attrs

    def create(self, validated_data):
        email = validated_data.get("email")
        password = validated_data.get("password")
        name = validated_data.get("name")

        hashed_password = make_password(password)

        user = User.objects.create(
            email=email,
            password=hashed_password,
            name=name,
            login_at=timezone.now(),
            signup_type=SignupType.EMAIL_ONLY,
        )
        return user

    def update(self, instance, validated_data):
        raise NotImplementedError(
            "Update method is not implemented for RegisterSerializer."
        )
