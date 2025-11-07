from rest_framework import serializers
from api.models import Session, Message
from django.utils import timezone


class SessionSerializer(serializers.ModelSerializer):
    """Serializer for session creation"""

    class Meta:
        model=Session
        fields=[
            "id",
            "user",
            "name",
            "is_active",
            "created_at",
            "updated_at"
        ]
        read_only_fields = [
            "id",
            "user",
            "name",
            "is_active",
            "created_at",
            "updated_at"
        ]

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user

        # Default session name if not provided
        name = validated_data.get('name', 'New chat')

        return Session.objects.create(
            user=user,
            name=name,
            is_active=1,  #  Inactive
        )
    
class SessionListSerializer(serializers.ModelSerializer):
    """serializer for listing sessions"""
    class Meta:
        model=Session
        fields=[
            "id",
            "name",
            "created_at",
            "updated_at"
        ]

class SessionUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = ["name"] 
    
    def validate(self, attrs):
        if "name" not in attrs:
            raise serializers.ValidationError({"name": "Session name is required."})
        return attrs
    
    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Session name cannot be empty.")
        return value
    

class MessageSerializer(serializers.ModelSerializer):
    """Serializer for individual messages inside a session."""

    has_file = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = ["id", "message", "direction", "has_file", "file_name", "created_at"]  # adjust fields as per your model
        
    def get_has_file(self, obj):
        # Convert 0 -> True, 1 -> False
        return obj.has_file == 0

class SessionDetailSerializer(serializers.ModelSerializer):
    """Serializer for a session with all its messages."""

    messages = MessageSerializer(many=True, read_only=True, source="message_set")

    class Meta:
        model = Session
        fields = ["id", "name", "created_at", "messages"] 