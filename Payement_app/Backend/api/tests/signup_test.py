"""Test suite for signup with email verification and creates new user"""

import json
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
from smtplib import SMTPAuthenticationError, SMTPException
import jwt
from rest_framework.test import APITestCase, APIClient
from django.urls import reverse
from django.test import override_settings
from django.conf import settings
from api.models import User
from api.models.enums import SignupType
from chatbot.utils.token.jwt_token import generate_token
from chatbot.utils.encryption import encrypt_email, decrypt_email
from chatbot.utils.email_verification import send_email
from chatbot.utils.messages.error_messages import (
    COMMON_ERROR_MESSAGES,
    EMAIL_ERROR_MESSAGES,
    TOKEN_ERROR_MESSAGES,
    NAME_ERROR_MESSAGES,
    PASSWORD_ERROR_MESSAGES,
    USER_ERROR_MESSAGES,
)

ACCESS_EXPIRY_WEB = timedelta(minutes=int(settings.ACCESS_TOKEN_EXPIRY_WEB))
SIGNUP_EXPIRY = timedelta(minutes=int(settings.SIGNUP_TOKEN_EXPIRY))

TOKEN_RESPONSE_FORMAT = {"token": "valid token", "expiry": "expiry"}
TEST_EMAIL_PRIMARY = "testemail@gmail.com"
TEST_EMAIL_SECONDARY = "testemail2@gmail.com"
ADDITIONAL_TEST_MAIL1 = "testemail+2@gmail.com"
ADDITIONAL_TEST_MAIL2 = "testemail1@gmail.com"
ADDITIONAL_TEST_USER = "James"
TEST_PASSWORD_PRIMARY = "T35t!3hnsh#l2@0"
TEST_PASSWORD_SECONDARY = "ha7bska93#l2@0"
USER_PRIMARY = "John Doe"
USER_SECONDARY = "Joe Bloggs"


def generate_access_token(user):
    """generates access token"""
    return generate_token(user, purpose="access", expiry=ACCESS_EXPIRY_WEB)


def generate_signup_token(email):
    """generate signup token"""
    return generate_token(email, purpose="signup", expiry=SIGNUP_EXPIRY)


class SignupEmailTestCase(APITestCase):
    """Test case for verifying user email through verification mail"""

    def setUp(self):
        self.client = APIClient()
        self.signup_email_url = reverse("signup_email_view")

        self.emails = {
            "valid": {"email": TEST_EMAIL_PRIMARY},
            "invalid": {"email": "test"},
            "invalid_length": {"email": f"{'t' * 256}@gmail.com"},
            "registered": {"email": TEST_EMAIL_SECONDARY},
        }

        self.registered_email = {"email": TEST_EMAIL_SECONDARY}

        self.user = User.objects.create(
            email=TEST_EMAIL_SECONDARY, password=TEST_PASSWORD_PRIMARY, name=USER_PRIMARY
        )

    def test_email_verification_fields_required(self):
        """Test email required for verifcation"""

        response = self.client.post(self.signup_email_url)
        response.render()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["error"]["email"], COMMON_ERROR_MESSAGES["required"]
        )

    def test_validate_email(self):
        """Test validate email with invalid email and length"""

        response = self.client.post(self.signup_email_url, self.emails["invalid"])
        response.render()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["error"]["email"],
            EMAIL_ERROR_MESSAGES["invalid_email_address"],
        )

        # email length

        response = self.client.post(
            self.signup_email_url, self.emails["invalid_length"]
        )
        response.render()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["error"]["email"], EMAIL_ERROR_MESSAGES["email_too_long"]
        )

    def test_existing_user(self):
        """Test email with already existing user before sending mail"""

        response = self.client.post(self.signup_email_url, self.registered_email)
        response.render()
        self.assertEqual(response.status_code, 409)
        self.assertEqual(
            response.data["error"],
            EMAIL_ERROR_MESSAGES.get("email_already_registered")
        )

    @override_settings(X_APP_KEY=settings.X_APP_KEY)
    def test_send_email_verification_with_app_key(self):
        """Test successfully send mail for email verification"""

        headers = {"HTTP-X-APP-KEY": settings.X_APP_KEY}
        response = self.client.post(
            self.signup_email_url, {"email": "test3@gmail.com"}, **headers
        )
        response.render()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["message"], "Verification initiated")

    @override_settings(X_APP_KEY=settings.X_APP_KEY)
    def test_invalid_app_key(self):
        """Test invalid app key"""

        headers = {"HTTP_X_APP_KEY": "invalid app key"}

        response = self.client.post(
            self.signup_email_url, {"email": "test3@gmail.com"}, **headers
        )
        response_json = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response_json["error"]["app_key"], "Invalid app key")

    def test_invalid_signup_token(self):
        """Test invalid token for verification"""

        verify_url = reverse("signup_view", kwargs={"token": "test token"})
        response = self.client.get(verify_url)
        response.render()

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["error"], TOKEN_ERROR_MESSAGES["invalid_token"])

    def test_valid_token(self):
        """Test successfully verifies the token and return email of user"""
        token = generate_signup_token(ADDITIONAL_TEST_MAIL1)
        verify_url = reverse("signup_view", kwargs={"token": token})
        response = self.client.get(verify_url)
        response.render()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], ADDITIONAL_TEST_MAIL1)

    def test_expired_token(self):
        """Test token is expired"""

        payload = {
            "email": "email",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
            "token_type": "signup",
        }
        token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")
        verify_url = reverse("signup_view", kwargs={"token": token})
        response = self.client.get(verify_url)
        response.render()
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["error"], TOKEN_ERROR_MESSAGES["expired_token"])

    def test_signup_token_conflict(self):
        """Test for existing user during email verification"""
        token = generate_signup_token(self.user.email)

        verify_url = reverse("signup_view", kwargs={"token": token})
        response = self.client.get(verify_url)
        response.render()
        self.assertEqual(response.status_code, 409)
        self.assertEqual(
            response.data["error"],
            EMAIL_ERROR_MESSAGES.get("email_already_registered")
        )


