"""Handles user authentication actions such as login, signup, forgot password and reset password"""

import logging
from smtplib import SMTPException, SMTPAuthenticationError
from datetime import datetime, timezone as dt_timezone, timedelta
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from django.conf import settings
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.hashers import check_password
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import (
    ValidationError,
    NotFound,
    PermissionDenied,
    AuthenticationFailed,
)
from chatbot.utils.messages.error_messages import (
    TOKEN_ERROR_MESSAGES,
    EMAIL_ERROR_MESSAGES,
    USER_ERROR_MESSAGES,
    PASSWORD_ERROR_MESSAGES,
)
from chatbot.utils.messages.success_messages import PASSWORD_SUCCESS_MESSAGE
from chatbot.utils.token.jwt_token import (
    decode_token,
    generate_token,
    build_token_response,
)
from chatbot.utils.errors.serializer_error import format_serializer_errors
from chatbot.utils.email_verification import send_email
from chatbot.utils.auth_helper import conditional_auth, get_authenticated_user
from chatbot.utils.encryption import decrypt_email
from api.serializers import (
    LoginSerializer,
    PasswordSerializer,
    EmailSerializer,
)
from api.models import User
from api.models.enums import SignupType
from api.constants import FORGOT_PASSWORD, RESET_PASSWORD, LOG_FORMAT

logger = logging.getLogger("api_logger")


