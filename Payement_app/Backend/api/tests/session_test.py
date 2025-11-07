"""Test suite for Session and Message related APIs."""

import os
from django.urls import reverse
from django.conf import settings
from django.contrib.auth.hashers import make_password
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from api.models import User, Session, Message
from chatbot.utils.token.jwt_token import generate_token
from datetime import timedelta

ACCESS_TOKEN_EXPIRY_WEB = timedelta(minutes=int(settings.ACCESS_TOKEN_EXPIRY_WEB))


def generate_access_token(user):
    """Helper: generate JWT access token"""
    return generate_token(user, purpose="access", expiry=ACCESS_TOKEN_EXPIRY_WEB)


class SessionApiTests(APITestCase):
    """Test cases for session, message, and file download APIs"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create(
            email="test@example.com",
            password=make_password("Password@123"),
            name="Test User"
        )
        self.access_token = generate_access_token(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

        self.session_url = reverse("session_view")  # /api/sessions/
        self.session = Session.objects.create(name="My Session", user=self.user)
        self.detail_url = reverse("session_detail_view", args=[self.session.id])  # /api/sessions/<id>/

    # ------------------ SESSION TESTS ------------------

    def test_create_session_success(self):
        """ Should create a new session"""
        payload = {"name": "New Test Session"}
        response = self.client.post(self.session_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "New Test Session")

    def test_get_sessions_list(self):
        """ Should return paginated list of sessions"""
        response = self.client.get(self.session_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertGreaterEqual(len(response.data["results"]), 1)

    def test_get_session_detail(self):
        """ Should return details of a specific session"""
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.session.id)
        self.assertEqual(response.data["name"], "My Session")

    def test_update_name(self):
        """ Should update session name successfully"""
        payload = {"name": "Updated Session"}
        response = self.client.put(self.detail_url, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Updated Session")

    def test_delete_session(self):
        """ Should delete the session successfully"""
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Session deleted successfully")

    def test_get_invalid_session(self):
        """ Should return 404 for non-existent session"""
        url = reverse("session_detail_view", args=[9999])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("error", response.data)

    # ------------------ MESSAGE TESTS ------------------

    def test_get_messages_list(self):
        """ Should return paginated list of messages for a session"""
        # create sample messages
        Message.objects.create(user=self.user, session=self.session, message="Hi!", direction=1)
        url = reverse("message_list_view", args=[self.session.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertGreaterEqual(len(response.data["results"]), 1)

    # ------------------ FILE DOWNLOAD TESTS ------------------

    def test_download_generated_file_success(self):
        """ Should download the generated file if exists"""
        # create dummy file
        filepath = os.path.join(settings.BASE_DIR, "test_download.txt")
        with open(filepath, "w") as f:
            f.write("test content")

        message = Message.objects.create(
            user=self.user,
            session=self.session,
            message="Your file is ready",
            filepath=f"media/{os.path.basename(filepath)}",
            file_name="test_download.txt",
            has_file=0
        )

        url = reverse("generated_file_download", args=[message.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Disposition"], 'attachment; file_name="test_download.txt"')

        # Cleanup
        os.remove(filepath)

    def test_download_file_not_found(self):
        """ Should return 404 if file path does not exist"""
        message = Message.objects.create(
            user=self.user,
            session=self.session,
            message="Missing file",
            filepath="media/non_existent_file.txt",
            file_name="non_existent_file.txt",
            has_file=1
        )
        url = reverse("generated_file_download", args=[message.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("file", response.data)

    def test_download_file_invalid_message_id(self):
        """Should return 404 if message does not exist"""
        url = reverse("generated_file_download", args=[9999])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("id", response.data)
