"""Handles user authentication actions such as login, signup, forgot password and reset password"""

import logging
from datetime import timedelta
from smtplib import SMTPException, SMTPAuthenticationError
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import (
    ValidationError,
    PermissionDenied,
    NotFound,
)
from django.core.exceptions import ObjectDoesNotExist
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from chatbot.utils.messages.error_messages import (
    TOKEN_ERROR_MESSAGES,
    USER_ERROR_MESSAGES,
    EMAIL_ERROR_MESSAGES,
)
from chatbot.utils.messages.success_messages import SUGNUP_SUCCESS_MESSAGE
from chatbot.utils.token.jwt_token import (
    generate_token,
    decode_token,
    build_token_response,
)
from chatbot.utils.token.google_token import verify_google_token
from chatbot.utils.errors.serializer_error import format_serializer_errors
from chatbot.utils.email_verification import send_email
from chatbot.utils.exceptions import UserAlreadyExistsException
from chatbot.utils.encryption import decrypt_email
from api.validator import check_existing_user
from api.serializers import EmailSerializer, SignUpSerializer
from api.models import User
from api.models.enums import SignupType

logger = logging.getLogger("api_logger")


class SignupEmailView(APIView):
    """View to handle signup/email route"""

    @transaction.atomic
    def post(self, request):
        """Sends a verification token to the user's email."""
        app_key = request.META.get("HTTP_X_APP_KEY")

        serializer = EmailSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data.get("email")
            try:
                check_existing_user(email)
            except UserAlreadyExistsException as e:
                logger.error("User already exists : %s", e)
                return Response({"error": str(e)}, status=e.status_code)

            expiry = timedelta(minutes=int(settings.SIGNUP_TOKEN_EXPIRY))
            token = generate_token(email, purpose="signup", expiry=expiry)

            try:
                send_email(
                    email, token, app_key, "signup",
                    template="email/verify_signup.html"
                )
            except SMTPAuthenticationError as e:
                logger.error("SMTP authentication error: %s", e)
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

            except SMTPException as e:
                logger.error("SMTP exception: %s", e)
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

            return Response({"message": SUGNUP_SUCCESS_MESSAGE["signup_verify"]})
        formatted_errors = format_serializer_errors(serializer.errors)
        logger.error("Failed to send signup mail: %s", formatted_errors)
        return Response(
            formatted_errors,
            status=status.HTTP_400_BAD_REQUEST,
        )


class SignupView(APIView):
    """View to handle signup route"""

    @transaction.atomic
    def get(self, _request, token):
        """Decode the token and returns the email"""

        try:
            payload = decode_token(token, purpose="signup")
        except ExpiredSignatureError as e:
            logger.error("Expired token: %s", e)
            raise PermissionDenied(
                {"error": TOKEN_ERROR_MESSAGES["expired_token"]}
            ) from e
        except InvalidTokenError as e:
            logger.error("Invalid token: %s ", e)
            raise PermissionDenied(
                {"error": TOKEN_ERROR_MESSAGES["invalid_token"]}
            ) from e
        email = decrypt_email(payload.get("sub"))
        try:
            check_existing_user(email)
        except UserAlreadyExistsException as e:
            logger.error("User already exists: %s", e)
            return Response({"error": str(e)}, status=e.status_code)

        return Response({"email": email})

    @transaction.atomic
    def post(self, request, token):
        """Register new user with name and password as fields"""

        serializer = SignUpSerializer(data=request.data, context={"token": token})
        if serializer.is_valid():
            email = serializer.validated_data["email"]
            try:
                check_existing_user(email)
            except UserAlreadyExistsException as e:
                logger.error("User already exists: %s", e)
                return Response({"error": str(e)}, status=e.status_code)
            user = serializer.save()
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

            return Response(build_token_response(access_token, refresh_token, user))

        formatted_errors = format_serializer_errors(serializer.errors)
        logger.error("Signup errors: %s", formatted_errors)
        return Response(
            formatted_errors,
            status=status.HTTP_400_BAD_REQUEST,
        )


class GoogleSSOView(APIView):
    """view to handle google sso route"""

    @transaction.atomic
    def post(self, request):
        """validates google token and return jwt token"""

        mode = request.query_params.get("mode", "login")
        force = request.query_params.get("force", "false").lower() == "true"
        if mode not in ["signup", "login"]:
            raise ValidationError({"mode": "Invalid mode value"})

        token = request.data.get("token")
        if not token:
            raise ValidationError({"token": TOKEN_ERROR_MESSAGES["token_required"]})

        try:
            token_info = verify_google_token(token)
        except ValueError as e:
            logger.info("issue in google token %s", e)
            raise PermissionDenied(
                {"error": TOKEN_ERROR_MESSAGES["invalid_token"]}
            ) from e
        email = token_info["email"]
        name = token_info.get("name")

        try:
            user = User.objects.get(email=email, status=1)

            self.handle_existing_user(user, mode, force)
        except ObjectDoesNotExist as e:
            if mode == "login":
                if force:
                    user = User.objects.create(
                        email=email,
                        name=name,
                        signup_type=SignupType.GOOGLE_SSO,
                        login_at=timezone.now(),
                    )
                else:
                    raise NotFound(
                        {"error": USER_ERROR_MESSAGES["user_not_found"]}
                    ) from e
            if mode == "signup":
                user = User.objects.create(
                    email=email,
                    name=name,
                    signup_type=SignupType.GOOGLE_SSO,
                    login_at=timezone.now(),
                )

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

    def handle_existing_user(self, user, mode, force):
        """function to check existing user login info"""
        if not force:
            if user.password and user.signup_type != SignupType.EMAIL_AND_GOOGLE_SSO:
                raise UserAlreadyExistsException(
                    {"error": EMAIL_ERROR_MESSAGES["not_linked"]}
                )
            if mode == "signup" and user.signup_type in {
                SignupType.GOOGLE_SSO,
                SignupType.EMAIL_AND_GOOGLE_SSO,
            }:
                raise UserAlreadyExistsException(
                    {"error": USER_ERROR_MESSAGES["account_exist"]}
                )
        if user.password and user.signup_type != SignupType.EMAIL_AND_GOOGLE_SSO:
            user.signup_type = SignupType.EMAIL_AND_GOOGLE_SSO
            user.save()
