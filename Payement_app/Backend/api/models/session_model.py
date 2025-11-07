"""
This module defines the session user uses.

"""
from django.db import models
from api.models import User
from .enums import SessionType


class Session(models.Model):
    """model for session details"""

    user       = models.ForeignKey(User, on_delete=models.CASCADE)
    name       = models.CharField(max_length=255)
    is_active  = models.IntegerField(choices=SessionType.choices, default=SessionType.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = models.Manager()

    class Meta:
        """
        Specifies the name of the database table for this model.
        """

        db_table = "session"