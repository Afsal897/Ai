"""Test suite for verifying the login functionality and user authentication process"""

import json
from datetime import timedelta
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth.hashers import make_password
from django.conf import settings
from django.test import override_settings
from django.utils import timezone
from django.urls import reverse
from api.models.user_model import User
from chatbot.utils.token.jwt_token import generate_token
from chatbot.utils.messages.error_messages import (
    COMMON_ERROR_MESSAGES,
    USER_ERROR_MESSAGES,
    TOKEN_ERROR_MESSAGES,
    EMAIL_ERROR_MESSAGES,
    PASSWORD_ERROR_MESSAGES,
)

ACCESS_TOKEN_EXPIRY_WEB = timedelta(minutes=int(settings.ACCESS_TOKEN_EXPIRY_WEB))
REFRESH_TOKEN_EXPIRY_WEB = timedelta(minutes=int(settings.REFRESH_TOKEN_EXPIRY_WEB))
SIGNUP_TOKEN_EXPIRY = timedelta(minutes=int(settings.SIGNUP_TOKEN_EXPIRY))

PASSWORD_RESET_TOKEN_EXPIRY = timedelta(
    minutes=int(settings.PASSWORD_RESET_TOKEN_EXPIRY)
)
TOKEN_RESPONSE_FORMAT = {"token": "valid token", "expiry": "expiry"}
TEST_EMAIL_PRIMARY = "testemail@gmail.com"
TEST_PASSWORD_PRIMARY = "T35t!3hnsh#l2@0"
TEST_PASSWORD_SECONDARY = "ha7bska93#l2@0"

def generate_access_token(user):
    """generates access token"""
    return generate_token(
        user, purpose="access", expiry=ACCESS_TOKEN_EXPIRY_WEB
    )


def generate_refresh_token(user):
    """generates access token"""
    return generate_token(
        user, purpose="refresh", expiry=ACCESS_TOKEN_EXPIRY_WEB
    )


def generate_signup_token(email):
    """generate signup token"""
    return generate_token(email, purpose="signup", expiry=SIGNUP_TOKEN_EXPIRY)


def generate_password_token(email):
    """generate signup token"""
    return generate_token(
        email, purpose="password", expiry=PASSWORD_RESET_TOKEN_EXPIRY
    )


