"""Test suite for user profile GET view"""

from rest_framework.test import APITestCase, APIClient
from django.contrib.auth.hashers import make_password
from django.urls import reverse
from api.models.user_model import User
from chatbot.utils.token.jwt_token import generate_token
from datetime import timedelta
from django.conf import settings

ACCESS_TOKEN_EXPIRY_WEB = timedelta(minutes=int(settings.ACCESS_TOKEN_EXPIRY_WEB))


def generate_access_token(user):
    """Generates access token for authentication"""
    return generate_token(user, purpose="access", expiry=ACCESS_TOKEN_EXPIRY_WEB)


class UserProfileDetailViewTestCase(APITestCase):
    """Test cases for UserProfileDetailView GET request"""

    def setUp(self):
        """Create a test user and API client"""
        self.client = APIClient()
        self.user = User.objects.create(
            email="testuser@example.com",
            password=make_password("Password@123"),
            name="Test User"
        )
        self.url = reverse("user_profile_detail_view")
        self.access_token = generate_access_token(self.user)

    def test_get_user_profile_authenticated(self):
        """Authenticated user should get profile data"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], self.user.email)
        self.assertEqual(response.data["name"], self.user.name)

    def test_get_user_profile_unauthenticated(self):
        """Unauthenticated user should be denied access"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 401)  # Unauthorized

    def test_get_user_profile_with_invalid_token(self):
        """Request with invalid token should be denied"""
        self.client.credentials(HTTP_AUTHORIZATION="Bearer invalidtoken")
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 401)  # Unauthorized