class SignUpViewTestCase(APITestCase):
    """Test case for creating new user with signup fields"""

    def setUp(self):

        self.client = APIClient()

        self.signup_email_url = reverse("signup_email_view")
        self.valid_email = {"email": TEST_EMAIL_PRIMARY}

        self.user = User.objects.create(
            email=TEST_EMAIL_SECONDARY, password=TEST_PASSWORD_PRIMARY, name=USER_PRIMARY
        )

    def post_signup_data(self, name, password, token=None, headers=None):
        """Common function to post signup data and return the response"""

        data = {"password": password, "name": name}

        signup_url = reverse("signup_view", kwargs={"token": token})
        return self.client.post(
            signup_url,
            data,
            **{"HTTP_X_APP_KEY": headers["HTTP_X_APP_KEY"]} if headers else {},
        )

    def test_signup_fields_required(self):
        """Test fields required for signup"""

        response = self.post_signup_data(name="", password="")
        response.render()
        self.assertEqual(response.status_code, 400)

    def test_validate_name_field(self):
        """Test name field validation during user signup"""

        signup_token = generate_signup_token(self.user.email)

        # Test long name
        long_name = "a" * 101
        response = self.post_signup_data(long_name, TEST_PASSWORD_PRIMARY, signup_token)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["error"]["name"], NAME_ERROR_MESSAGES["name_too_long"]
        )

    def test_validate_password_field(self):
        """Test password validation"""
        signup_token = generate_signup_token(self.user.email)

        # Test invalid password
        invalid_password = "test"
        response = self.post_signup_data(USER_PRIMARY, invalid_password, signup_token)
        response.render()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["error"]["password"],
            PASSWORD_ERROR_MESSAGES["invalid_password"],
        )

        # Test long password
        long_password = "Test@1234" * 100
        response = self.post_signup_data(USER_PRIMARY, long_password, signup_token)
        response.render()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["error"]["password"],
            PASSWORD_ERROR_MESSAGES["invalid_password"],
        )

    def test_signup_user(self):
        """Test signup success and generate token"""

        token = generate_token(
            ADDITIONAL_TEST_MAIL1, purpose="signup", expiry=SIGNUP_EXPIRY
        )

        response_format = {
            "access_token": TOKEN_RESPONSE_FORMAT,
            "refresh_token": TOKEN_RESPONSE_FORMAT,
        }

        response = self.post_signup_data(USER_SECONDARY, TEST_PASSWORD_PRIMARY, token)
        response.render()
        self.assertEqual(response.status_code, 200)
        self.assertIn("access_token", response_format)
        self.assertIn("refresh_token", response_format)

    def test_expired_signup_token(self):
        """Test signup token expired"""

        payload = {
            "email": "email",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
            "token_type": "signup",
        }
        token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")

        response = self.post_signup_data(USER_SECONDARY, TEST_PASSWORD_PRIMARY, token)
        response.render()
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["error"], TOKEN_ERROR_MESSAGES["expired_token"])

    def test_invalid_signup_token(self):
        """Test invalid signup token"""

        response = self.post_signup_data(USER_SECONDARY, TEST_PASSWORD_PRIMARY, "invalid token")
        response.render()
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["error"], TOKEN_ERROR_MESSAGES["invalid_token"])

    @override_settings(X_APP_KEY=settings.X_APP_KEY)
    def test_signup_with_app_key(self):
        """Test signup with app key"""

        token = generate_token(
            ADDITIONAL_TEST_MAIL1, purpose="signup", expiry=SIGNUP_EXPIRY
        )

        response_format = {
            "access_token": TOKEN_RESPONSE_FORMAT,
            "refresh_token": TOKEN_RESPONSE_FORMAT,
        }

        headers = {"HTTP_X_APP_KEY": settings.X_APP_KEY}

        response = self.post_signup_data(USER_SECONDARY, TEST_PASSWORD_PRIMARY, token, headers)
        self.assertEqual(response.status_code, 200)
        self.assertIn("access_token", response_format)
        self.assertIn("refresh_token", response_format)

    def test_signup_invalid_signup_token(self):
        """Test invalid signup token is used for creating new user"""

        token = generate_access_token(self.user)

        response = self.post_signup_data(USER_SECONDARY, TEST_PASSWORD_PRIMARY, token)
        response.render()
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["error"], TOKEN_ERROR_MESSAGES["invalid_token"])

    def test_signup_existing_user(self):
        """Test existing user try to signup"""
        signup_token = generate_signup_token(self.user.email)

        response = self.post_signup_data(
            USER_SECONDARY,
            TEST_PASSWORD_PRIMARY,
            signup_token
        )
        response.render()
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["error"], "Email address already registered")

    def test_encrypt_email_with_none(self):
        """Test encrpyt email with None"""

        result = encrypt_email(None)
        self.assertIsNone(result, None)

    @patch("contacts.utils.encryption.get_cipher")
    def test_unicode_decode_error(self, mock_get_cipher):
        """Test decrypt email"""

        mock_cipher = MagicMock()
        # Return invalid UTF-8 bytes
        mock_cipher.decrypt.return_value = b"\xff\xfe\xfd"

        mock_get_cipher.return_value = mock_cipher

        result = decrypt_email("fake_encrypted_string")

        self.assertIsNone(result, None)

    @patch(
        "contacts.utils.email_verification.EmailMessage.send",
        side_effect=SMTPAuthenticationError(535, b"Auth failed"),
    )
    def test_email_send_smtp_auth_error(self, _):
        """Test SMTP auth error"""

        with self.assertRaises(SMTPAuthenticationError) as cm:
            send_email(
                "test@example.com",
                "Test subject",
                app_key=None,
                scenario="Test message",
            )

        self.assertIn("SMTP Authentication Error", str(cm.exception))

    @patch(
        "contacts.utils.email_verification.EmailMessage.send",
        side_effect=SMTPException("SMTP connection error"),
    )
    def test_email_send_smtp_exception(self, _):
        """Test SMTP exception"""
        with self.assertRaises(SMTPException) as cm:
            send_email(
                "test@example.com",
                "Test subject",
                app_key=None,
                scenario="Test message",
            )

        self.assertIn("SMTP Error", str(cm.exception))


