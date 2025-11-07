from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError, NotFound
from django.db import transaction
import mimetypes
from django.conf import settings
from django.http import FileResponse
from api.serializers import (
    FileUploadSerializer, 
    FileListSerializer, 
    )
from api.models import FileImport
from api.validator import validate_and_filter_files, validate_request_fields, check_admin
from chatbot.utils.authentication import CustomIsAuthenticated
from chatbot.utils.pagination.custom_pagination import CustomPagination
from chatbot.utils.messages.error_messages import FILE_ERROR_MESSAGES, PERMISSION_ERROR_MESSAGES
from chatbot.utils.messages.success_messages import FILE_SUCCESS_MESSAGES
from chatbot.utils.errors.serializer_error import format_serializer_errors
import logging, os
from api.functions import server_file_path


logger = logging.getLogger("api_logger")

class FileView(APIView):
    """View to handle file upload and listing"""

    authentication_classes = [CustomIsAuthenticated]

    @transaction.atomic
    def post(self, request):
        """Upload CSV, validate metadata, and save all details"""

        # Admin check
        error_response = check_admin(request.user)
        if error_response:
            return error_response
        
        upload_file = request.FILES.get("file")

        if not upload_file:
            return Response(
                {"error": FILE_ERROR_MESSAGES["no_file_attached"]},
                status=status.HTTP_400_BAD_REQUEST
            )
        # Validate request fields
        validate_request_fields(request.data)

        serializer = FileUploadSerializer(data=request.data, context={"request": request})
        
        # Validate & save record
        if serializer.is_valid():
            file_obj = serializer.save()

            return Response(
                {
                    "message": FILE_SUCCESS_MESSAGES["file_uploaded"],
                    "file_id": file_obj.id,
                    "name": file_obj.name,
                    "type": str(file_obj.type),
                    "domain": file_obj.domain or "",
                    "technology": [tech.technology_name for tech in file_obj.technologies.all()],
                    "client_name": file_obj.client_name or "",
                    "path": file_obj.path.url,
                    "size": file_obj.size,
                    "created_at": file_obj.created_at.isoformat(),
                    "updated_at": file_obj.updated_at.isoformat(),
                },
                status=status.HTTP_201_CREATED
            )

        # Handle serializer errors
        formatted_errors = format_serializer_errors(serializer.errors)
        logger.error("File upload failed: %s", formatted_errors)
        return Response(formatted_errors, status=status.HTTP_400_BAD_REQUEST)


    @transaction.atomic
    def get(self, request):
        """List uploaded files for current user"""
        # Admin check
        error_response = check_admin(request.user)
        if error_response:
            return error_response
        
        errors = {}
        files = FileImport.objects.select_related('user').filter(user=request.user).order_by("-updated_at")
        
        try:
            files = validate_and_filter_files(request, files, FileImport)
        except ValidationError as e:
            errors.update(e.detail)

        paginator = CustomPagination()

        try:
            paginated_files = paginator.paginate_queryset(files, request)
        except NotFound:
            errors["page"] = FILE_ERROR_MESSAGES["invalid_page"]

        if errors:
            raise ValidationError(errors)

        serializer = FileListSerializer(paginated_files, many=True)
        return paginator.get_paginated_response(serializer.data)


class FileDetailView(APIView):
    """Handles retrieving, deleting and providing URLs for a file."""

    authentication_classes = [CustomIsAuthenticated]

    def _get_file(self, request, file_id):
        try:
            return FileImport.objects.get(pk=file_id, user=request.user)
        except FileImport.DoesNotExist as e:
            raise NotFound({"id": FILE_ERROR_MESSAGES["not_found"]}) from e

    def _delete_s3_file(self, key: str):
        
        try:
            settings.S3_CLIENT.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
            logger.info("Deleted from S3: %s", key)
        except Exception as e:
            logger.warning("S3 deletion failed for key=%s: %s", key, e)

    def _delete_related_s3_objects(self, file_obj):
        if not file_obj.path:
            return

        self._delete_s3_file(str(file_obj.path))

        # if file_obj.status == UploadStatus.FAILED and file_obj.error_file:
        #     self._delete_s3_file(str(file_obj.error_file))

    @transaction.atomic
    def get(self, request, file_id):
        # Admin check
        error_response = check_admin(request.user)
        if error_response:
            return error_response
        
        file_obj = self._get_file(request, file_id)
        serializer = FileListSerializer(file_obj, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @transaction.atomic
    def delete(self, request, file_id):
        # Admin check
        error_response = check_admin(request.user)
        if error_response:
            return error_response
        
        file_obj = self._get_file(request, file_id)

        path = str(file_obj.path)
        if path:
            # Convert relative path to absolute
            full_path = os.path.join(server_file_path, "media", path)

            if os.path.exists(full_path):
                try:
                    os.remove(full_path)
                    logger.info("Deleted file at %s", full_path)
                except Exception as e:
                    logger.error("Failed to delete file at %s: %s", full_path, str(e))
            else:
                logger.warning("File not found on disk: %s", full_path)
        else:
            logger.warning("File path missing for file ID %s", file_id)  
        file_obj.delete()

        return Response(
            {"message": FILE_SUCCESS_MESSAGES["file_deleted"]},
            status=status.HTTP_200_OK,
        )



class FileContentView(APIView):
    """Provides a download URL for the main file content."""
    authentication_classes = [CustomIsAuthenticated]

    def get_object(self, request, file_id):
        try:
            return FileImport.objects.get(pk=file_id, user=request.user)
        except FileImport.DoesNotExist as e:
            raise NotFound({"id": FILE_ERROR_MESSAGES["not_found"]}) from e

    def get(self, request, file_id):
        # Admin check
        error_response = check_admin(request.user)
        if error_response:
            return error_response
        
        file_obj = self.get_object(request, file_id)
        relative_path = str(file_obj.path)
        absolute_path = os.path.join(server_file_path,"media", relative_path)
        if not os.path.exists(absolute_path):
            raise NotFound({"file": FILE_ERROR_MESSAGES["not_found"]})

        # Guess content type from file extension
        content_type, _ = mimetypes.guess_type(absolute_path)

        response = FileResponse(
            open(absolute_path, "rb"),
            as_attachment=True,
            filename=file_obj.name,
            content_type=content_type or "application/octet-stream",
        )
        response["Access-Control-Expose-Headers"] = "Content-Disposition"
        return response
