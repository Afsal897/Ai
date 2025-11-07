"""Dashboard APIs"""

import logging
from datetime import timedelta

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import viewsets
from rest_framework import status as drf_status
from rest_framework.exceptions import NotFound

from django.db.models import Q
from django.core.exceptions import ObjectDoesNotExist
from django.conf import settings
from django.db import transaction

from chatbot.utils.authentication import CustomIsAuthenticated, IsAdminUser
from chatbot.utils.messages.error_messages import (
    USER_ERROR_MESSAGES,
    PERMISSION_ERROR_MESSAGES,
    EMAIL_ERROR_MESSAGES,
)
from chatbot.utils.messages.success_messages import (
    USER_PROFILE_SUCCESS_MESSAGE,
)
from chatbot.utils.pagination.custom_pagination import CustomPagination
from chatbot.utils.token.jwt_token import generate_token
from chatbot.utils.email_verification import send_email
from ..models import User
from ..serializers.user_serializers import UserManagementSerializer
from ..functions import (
    apply_sorting_to_queryset,
    filter_queryset_by_params
)

logger = logging.getLogger("api_logger")


class AdminDashboardAPIView(APIView):
    """API for admin dashboard data."""

    authentication_classes = [CustomIsAuthenticated]
    permission_classes = [IsAdminUser]

    def get(self, request):
        """Return dashboard data for admin."""
        try:
            user = request.user

            # Admin dashboard
            if user.is_admin():
                data = {
                    "user_count": User.objects.count(),
                    "active_user_count": User.objects.filter(status=1).count(),
                }
                return Response(data, status=drf_status.HTTP_200_OK)
            return Response(
                {"error": PERMISSION_ERROR_MESSAGES.get(
                    "Admin Only"
                )}, status=drf_status.HTTP_403_FORBIDDEN
            )
        except AttributeError as exception:
            logger.exception(exception)
            return Response(
                {"error": str(exception)},
                status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for user management actions."""
    serializer_class = UserManagementSerializer
    authentication_classes = [CustomIsAuthenticated]
    permission_classes = [IsAdminUser]
    pagination_class = CustomPagination

    def get_object(self):
        """
        Override get_object to provide custom error message
        """
        # Get the lookup field and value
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs[lookup_url_kwarg]

        try:
            obj = self.get_queryset().get(**{self.lookup_field: lookup_value})
            # Check object permissions
            self.check_object_permissions(self.request, obj)
            return obj
        except ObjectDoesNotExist as exception:
            raise NotFound({
                "error": {
                    "id": USER_ERROR_MESSAGES.get("invalid_user_id")
                }
            }) from exception


    def get_queryset(self):
        """Return queryset for user search and listing."""
        queryset = User.objects.all().order_by("-id")

        # Handle filter
        allowed_filters = {"status", "role"}
        queryset = filter_queryset_by_params(
            queryset, self.request, allowed_filters
        )

        # Handle search
        search_query = self.request.query_params.get("search")
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query)
                | Q(email__icontains=search_query)
            )

        # Handle sorting
        allowed_sort_fields = [
            "name",
            "email"
        ]
        return apply_sorting_to_queryset(
            queryset,
            self.request,
            User,
            allowed_sort_fields
        )

    def update(self, request, *args, **kwargs):
        """Override update method to customize success/error messages."""
        response = super().update(request, *args, **kwargs)

        # Customize success message
        if response.status_code in [200, 201]:
            return Response(
                {"message": USER_PROFILE_SUCCESS_MESSAGE.get("profile")},
                status=response.status_code
            )
        return response

    def partial_update(self, request, *args, **kwargs):
        """Override partial_update method for PATCH requests."""
        response = super().partial_update(request, *args, **kwargs)

        # Customize success message
        if response.status_code in [200, 201]:
            return Response(
                {"message": USER_PROFILE_SUCCESS_MESSAGE.get("profile")},
                status=response.status_code
            )
        return response

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Override create method to set
        inactive status for admin-created users.
        """

        # Set status as inactive by default for admin-created users
        request.data["status"] = 0

        # Check if user already exists before creating
        if User.objects.filter(email=request.data.get("email")).exists():
            return Response({
                "error": EMAIL_ERROR_MESSAGES.get("email_already_registered")
                }, status=drf_status.HTTP_409_CONFLICT
            )

        # Create the user
        response = super().create(request, *args, **kwargs)

        # Send password reset email if user creation was successful
        if response.status_code in [200, 201]:
            try:
                user_data = response.data
                email = user_data.get("email")

                if email:
                    # Generate password reset token
                    token_expiry = timedelta(
                        minutes=int(settings.PASSWORD_RESET_TOKEN_EXPIRY)
                    )
                    token = generate_token(
                        email, purpose="password", expiry=token_expiry
                    )

                    # Get app key from request
                    app_key = getattr(request, "app_key", None)

                    # Send password reset email
                    send_email(
                        email,
                        token,
                        app_key,
                        "confirm-and-set-password",
                        template="email/confirm_account.html"
                    )
            except Exception as error:
                logger.exception(error)

        return response