class LoginView(APIView):
    """View to handle login route"""

    @transaction.atomic
    def post(self, request):
        """Logs in the user with email and password, generating access and refresh tokens"""

        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data["user"]

            # Check if user is active (status = 1)
            if user.status != 1:
                return Response(
                    {"error": USER_ERROR_MESSAGES["account_inactive"]},
                    status=status.HTTP_403_FORBIDDEN
                )

            access_expiry = timedelta(minutes=int(settings.ACCESS_TOKEN_EXPIRY_WEB))
            refresh_expiry = timedelta(minutes=int(settings.REFRESH_TOKEN_EXPIRY_WEB))
            if getattr(request, "app_key_validated", False):

                access_expiry = timedelta(
                    minutes=int(settings.ACCESS_TOKEN_EXPIRY_MOBILE)
                )
                refresh_expiry = timedelta(
                    minutes=int(settings.REFRESH_TOKEN_EXPIRY_MOBILE)
                )

            access_token = generate_token(user, purpose="access", expiry=access_expiry)
            refresh_token = generate_token(
                user, purpose="refresh", expiry=refresh_expiry
            )
            user.login_at = timezone.now()
            if user.password and user.signup_type == SignupType.GOOGLE_SSO:

                user.signup_type = SignupType.EMAIL_AND_GOOGLE_SSO
            user.save()

            return Response(build_token_response(access_token, refresh_token, user))

        formatted_errors = format_serializer_errors(serializer.errors)
        logger.error("Login failed: %s", formatted_errors)
        return Response(
            formatted_errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    @transaction.atomic
    def put(self, request):
        """API to generate new access and refresh tokens using the old refresh token"""
        refresh_token = request.data.get("refresh_token")

        if not refresh_token:
            raise ValidationError(
                {"token": TOKEN_ERROR_MESSAGES["refresh_token_required"]}
            )

        try:
            payload = decode_token(refresh_token, purpose="refresh")
        except ExpiredSignatureError as e:
            logger.error("Expired token : %s", e)
            raise AuthenticationFailed(TOKEN_ERROR_MESSAGES["expired_token"]) from e
        except InvalidTokenError as e:
            logger.error("Invalid token : %s ", e)
            raise AuthenticationFailed(TOKEN_ERROR_MESSAGES["invalid_refresh_token"]) from e

        try:
            user = User.objects.get(id=payload.get("sub"), status=1)
        except ObjectDoesNotExist as e:
            logger.error("User not found: %s", e)
            raise NotFound({"user": USER_ERROR_MESSAGES["user_not_found"]}) from e

        access_expiry = timedelta(minutes=int(settings.ACCESS_TOKEN_EXPIRY_WEB))
        refresh_expiry = timedelta(minutes=int(settings.REFRESH_TOKEN_EXPIRY_WEB))
        if getattr(request, "app_key_validated", False):

            access_expiry = timedelta(minutes=int(settings.ACCESS_TOKEN_EXPIRY_MOBILE))
            refresh_expiry = timedelta(
                minutes=int(settings.REFRESH_TOKEN_EXPIRY_MOBILE)
            )

        access_token = generate_token(user, purpose="access", expiry=access_expiry)
        refresh_token = generate_token(user, purpose="refresh", expiry=refresh_expiry)
        user.login_at = timezone.now()
        user.save()

        return Response(build_token_response(access_token, refresh_token, user))


class PasswordResetView(APIView):
    """View to handle password-reset route"""

    authentication_classes = []

    @transaction.atomic
    def post(self, request):
        """
        Verifies the user's email and sends a
        password reset token or checks password.
        """
        user = conditional_auth(request)
        app_key = getattr(request, "app_key", None)
        token_expiry = timedelta(minutes=int(settings.PASSWORD_RESET_TOKEN_EXPIRY))

        # Case 1: Unauthenticated user → Forgot Password flow
        if not user:
            return self._handle_unauthenticated(request, app_key, token_expiry)
        # Case 2: Authenticated user with status == 2 → Send Reset Link
        if user.signup_type == 2:
            return self._handle_authenticated_send_link(user, app_key, token_expiry)
        # Case 3: Authenticated user with status != 2 → Require current password
        return self._handle_authenticated_with_password(request, user, token_expiry)

    def _handle_unauthenticated(self, request, app_key, token_expiry):
        """
        Handles the forgot password flow for unauthenticated users
        """
        serializer = EmailSerializer(data=request.data)
        if not serializer.is_valid():
            formatted_errors = format_serializer_errors(serializer.errors)
            logger.error(
                LOG_FORMAT,
                PASSWORD_ERROR_MESSAGES.get('password_reset_fail'),
                formatted_errors
            )

            return Response(
                formatted_errors, status=status.HTTP_400_BAD_REQUEST
            )

        email = serializer.validated_data.get("email")
        try:
            User.objects.get(email=email, status=1)
        except ObjectDoesNotExist as e:
            raise NotFound({"error": EMAIL_ERROR_MESSAGES["not_found"]}) from e

        token = generate_token(email, purpose="password", expiry=token_expiry)
        scenario = FORGOT_PASSWORD

        return self._send_reset_email(email, token, app_key, scenario)

    def _handle_authenticated_send_link(self, user, app_key, token_expiry):
        """
        Sends a password reset link to authenticated users with status 2.
        """
        token = generate_token(
            user.email, purpose="password", expiry=token_expiry
        )
        scenario = RESET_PASSWORD

        return self._send_reset_email(user.email, token, app_key, scenario)

    def _handle_authenticated_with_password(self, request, user, token_expiry):
        """
        Verifies the current password for authenticated
        users whose status is not 2.
        """
        serializer = PasswordSerializer(data=request.data)
        if not serializer.is_valid():
            formatted_errors = format_serializer_errors(serializer.errors)
            logger.error(
                LOG_FORMAT,
                PASSWORD_ERROR_MESSAGES.get('password_reset_fail'),
                formatted_errors
            )
            return Response(
                formatted_errors, status=status.HTTP_400_BAD_REQUEST
            )

        password = serializer.validated_data.get("password")
        try:
            user_obj = User.objects.get(id=user.id, status=1)
        except ObjectDoesNotExist as error:
            raise NotFound(
                {"error": EMAIL_ERROR_MESSAGES["not_found"]}
            ) from error

        if (
            not user_obj.password
            or not check_password(password, user_obj.password)
        ):
            raise ValidationError(
                {"password": PASSWORD_ERROR_MESSAGES["incorrect_password"]}
            )

        token = generate_token(
            user_obj.email, purpose="password", expiry=token_expiry
        )
        return Response({"token": token})

    def _send_reset_email(self, email, token, app_key, scenario):
        """
        Sends a password reset email with the provided token.
        """
        try:
            send_email(email, token, app_key, scenario)
        except SMTPAuthenticationError as error:
            logger.error("SMTP authentication error: %s", error)
            return Response(
                {"error": str(error)}, status=status.HTTP_400_BAD_REQUEST
            )
        except SMTPException as error:
            logger.error("SMTP exception: %s", error)
            return Response(
                {"error": str(error)}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {"message": PASSWORD_SUCCESS_MESSAGE["password_reset"]}
        )


class VerifyPasswordResetView(APIView):
    """View to handle password-reset route"""

    authentication_classes = []


    @transaction.atomic
    def get(self, _request, token):
        """Decode the token and returns the email"""

        try:
            payload = decode_token(token, purpose="password")
            token_iat = payload.get("iat")
            token_iat_dt = datetime.fromtimestamp(
                token_iat, tz=dt_timezone.utc
            )

        except ExpiredSignatureError as error:
            logger.error("Expired token: %s", error)
            raise PermissionDenied(
                {"error": TOKEN_ERROR_MESSAGES["expired_token"]}
            ) from error
        except InvalidTokenError as error:
            logger.error("Invalid token: %s ", error)
            raise PermissionDenied(
                {"error": TOKEN_ERROR_MESSAGES["invalid_token"]}
            ) from error
        email = decrypt_email(payload.get("sub"))
        try:
            # Allow both active and inactive users
            user = User.objects.get(email=email, status__in=[0, 1])
        except ObjectDoesNotExist as error:
            raise NotFound(
                {"error": EMAIL_ERROR_MESSAGES["not_found"]}
            ) from error

        if (
            user.password_at
            and (token_iat_dt <= user.password_at)
            and user.signup_type != 2
        ):
            raise PermissionDenied(
                {"error": TOKEN_ERROR_MESSAGES["invalid_token"]}
            )

        return Response({"email": email})

    @transaction.atomic
    def post(self, request, token):
        """Reset password with new one"""

        serializer = PasswordSerializer(data=request.data)
        if not serializer.is_valid():
            formatted_errors = format_serializer_errors(serializer.errors)
            logger.error(
                LOG_FORMAT,
                PASSWORD_ERROR_MESSAGES.get('password_reset_fail'),
                formatted_errors
            )
            return Response(
                formatted_errors, status=status.HTTP_400_BAD_REQUEST
            )

        password = serializer.validated_data.get("password")
        return self._perform_password_reset(request, token, password)

    def _perform_password_reset(self, request, token, password):
        """Handles the actual password reset logic"""
        auth_header = request.headers.get("Authorization")

        try:
            payload = decode_token(token, purpose="password")
        except ExpiredSignatureError as error:
            logger.error("Expired token: %s", error)
            raise PermissionDenied(
                {"error": TOKEN_ERROR_MESSAGES["expired_token"]}
            ) from error
        except InvalidTokenError as error:
            logger.error("Invalid token: %s", error)
            raise PermissionDenied(
                {"error": TOKEN_ERROR_MESSAGES["invalid_token"]}
            ) from error

        email = decrypt_email(payload.get("sub"))

        try:
            # Allow both active and inactive users
            user = User.objects.get(email=email, status__in=[0, 1])
        except ObjectDoesNotExist as error:
            raise NotFound(
                {"error": EMAIL_ERROR_MESSAGES["not_found"]}
            ) from error

        token_iat = payload.get("iat")
        token_iat_dt = datetime.fromtimestamp(token_iat, tz=dt_timezone.utc)

        if (
            user.password_at
            and (token_iat_dt <= user.password_at)
            and user.signup_type != 2
        ):
            raise ValidationError(
                {"token": TOKEN_ERROR_MESSAGES["reset_token_already_used"]}
            )

        if auth_header and auth_header.startswith("Bearer "):
            auth_user = get_authenticated_user(request)
            if auth_user and user.password and check_password(
                password, user.password
            ):
                raise ValidationError(
                    {"password": PASSWORD_ERROR_MESSAGES["same_password"]}
                )

        # Activate user if they were inactive
        if user.status == 0:
            user.status = 1

        if user.signup_type == 2:
            user.signup_type = 3

        user.set_password(password)
        user.password_at = timezone.now()
        user.save()

        logger.info("Password updated for user: %s", user.email)
        return Response(
            {"message": PASSWORD_SUCCESS_MESSAGE["password_updated"]}
        )
