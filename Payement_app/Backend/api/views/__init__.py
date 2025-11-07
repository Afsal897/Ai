"""Centralized import of all views for Django recognition"""

# from .signup import SignupView, SignupEmailView, GoogleSSOView
from .login import LoginView, PasswordResetView, VerifyPasswordResetView
from .session import SessionView, SessionDetailView, MessageListView, GeneratedFileDownload
from .user import UserProfileDetailView
from .dashboard import (
    AdminDashboardAPIView,
    UserViewSet,
)
from .file_upload import (
    FileView, 
    FileDetailView, 
    FileContentView
    )