class GoogleSSOViewTestCase(APITestCase):
    """Test case to verfiy google sso"""

    def setUp(self):
        self.client = APIClient()
        self.url = reverse("google_sso")
        self.valid_token = "mock_valid_google_token"
        self.google_response = {
            "email": "testuser@example.com",
            "name": ADDITIONAL_TEST_USER,
        }

        self.user = User.objects.create(
            id=1,
            email=TEST_EMAIL_SECONDARY,
            password=TEST_PASSWORD_PRIMARY,
            name=USER_PRIMARY,
            signup_type=SignupType.EMAIL_ONLY,
            status=1,
        )
        self.user_2 = User.objects.create(
            id=2,
            email=TEST_EMAIL_PRIMARY,
            name=USER_PRIMARY,
            signup_type=SignupType.GOOGLE_SSO,
            status=1,
        )

    def perform_google_sso(self, mock_verify, email, mode="login", force="false"):
        """test google sso"""
        mock_verify.return_value = {
            "email": email,
            "name": ADDITIONAL_TEST_USER,
        }
        return self.client.post(
            f"{self.url}?mode={mode}&force={force}",
            {"token": self.valid_token},
            format="json",
        )

    def test_token_required(self):
        """Test token required"""

        response = self.client.post(self.url)
        response.render()
        self.assertEqual(response.status_code, 400)
        self.assertIn(
            response.data["error"]["token"], TOKEN_ERROR_MESSAGES["token_required"]
        )

    @patch("contacts.utils.token.google_token.id_token.verify_oauth2_token")
    def test_sso_with_valid_google_token(self, mock_verify_oauth2_token):
        """Test sso with valid token"""
        mock_verify_oauth2_token.return_value = self.google_response
        response = self.perform_google_sso(
            mock_verify_oauth2_token,
            email=ADDITIONAL_TEST_MAIL2,
            mode="login",
            force="true",
        )
        response.render()

        self.assertEqual(response.status_code, 200)
        self.assertIn("access_token", response.data)
        self.assertIn("refresh_token", response.data)

    @patch("contacts.utils.token.google_token.id_token.verify_oauth2_token")
    def test_sso_with_google_token_account_not_exist(self, mock_verify_oauth2_token):
        """Test sso with account not exist"""

        # mode=login force=true user exists

        mock_verify_oauth2_token.return_value = self.google_response
        response = self.perform_google_sso(
            mock_verify_oauth2_token,
            email=ADDITIONAL_TEST_MAIL2,
            mode="login",
            force="false",
        )
        response.render()

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["error"], USER_ERROR_MESSAGES["user_not_found"])

        # mode=signup force=false new user

        mock_verify_oauth2_token.return_value = self.google_response
        response = self.perform_google_sso(
            mock_verify_oauth2_token,
            email=ADDITIONAL_TEST_MAIL2,
            mode="signup",
            force="false",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("access_token", response.data)
        self.assertIn("refresh_token", response.data)

    @patch("contacts.utils.token.google_token.id_token.verify_oauth2_token")
    def test_sso_with_google_token_account_exist(self, mock_verify_oauth2_token):
        """Test sso with account exist"""

        # mode=login force=false user exists
        google_response = {
            "email": TEST_EMAIL_SECONDARY,
            "name": ADDITIONAL_TEST_USER,
        }
        mock_verify_oauth2_token.return_value = google_response
        response = self.perform_google_sso(
            mock_verify_oauth2_token,
            email=TEST_EMAIL_SECONDARY,
            mode="login",
            force="false",
        )
        response.render()

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["error"], EMAIL_ERROR_MESSAGES["not_linked"])

        mock_verify_oauth2_token.return_value = google_response
        response = self.perform_google_sso(
            mock_verify_oauth2_token,
            email=TEST_EMAIL_SECONDARY,
            mode="signup",
            force="true",
        )
        response.render()
        self.assertEqual(response.status_code, 200)
        self.assertIn("access_token", response.data)
        self.assertIn("refresh_token", response.data)

        google_response_2 = {
            "email": TEST_EMAIL_PRIMARY,
            "name": ADDITIONAL_TEST_USER,
        }
        mock_verify_oauth2_token.return_value = google_response_2
        response = self.perform_google_sso(
            mock_verify_oauth2_token,
            email=TEST_EMAIL_PRIMARY,
            mode="signup",
            force="false",
        )
        response.render()
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["error"], USER_ERROR_MESSAGES["account_exist"])

    @patch("contacts.utils.token.google_token.id_token.verify_oauth2_token")
    def test_invalid_google_token(self, mock_verify):
        """Test invalid token"""
        mock_verify.side_effect = ValueError("Invalid token")

        response = self.client.post(self.url, {"token": "invalid-token"}, format="json")
        response.render()

        self.assertEqual(response.status_code, 403)
        self.assertIn(response.data["error"], TOKEN_ERROR_MESSAGES["invalid_token"])
