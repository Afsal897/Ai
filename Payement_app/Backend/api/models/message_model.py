"""
This module defines the messages in each session for each users.

"""
from django.db import models
from api.models import Session


class Message(models.Model):
    """model for message details"""

    session    = models.ForeignKey(Session, on_delete=models.CASCADE)
    message    = models.CharField(max_length=10240, blank=True)
    direction  = models.IntegerField(default=1)# 1 - user, 2 - bot
    has_file   = models.IntegerField(default=1)#0 - true, 1 - false
    file_name   = models.CharField(blank=True, null=True, max_length=255)
    file_path   = models.FileField(upload_to="uploads/generated_ppt/", max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = models.Manager()

    class Meta:
        """
        Specifies the name of the database table for this model.
        """

        db_table = "message"