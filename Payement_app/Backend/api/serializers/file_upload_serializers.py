from rest_framework import serializers
from api.models import FileImport, FileTechnology
from api.models.enums import FileType
from datetime import datetime
import logging
import os
from api.functions import server_file_path
from chatbot.utils.messages.error_messages import FILE_ERROR_MESSAGES
# from chatbot.utils.s3_helper import generate_download_url

logger = logging.getLogger("api_logger")

class FileUploadSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True, required=True)
    technology = serializers.ListField(
        child=serializers.CharField(max_length=50),
        write_only=True,
        required=False
    )
    class Meta:
        model = FileImport
        fields = [
            "id",
            "file",
            "name",
            "path",
            "size",
            "type", 
            "domain",
            "technology", 
            "client_name", 
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id", 
            "name",
            "path",
            "size",
            "created_at", 
            "updated_at"
        ]

    def validate_type(self, filetype):
        """
        Validate that 'type' field is one of the defined FileType choices.
        """
        valid_choices = [choice.value for choice in FileType]  # [0, 1]
        if filetype not in valid_choices:
            raise serializers.ValidationError(FILE_ERROR_MESSAGES["Invalid type"])
        return filetype

    def validate_file(self, upload_file):
        """Validate uploaded PowerPoint file (.ppt or .pptx)."""
        try:
            ext = os.path.splitext(upload_file.name)[1].lower()
            allowed_exts = [".ppt", ".pptx"]

            if ext not in allowed_exts:
                raise ValueError(FILE_ERROR_MESSAGES["Invalid type"])
        except ValueError as e:
            raise serializers.ValidationError(str(e))
        return upload_file


    def create(self, validated_data):
        technology_list = validated_data.pop("technology", [])
        upload_file = validated_data.pop("file")
        user = self.context["request"].user

        # Save file to disk (same as your current implementation)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        new_filename = f"{timestamp}_{upload_file.name}"
        relative_path = f"uploads/files/{new_filename}"
        full_path = os.path.join(server_file_path, "media", relative_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb+") as destination:
            for chunk in upload_file.chunks():
                destination.write(chunk)

        # Save main FileImport record
        file_obj = FileImport.objects.create(
            user=user,
            name=upload_file.name,
            path=relative_path,
            size=upload_file.size,
            **validated_data
        )

        # Save each technology into file_technology table
        for tech_name in technology_list:
            if tech_name.strip():  # skip empty strings
                FileTechnology.objects.create(file=file_obj, technology_name=tech_name)

        return file_obj




class FileListSerializer(serializers.ModelSerializer):
    """Lightweight listing serializer for paginated GET /api/files."""

    status = serializers.SerializerMethodField()
    technology = serializers.SerializerMethodField()
    class Meta:
        model = FileImport
        fields = [
            "id",
            "name",
            "size",
            "status",
            "type", 
            "domain", 
            "technology", 
            "client_name", 
            "created_at",
            "updated_at"
        ]
        read_only_fields = fields

    def get_status(self, obj):
        # Returns the human-readable label for the status field
        return obj.get_status_display()
    
    def get_technology(self, obj):
        # Use the related_name from the ForeignKey in FileTechnology
        return [tech.technology_name for tech in obj.technologies.all()]

class FileContentSerializer(serializers.ModelSerializer):
    download_link = serializers.SerializerMethodField()

    class Meta:
        model = FileImport
        fields = ["download_link"]
        read_only_fields = fields

    # def get_download_link(self, obj):
    #     file_path = str(obj.path or "")
    #     if not file_path:
    #         return None

    #     # S3 URL
    #     filename = obj.name
    #     url = generate_download_url(file_path, filename)
    #     if url:
    #         return url


