"""Handles user profile update"""

import logging
from django.db import transaction
from rest_framework.response import Response
from rest_framework.views import APIView
from api.serializers import UserDetailSerializer
from chatbot.utils.authentication import CustomIsAuthenticated

logger = logging.getLogger("api_logger")


class UserProfileDetailView(APIView):
    """view to handle user profile update route"""

    authentication_classes = [CustomIsAuthenticated]

    @transaction.atomic
    def get(self, request):
        """get user profile data"""
        serializer = UserDetailSerializer(request.user, context={"request": request})
        return Response(serializer.data)
