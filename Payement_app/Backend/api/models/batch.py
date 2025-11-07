
from django.db import models
from api.models import User, FileImport
from .enums import Status

class Batch(models.Model):
    
    user            = models.ForeignKey(User, on_delete=models.CASCADE)
    host            = models.CharField(max_length=255)
    file            = models.ForeignKey(FileImport, on_delete=models.SET_NULL, null=True, blank=True)
    status          = models.IntegerField(choices=Status.choices, default=Status.PENDING)
    start_time      = models.DateTimeField()
    end_time        = models.DateTimeField(null=True, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    objects = models.Manager()

    class Meta:
        db_table = "batch"