class LoginViewTestCase(APITestCase):
    """Test case for verifying the login view and authentication logic"""

    TEST_PASSWORD_PRIMARY = "qAm285n@#%@!swj"

    def setUp(self):

        self.client = APIClient()
        self.login_url = reverse("login_view")
        self.user = User.objects.create(
            email=TEST_EMAIL_PRIMARY,
            password=make_password(self.TEST_PASSWORD_PRIMARY),
            name="test name",
        )

        self.expired_expiry = -timedelta(
            minutes=int(settings.REFRESH_TOKEN_EXPIRY_WEB)
        )
        self.expired_refresh_token = generate_token(
            self.user, purpose="refresh", expiry=self.expired_expiry
        )

    def test_fields_required(self):
        """Test login with fields required"""

        error_format = {
            "email": COMMON_ERROR_MESSAGES["required"],
            "password": COMMON_ERROR_MESSAGES["required"],
        }
        response = self.client.post(self.login_url)
        response.render()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], error_format)

    def test_login_valid_credentials(self):
        """Test login with valid credentials and generate token"""

        response_format = {
            "access_token":TOKEN_RESPONSE_FORMAT,
            "refresh_token": TOKEN_RESPONSE_FORMAT,
        }
        data = {
            "email": TEST_EMAIL_PRIMARY,
            "password": self.TEST_PASSWORD_PRIMARY
        }
        response = self.client.post(self.login_url, data)
        response.render()
        self.assertEqual(response.status_code, 200)
        self.assertIn("access_token", response_format)
        self.assertIn("refresh_token", response_format)

    def test_invalid_credentials(self):
        """Test login with invalid credentials"""

        data = {"email": TEST_EMAIL_PRIMARY, "password": "Password@12"}
        response = self.client.post(self.login_url, data)
        response.render()
        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.data["error"], USER_ERROR_MESSAGES["invalid_credentials"]
        )

        data = {"email": "testemail+2@gmail.com", "password": "Password@12"}
        response = self.client.post(self.login_url, data)
        response.render()
        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.data["error"], USER_ERROR_MESSAGES["invalid_credentials"]
        )

    def test_invalid_app_key_for_login(self):
        """Test login with invalid credentials"""

        data = {
            "email": TEST_EMAIL_PRIMARY,
            "password": self.TEST_PASSWORD_PRIMARY
        }
        response = self.client.post(
            self.login_url,
            data,
            **{"HTTP_X_APP_KEY": "invalid_app_key"},
        )
        response_json = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response_json["error"]["app_key"],
            TOKEN_ERROR_MESSAGES.get("invalid_app_key")
        )

    @override_settings(X_APP_KEY=settings.X_APP_KEY)
    def test_valid_app_key_for_login(self):
        """Test encrypted email is send for the user"""
        data = {
            "email": TEST_EMAIL_PRIMARY,
            "password": self.TEST_PASSWORD_PRIMARY
        }
        response = self.client.post(
            self.login_url,
            data,
            **{"HTTP_X_APP_KEY": settings.X_APP_KEY},
        )
        response.render()
        self.assertEqual(response.status_code, 200)

    def test_refresh_token_required(self):
        """Test refresh token required to generate new token"""

        response = self.client.put(self.login_url)
        response.render()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["error"]["token"],
            TOKEN_ERROR_MESSAGES["refresh_token_required"],
        )

    def test_refresh_token(self):
        """Test refresh token and generates new token"""

        refresh_token = generate_refresh_token(self.user)

        self.user.password_at = timezone.now() - timedelta(seconds=10)
        self.user.save()

        response_format = {
            "access_token": TOKEN_RESPONSE_FORMAT,
            "refresh_token": TOKEN_RESPONSE_FORMAT,
        }
        response = self.client.put(
            self.login_url, {"refresh_token": refresh_token}
        )
        response.render()
        self.assertEqual(response.status_code, 200)
        self.assertIn("access_token", response_format)
        self.assertIn("refresh_token", response_format)

    @override_settings(X_APP_KEY=settings.X_APP_KEY)
    def test_refresh_token_with_app_key(self):
        """Test refresh token with app key and generates new token"""
        refresh_token = generate_refresh_token(self.user)

        self.user.password_at = timezone.now() - timedelta(seconds=10)
        self.user.save()

        response_format = {
            "access_token": TOKEN_RESPONSE_FORMAT,
            "refresh_token": TOKEN_RESPONSE_FORMAT,
        }
        response = self.client.put(
            self.login_url,
            {"refresh_token": refresh_token},
            **{"HTTP_X_APP_KEY": settings.X_APP_KEY},
        )
        response.render()
        self.assertEqual(response.status_code, 200)
        self.assertIn("access_token", response_format)
        self.assertIn("refresh_token", response_format)

    def test_invalid_refresh_token(self):
        """Test invalid refresh token to generate new token"""

        invalid_token = generate_access_token(self.user)

        response = self.client.put(
            self.login_url,
            {"refresh_token": invalid_token},
        )
        response.render()
        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.data["error"],
            TOKEN_ERROR_MESSAGES["invalid_refresh_token"]
        )

    def test_invalid_token(self):
        """Test invalid refresh token to generate new token"""

        response = self.client.put(
            self.login_url,
            {"refresh_token": TOKEN_ERROR_MESSAGES.get("invalid_token")},
        )
        response.render()
        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.data["error"],
            TOKEN_ERROR_MESSAGES["invalid_refresh_token"]
        )

    def test_expired_refresh_token(self):
        """Test expired refresh token"""

        response = self.client.put(
            self.login_url,
            {"refresh_token": self.expired_refresh_token},
        )
        response.render()
        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.data["error"],
            TOKEN_ERROR_MESSAGES["expired_token"]
        )

    def test_invalid_app_key_for_refresh_token(self):
        """Test invalid refresh token to generate new token"""
        refresh_token = generate_refresh_token(self.user)
        response = self.client.put(
            self.login_url,
            {"refresh_token": refresh_token},
            **{"HTTP_X_APP_KEY": TOKEN_ERROR_MESSAGES.get("invalid_app_key")},
        )
        response_json = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response_json["error"]["app_key"],
            TOKEN_ERROR_MESSAGES.get("invalid_app_key")
        )


