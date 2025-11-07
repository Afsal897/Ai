"""
Test cases for dashboard and user APIs
- AdminDashboardAPIView: returns data directly, error field for access denied
- UserViewSet: uses UserManagementSerializer with limited fields
"""

from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from api.models import User
from chatbot.utils.messages.error_messages import USER_ERROR_MESSAGES


class DashboardAndUserApiTests(APITestCase):
    """Test cases for admin dashboard and user management APIs."""

    def setUp(self):
        """Set up test users and API client."""
        self.admin_user = User.objects.create(
            email="admin@example.com",
            name="Admin User",
            role=0,  # Admin role
            status=1,
            password="adminpass"
        )
        self.normal_user = User.objects.create(
            email="user@example.com",
            name="Normal User",
            role=1,  # Regular user
            status=1,
            password="userpass"
        )
        self.client = APIClient()

    # ------------------- Admin Dashboard -------------------

    def test_admin_dashboard_success(self):
        """Admin should get dashboard stats."""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("admin-dashboard")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("user_count", response.data)
        self.assertIn("active_user_count", response.data)

    def test_admin_dashboard_access_denied_for_non_admin(self):
        """Non-admin users should be denied access to admin dashboard."""
        self.client.force_authenticate(user=self.normal_user)
        url = reverse("admin-dashboard")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("detail", response.data)
        self.assertEqual(
            str(response.data["detail"]),
            "You do not have permission to perform this action."
        )
    # ------------------- User ViewSet -------------------

    def test_user_list_admin(self):
        """Admin can list all users."""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("user-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("items", response.data)
        if response.data["items"]:
            user_data = response.data["items"][0]
            expected_fields = [
                "id", "name", "email", "role", "status", "signup_type", "updated_at"
            ]
            for field in expected_fields:
                self.assertIn(field, user_data)

    def test_user_retrieve_admin(self):
        """Admin can retrieve a specific user."""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("user-detail", args=[self.normal_user.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected_fields = [
            "id", "name", "email", "role", "status", "signup_type", "updated_at"
        ]
        for field in expected_fields:
            self.assertIn(field, response.data)

    def test_user_not_found(self):
        """Accessing a non-existent user should return 404 with custom error."""
        self.client.force_authenticate(user=self.admin_user)
        non_existent_id = 99999
        url = reverse("user-detail", args=[non_existent_id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("error", response.data)
        self.assertIn("id", response.data["error"])
        self.assertEqual(
            response.data["error"]["id"], USER_ERROR_MESSAGES["invalid_user_id"]
        )

    def test_user_create_admin(self):
        """Admin can create a new user with inactive status."""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("user-list")
        create_data = {
            "name": "New User",
            "email": "newuser@example.com",
            "role": 1,
            "status": 1,  # Should be overridden to 0 by view
            "signup_type": 1
        }
        response = self.client.post(url, create_data, format="json")
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK])

        # Check user is created with status=0
        from api.models import User
        created_user = User.objects.get(email="newuser@example.com")
        self.assertEqual(created_user.status, 0)

    def test_user_create_duplicate_email(self):
        """Creating a user with an existing email returns 409."""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("user-list")
        # Create first user
        User.objects.create(
            name="Existing", email="existing@example.com", role=1, status=1
        )
        duplicate_data = {
            "name": "Duplicate User",
            "email": "existing@example.com",
            "role": 1,
            "status": 1,
            "signup_type": 1
        }
        response = self.client.post(url, duplicate_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            response.data["error"], "Email address already registered"
        )

    def test_non_admin_access_denied(self):
        """Non-admin users cannot access user management APIs."""
        self.client.force_authenticate(user=self.normal_user)
        # List
        url = reverse("user-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        # Detail
        url = reverse("user-detail", args=[self.admin_user.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        # Create
        url = reverse("user-list")
        response = self.client.post(url, {"name": "Test", "email": "test@example.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_update_partial_update_admin(self):
        """Admin can update and partially update a user, returns message only."""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("user-detail", args=[self.normal_user.id])
        update_data = {"name": "Updated Name", "email": self.normal_user.email, "role": 1, "status": 1, "signup_type": 1}

        # Full update
        response = self.client.put(url, update_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        self.assertNotIn("email", response.data)

        # Partial update
        response = self.client.patch(url, {"name": "Partial Update"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        self.assertNotIn("email", response.data)
