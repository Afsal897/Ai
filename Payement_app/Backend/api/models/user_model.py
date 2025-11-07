"""
This module defines custom user models and user manager classes for authentication.

"""

from django.db import models
from django.contrib.auth.hashers import make_password
from api.models.enums import SignupType, UserRole


class User(models.Model):
    """model for user details"""

    email = models.CharField(unique=True, max_length=255)
    password = models.CharField(max_length=100, blank=True, null=True)
    name = models.CharField(max_length=100)
    password_at = models.DateTimeField(blank=True, null=True)
    login_at = models.DateTimeField(blank=True, null=True)
    is_subscribed = models.BooleanField(default=False)
    status = models.SmallIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    signup_type = models.IntegerField(
        choices=SignupType.choices, default=SignupType.EMAIL_ONLY
    )
    role = models.IntegerField(choices=UserRole.choices, default=UserRole.USER)

    objects = models.Manager()

    def is_admin(self):
        """Helper function to check whether the user is admin ot not"""
        return self.role == 0

    def set_password(self, raw_password):
        """Helper function to hash and store the password"""
        self.password = make_password(raw_password)
        self._password = raw_password

    class Meta:
        """
        Specifies the name of the database table for this model.
        """

        db_table = "user"
