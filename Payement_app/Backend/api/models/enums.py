"""To list enum values"""

from django.db import models


class SignupType(models.IntegerChoices):
    """Signup types"""

    EMAIL_ONLY = 1, "Email/Password"
    GOOGLE_SSO = 2, "Google SSO"
    EMAIL_AND_GOOGLE_SSO = 3, "Both Email/Password and Google SSO"

class UserRole(models.IntegerChoices):
    ADMIN = 0, "Admin"
    USER = 1, "General User"
    MANAGER = 2, "Manager"
    SALES = 3, "Sales"
    DEVELOPER = 4, "Developer"


class FileType(models.IntegerChoices):
    RFP = 0, "RFP"
    CASESTUDY = 1, "Case Study"


class SessionType(models.IntegerChoices):
    ACTIVE = 0, "Active"
    INACTIVE = 1, "Inactive"

class Status(models.IntegerChoices):
    PENDING = 0, "Pending"
    IN_PROGRESS = 1, "In Progress"
    COMPLETED = 2, "Completed"
    FAILED = 3, "Failed"