class PasswordResetViewTestCase(APITestCase):
    """Test case for password reset and email verification"""
    TEST_PASSWORD_PRIMARY = "fGHyn3b@6321!@$"
    TEST_PASSWORD_SECONDARY = "FHN3ww57ha@6321!@$"

    def setUp(self):

        self.client = APIClient()
        self.password_reset_url = reverse("password_reset_view")

        self.user = User.objects.create(
            id=1,
            email=TEST_EMAIL_PRIMARY,
            password=make_password(self.TEST_PASSWORD_PRIMARY),
            name="test name",
        )

        self.expired_token = -timedelta(
            minutes=int(settings.PASSWORD_RESET_TOKEN_EXPIRY)
        )
        self.expired_password_token = generate_token(
            self.user, purpose="refresh", expiry=self.expired_token
        )

        self.password_reset_token = generate_password_token(self.user.email)
        self.access_token = generate_access_token(self.user)

    def test_password_reset_allows_only_one_field_at_a_time(self):
        """Test only one field is used at a time"""
        data = {
            "email": TEST_EMAIL_PRIMARY,
            "password": self.TEST_PASSWORD_PRIMARY
        }
        response = self.client.post(self.password_reset_url, data)
        response.render()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["error"]["field"],
            "Cannot provide both email and password",
        )

    def test_email_required(self):
        """Test email is required to send verification mail"""
        response = self.client.post(self.password_reset_url)
        response.render()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["error"]["email"], COMMON_ERROR_MESSAGES["required"]
        )

    def test_with_invalid_email(self):
        """Test with invalid email"""

        response = self.client.post(
            self.password_reset_url, {"email": "invalid email"}
        )
        response.render()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["error"]["email"],
            EMAIL_ERROR_MESSAGES["invalid_email_address"],
        )

    def test_user_not_found(self):
        """Test email with user not found"""

        response = self.client.post(
            self.password_reset_url, {"email": "test@gmail.com"}
        )
        response.render()
        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.data["error"], EMAIL_ERROR_MESSAGES["not_found"]
        )

    def test_invalid_password(self):
        """Test invalid password"""
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}"
        )

        response = self.client.post(
            self.password_reset_url, {"password": "Pass"}
        )
        response.render()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["error"]["password"],
            PASSWORD_ERROR_MESSAGES["invalid_password"],
        )

    def test_password_not_matching_with_user(self):
        """Test with password not matching"""
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}"
        )

        response = self.client.post(
            self.password_reset_url, {"password": "Password@12345"}
        )
        response.render()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["error"]["password"],
            PASSWORD_ERROR_MESSAGES["incorrect_password"],
        )

    def test_generate_password_token_with_password(self):
        """Test generate password reset token for user"""
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}"
        )
        response = self.client.post(
            self.password_reset_url, {"password": self.TEST_PASSWORD_PRIMARY}
        )
        response.render()
        self.assertEqual(response.status_code, 200)
        self.assertIn("token", response.data)

    @override_settings(X_APP_KEY=settings.X_APP_KEY)
    def test_send_password_reset_email(self):
        """Test encrypted email is send for the user"""
        headers = {"HTTP_X_APP_KEY": settings.X_APP_KEY}

        response = self.client.post(
            self.password_reset_url, {"email": TEST_EMAIL_PRIMARY}, **headers
        )
        response.render()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["message"], "Password reset email sent")

    @override_settings(X_APP_KEY=settings.X_APP_KEY)
    def test_send_password_reset_email_invalid_app_key(self):
        """Test encrypted email is send for the user"""
        headers = {"HTTP_X_APP_KEY": "app key"}

        response = self.client.post(
            self.password_reset_url, {"email": TEST_EMAIL_PRIMARY}, **headers
        )
        response_json = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response_json["error"]["app_key"],
            TOKEN_ERROR_MESSAGES.get("invalid_app_key")
        )

    def test_password_reset_success(self):
        """Test email is decoded from token and update new password"""
        password_token = generate_password_token(self.user.email)
        verify_password_reset_url = reverse(
            "verify_password_reset_view", kwargs={"token": password_token}
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}"
        )
        response = self.client.post(
            verify_password_reset_url,
            {"password": self.TEST_PASSWORD_SECONDARY},
        )
        response.render()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["message"], "Password updated")

    def test_password_reset_with_invalid_password(self):
        """Test password reset with invalid password"""
        password_token = generate_password_token(self.user.email)
        verify_password_reset_url = reverse(
            "verify_password_reset_view", kwargs={"token": password_token}
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}"
        )
        response = self.client.post(
            verify_password_reset_url,
            {"password": "Pass"},
        )
        response.render()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["error"]["password"],
            PASSWORD_ERROR_MESSAGES["invalid_password"],
        )

    def test_password_reset_token_already_used(self):
        """Test token cannot be reused after password reset"""

        password_token = generate_password_token(self.user.email)

        verify_password_reset_url = reverse(
            "verify_password_reset_view", kwargs={"token": password_token}
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}"
        )

        first_response = self.client.post(
            verify_password_reset_url,
            {"password": self.TEST_PASSWORD_SECONDARY}
        )
        first_response.render()
        self.assertEqual(first_response.status_code, 200)

        self.user.password_at = timezone.now()
        self.user.save()

        second_response = self.client.post(
            verify_password_reset_url, {"password": "NewPassword@5678"}
        )
        second_response.render()

        self.assertEqual(second_response.status_code, 400)
        self.assertEqual(
            second_response.data["error"]["token"],
            TOKEN_ERROR_MESSAGES["reset_token_already_used"],
        )

    def test_inavlid_password_reset_token(self):
        """Test invalid token is used for password reset"""
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}"
        )
        password_token = generate_signup_token(self.user.email)
        verify_password_reset_url = reverse(
            "verify_password_reset_view", kwargs={"token": password_token}
        )
        response = self.client.post(
            verify_password_reset_url,
            {"password": self.TEST_PASSWORD_SECONDARY},
        )
        response.render()

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.data["error"],
            TOKEN_ERROR_MESSAGES["invalid_token"]
        )

    def test_password_reset_user_not_found(self):
        """Test invalid user is added in token"""
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}"
        )

        token = generate_password_token("testemail2@gmail.com")
        verify_password_reset_url = reverse(
            "verify_password_reset_view", kwargs={"token": token}
        )
        response = self.client.post(
            verify_password_reset_url,
            {"password": self.TEST_PASSWORD_SECONDARY},
        )
        response.render()
        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.data["error"],
            EMAIL_ERROR_MESSAGES["not_found"]
        )

    def test_invalid_token(self):
        """Test invalid refresh token to generate new token"""
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}"
        )

        verify_password_reset_url = reverse(
            "verify_password_reset_view", kwargs={"token": "invalid token"}
        )
        response = self.client.post(
            verify_password_reset_url,
            {"password": self.TEST_PASSWORD_SECONDARY},
        )
        response.render()
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.data["error"], TOKEN_ERROR_MESSAGES["invalid_token"]
        )

    def test_expired_password_reset_token(self):
        """Test expired password reset token"""
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}"
        )

        verify_password_reset_url = reverse(
            "verify_password_reset_view",
            kwargs={"token": self.expired_password_token}
        )
        response = self.client.post(
            verify_password_reset_url,
            {"password": self.TEST_PASSWORD_SECONDARY},
        )
        response.render()
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.data["error"], TOKEN_ERROR_MESSAGES["expired_token"]
        )

    def test_password_reset_with_current_password(self):
        """Test passord reset with current password"""
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}"
        )
        verify_password_reset_url = reverse(
            "verify_password_reset_view",
            kwargs={"token": self.password_reset_token}
        )
        response = self.client.post(
            verify_password_reset_url, {"password": self.TEST_PASSWORD_PRIMARY}
        )
        response.render()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["error"]["password"],
            PASSWORD_ERROR_MESSAGES["same_password"],
        )

    def test_verify_password_reset_token(self):
        """Test verify password reset token"""
        password_token = generate_password_token(self.user.email)
        verify_password_reset_url = reverse(
            "verify_password_reset_view", kwargs={"token": password_token}
        )
        response = self.client.get(verify_password_reset_url)
        response.render()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], self.user.email)

    def test_verify_expired_password_reset_token(self):
        """Test verify password reset token"""
        verify_password_reset_url = reverse(
            "verify_password_reset_view",
            kwargs={"token": self.expired_password_token}
        )
        response = self.client.get(verify_password_reset_url)
        response.render()
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.data["error"],
            TOKEN_ERROR_MESSAGES["expired_token"])

    def test_verify_password_reset_token_user_not_found(self):
        """Test verify password reset token user not found"""
        password_token = generate_password_token("testemail2@gmail.com")
        verify_password_reset_url = reverse(
            "verify_password_reset_view", kwargs={"token": password_token}
        )
        response = self.client.get(verify_password_reset_url)
        response.render()
        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.data["error"], EMAIL_ERROR_MESSAGES["not_found"]
        )

    def test_verify_password_reset_invalid_token(self):
        """Test verify password reset invalid token"""

        verify_password_reset_url = reverse(
            "verify_password_reset_view", kwargs={"token": "invalid token"}
        )
        response = self.client.get(verify_password_reset_url)
        response.render()
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.data["error"], TOKEN_ERROR_MESSAGES["invalid_token"]
        )
