"""URL Configuration For User Management"""

from django.urls import path
from api.views import (
    LoginView,
    PasswordResetView,
    VerifyPasswordResetView,
    # SignupView,
    # SignupEmailView,
    SessionView,
    SessionDetailView,
    UserProfileDetailView,
    # GoogleSSOView,
    AdminDashboardAPIView,
    UserViewSet,
    FileContentView,
    FileDetailView,
    FileView,
    MessageListView,
    GeneratedFileDownload
)

urlpatterns = [
    # path("signup", SignupEmailView.as_view(), name="signup_email_view"),
    # path("signup/<str:token>", SignupView.as_view(), name="signup_view"),
    path("login", LoginView.as_view(), name="login_view"),
    path("password-reset", PasswordResetView.as_view(), name="password_reset_view"),
    path(
        "password-reset/<str:token>",
        VerifyPasswordResetView.as_view(),
        name="verify_password_reset_view",
    ),
    path("users/me", UserProfileDetailView.as_view(), name="user_profile_detail_view"),
    # path("sso", GoogleSSOView.as_view(), name="google_sso"),
    path(
        "admin-dashboard/",
        AdminDashboardAPIView.as_view(), name="admin-dashboard"
    ),
    path(
        "users/",
        UserViewSet.as_view({"get": "list", "post": "create"}),
        name="user-list"
    ),
    path(
        "users/<int:pk>/", UserViewSet.as_view({
            "get": "retrieve", "put": "update",
            "patch": "partial_update", "delete": "destroy"
        }), name="user-detail"
    ),
    path("sessions", SessionView.as_view(), name="session_view"),
    path("sessions/<int:session_id>", SessionDetailView.as_view(), name="session_detail_view"),
    path("sessions/<int:session_id>/messages", MessageListView.as_view(), name="message_list_view"),
    path("sessions/messages/<int:message_id>/download", GeneratedFileDownload.as_view(), name="download_generated_file"),
    path("files", FileView.as_view(), name="file-list-upload"),
    path("files/<int:file_id>", FileDetailView.as_view(), name="file-detail"),
    path("files/<int:file_id>/download", FileContentView.as_view(), name="content-detail"),
]
