import logging, os, mimetypes
from django.db import transaction
from rest_framework.response import Response
from rest_framework.views import APIView
from chatbot.utils.errors.serializer_error import format_serializer_errors
from chatbot.utils.pagination.custom_pagination import CustomPagination
from chatbot.utils.authentication import CustomIsAuthenticated
from rest_framework import status
from django.conf import settings
from api.serializers import (
    SessionSerializer, SessionListSerializer, 
    SessionUpdateSerializer, SessionDetailSerializer,
    MessageSerializer
    )
from api.models import Session, Message
from rest_framework.exceptions import ValidationError, NotFound
from chatbot.utils.messages.error_messages import SESSION_ERROR_MESSAGES
from chatbot.utils.messages.success_messages import SESSION_SUCCESS_MESSAGES
from chatbot.utils.messages.error_messages import FILE_ERROR_MESSAGES
from django.http import FileResponse
from api.functions import server_file_path


logger = logging.getLogger("api_logger")


class SessionView(APIView):
    """View to handle create and list session route"""

    authentication_classes = [CustomIsAuthenticated]

    @transaction.atomic
    def post(self, request):
        """create a new session for the user"""

        serializer = SessionSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            session=serializer.save()

            return Response(SessionSerializer(session).data, status=status.HTTP_201_CREATED)

        formatted_errors = format_serializer_errors(serializer.errors)
        logger.error("Create session failed: %s", formatted_errors)
        return Response(
            formatted_errors,
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    def get(self, request):
        """get all sessions for the user"""
        errors = {}
        sessions = Session.objects.select_related('user').filter(user=request.user).order_by("-created_at")

        paginator = CustomPagination()

        try:
            paginated_files = paginator.paginate_queryset(sessions, request)
        except NotFound:
            errors["page"] = SESSION_ERROR_MESSAGES["invalid_page"]

        if errors:
            raise ValidationError(errors)

        serializer = SessionListSerializer(paginated_files, many=True)
        return paginator.get_paginated_response(serializer.data)
        

class SessionDetailView(APIView):
    """view to handle session details"""

    authentication_classes = [CustomIsAuthenticated]

    def get(self, request, session_id):
        """get session details"""
        try:
            session = Session.objects.get(id=session_id, user=request.user)
        except Session.DoesNotExist:
            return Response(
                {"error": SESSION_ERROR_MESSAGES["not_found"]},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = SessionDetailSerializer(session)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def delete(self, request, session_id):
        """delete a session"""
        try:
            session = Session.objects.get(id=session_id, user=request.user)
        except Session.DoesNotExist:
            return Response(
                {"error":SESSION_ERROR_MESSAGES["not_found"]},
                status=status.HTTP_404_NOT_FOUND,
            )

        session.delete()
        return Response(
                        {"message":SESSION_SUCCESS_MESSAGES["deleted"]},
                        status=status.HTTP_200_OK
                        )
    
    def put(self, request, session_id):
        """update a session name"""
        try:
            session = Session.objects.get(id=session_id, user=request.user)
        except Session.DoesNotExist:
            return Response(
                {"error":SESSION_ERROR_MESSAGES["not_found"]},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        serializer = SessionUpdateSerializer(session, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        formatted_errors = format_serializer_errors(serializer.errors)
        logger.error("Update session failed: %s", formatted_errors)
        return Response(formatted_errors, status=status.HTTP_400_BAD_REQUEST)
    
class MessageListView(APIView):

    authentication_classes = [CustomIsAuthenticated]
    
    def get(self, request, session_id):
        session = Session.objects.get(id=session_id, user=request.user)
        messages = session.message_set.all().order_by("-created_at")

        paginator = CustomPagination()
        paginated_msgs = paginator.paginate_queryset(messages, request)

        serializer = MessageSerializer(paginated_msgs, many=True)
        return paginator.get_paginated_response(serializer.data)
    

class GeneratedFileDownload(APIView):
    """Provides a download URL for a user's file."""
    authentication_classes = [CustomIsAuthenticated]

    def get_object(self, request, message_id):
        try:
            return Message.objects.get(pk=message_id)
        except Message.DoesNotExist as e:
            raise NotFound({"id": FILE_ERROR_MESSAGES["not_found"]}) from e

    def get(self, request, message_id):
        file_obj = self.get_object(request, message_id)

        if not file_obj.file_path:
            raise NotFound({"file": FILE_ERROR_MESSAGES["not_found"]})

        # Absolute path of the file
        relative_path = str(file_obj.file_path)
        absolute_path = os.path.join(server_file_path,"API", relative_path)
        logger.info(f"relative_path :{relative_path}")
        logger.info(f"absolute_path :{absolute_path}")

        if not os.path.exists(absolute_path):
            raise NotFound({"file": FILE_ERROR_MESSAGES["not_found"]})
        # Guess content type from extension
        content_type, _ = mimetypes.guess_type(absolute_path)

        return FileResponse(
            open(absolute_path, "rb"),
            as_attachment=True,
            filename=file_obj.file_name or os.path.basename(absolute_path),
            content_type=content_type or "application/octet-stream",
        )
