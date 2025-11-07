from django.db import models
from api.models import User
from .enums import FileType, Status

class FileImport(models.Model):
    
    user            = models.ForeignKey(User, on_delete=models.CASCADE)
    name            = models.CharField(max_length=255)
    path            = models.FileField(upload_to="uploads/files/", max_length=500)
    size            = models.BigIntegerField(default=0, help_text="Size of the file in bytes")
    type            = models.IntegerField(choices=FileType.choices, default=FileType.RFP)
    domain          = models.CharField(max_length=100, blank=True)
    client_name     = models.CharField(max_length=100, blank=True)
    status          = models.SmallIntegerField(choices=Status.choices, default=Status.PENDING)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    objects = models.Manager()

    class Meta:
        db_table = "file_import"
        ordering = ["-updated_at"]


class FileTechnology(models.Model):
    file = models.ForeignKey(
        FileImport,
        on_delete=models.CASCADE,
        related_name='technologies'
    )
    technology_name = models.CharField(max_length=50)

    class Meta:
        db_table = "file_technology"
        unique_together = ('file', 'technology_name')  # ensures unique file-technology pairs

    def __str__(self):
        return f"{self.file.name} - {self.technology_name}"