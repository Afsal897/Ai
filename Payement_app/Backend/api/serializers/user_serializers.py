"""Handles serialization for user profile data"""

import logging
from rest_framework import serializers
from chatbot.utils.messages.error_messages import PROFILE_ERROR_MESSAGES
from api.validator import (
    validate_name_field,
)
from api.models import User


logger = logging.getLogger("api_logger")


class UserSerializer(serializers.ModelSerializer):
    """serializer to hanlde user profile update"""

    password = serializers.CharField(write_only=True)
    email = serializers.EmailField(read_only=True)

    class Meta:
        """Specifies the model and fields to serialize data"""

        model = User
        fields = ["name", "password", "email"]

    def validate_name(self, value):
        """validate name"""
        return validate_name_field(value)



class UserDetailSerializer(serializers.ModelSerializer):
    """serializer to retun user details"""

    password = serializers.CharField(write_only=True, required=False)
    email = serializers.EmailField()
    last_login = serializers.DateTimeField(source="login_at", read_only=True)
    password_at = serializers.DateTimeField(read_only=True)
    is_subscribed = serializers.BooleanField(read_only=True)


    def validate_name(self, value):
        return validate_name_field(value)

    class Meta:
        """Specifies the model and fields to serialize user data"""

        model = User
        fields = [
            "id", "name","signup_type",
            "password", "email", "role", "status", "password_at", "last_login", "is_subscribed"
        ]


class UserManagementSerializer(serializers.ModelSerializer):
    """
    Serializer for admin user management with
    essential fields for listing and managing users
    """
    email = serializers.EmailField()

    def validate_name(self, value):
        """validate name"""
        return validate_name_field(value)

    class Meta:
        model = User
        fields = [
            'id', 'name', 'email', 'role',
            'status', 'signup_type', 'updated_at'
        ]
