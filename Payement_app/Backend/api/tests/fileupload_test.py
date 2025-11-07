import os
from datetime import timedelta
from django.conf import settings
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth.hashers import make_password
from rest_framework.test import APITestCase, APIClient
from chatbot.utils.messages.error_messages import FILE_ERROR_MESSAGES
from chatbot.utils.messages.success_messages import FILE_SUCCESS_MESSAGES
from api.models import User, FileImport
from chatbot.utils.token.jwt_token import generate_token


class FileViewTestCase(APITestCase):
    """Test case for uploading and listing files (FileView)"""

    def setUp(self):
        self.client = APIClient()
        self.url = reverse("file-list-upload")

        self.user = User.objects.create(
            email="fileuser@gmail.com",
            password=make_password(os.getenv("PASSWORD", "Password@123")),
            name="file tester",
        )

        access_expiry_web = timedelta(minutes=int(settings.ACCESS_TOKEN_EXPIRY_WEB))
        self.access_token = generate_token(
            self.user, purpose="access", expiry=access_expiry_web
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

    def test_upload_no_file_provided(self):
        """Should fail if no file is provided"""
        response = self.client.post(self.url, {}, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], FILE_ERROR_MESSAGES["no_file_attached"])

    def test_upload_invalid_type(self):
        """Should reject invalid file type"""
        file = SimpleUploadedFile("test.csv", b"dummy content", content_type="application/vnd.ms-powerpoint")
        response = self.client.post(
            self.url,
            {"file": file, "type": "invalidtype"},
            format="multipart"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid File Type", str(response.data["error"]["file"]))

    def test_upload_valid_file(self):
        """Should accept valid ppt with correct type"""
        file = SimpleUploadedFile("test.ppt", b"dummy content", content_type="application/vnd.ms-powerpoint")
        response = self.client.post(
            self.url,
            {
                "file": file,
                "type": "rpf",
                "domain": "Tech",
                "technology": "Django",
                "client_name": "Acme",
            },
            format="multipart"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["message"], FILE_SUCCESS_MESSAGES["file_uploaded"])

    def test_list_uploaded_files(self):
        """Should list uploaded files"""
        FileImport.objects.create(user=self.user, name="sample1.ppt", path="uploads/sample1.ppt")
        FileImport.objects.create(user=self.user, name="sample2.ppt", path="uploads/sample2.ppt")

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["items"]), 2)


class FileDetailViewTestCase(APITestCase):
    """Test cases for FileDetailView"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create(
            email="filedetailuser@gmail.com",
            password=make_password(os.getenv("PASSWORD", "Password@123")),
            name="file detail tester",
        )
        self.access_token = generate_token(
            self.user, purpose="access",
            expiry=timedelta(minutes=int(settings.ACCESS_TOKEN_EXPIRY_WEB))
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

        self.file = FileImport.objects.create(
            user=self.user,
            name="sample.ppt",
            path="test_media/sample.ppt",
        )
        self.detail_url = reverse("file-detail", kwargs={"file_id": self.file.id})

        # Ensure file exists on disk
        abs_path = os.path.join(settings.BASE_DIR, "test_media")
        os.makedirs(abs_path, exist_ok=True)
        with open(os.path.join(abs_path, "sample.ppt"), "w") as f:
            f.write("dummy content")

    def test_get_file_detail_success(self):
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], self.file.id)

    def test_get_file_detail_not_found(self):
        url = reverse("file-detail", kwargs={"file_id": 999})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["id"], FILE_ERROR_MESSAGES["not_found"])

    def test_delete_file_success(self):
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["message"], FILE_SUCCESS_MESSAGES["file_deleted"])
        self.assertFalse(FileImport.objects.filter(id=self.file.id).exists())

    def test_delete_file_not_found(self):
        url = reverse("file-detail", kwargs={"file_id": 999})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["id"], FILE_ERROR_MESSAGES["not_found"])


class FileContentViewTestCase(APITestCase):
    """Test case for FileContentView"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create(
            email="contentuser@example.com",
            password=make_password(os.getenv("PASSWORD", "Password@123")),
            name="content tester",
        )
        self.access_token = generate_token(
            self.user, purpose="access",
            expiry=timedelta(minutes=int(settings.ACCESS_TOKEN_EXPIRY_WEB))
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

        self.success_file = FileImport.objects.create(
            user=self.user,
            name="content_file.ppt",
            path="media/test_upload/content_file.ppt",
        )
        self.content_url = reverse("content-detail", kwargs={"file_id": int(self.success_file.id)})

        # Create dummy file on disk
        abs_path = os.path.join(settings.BASE_DIR, "test_upload")
        os.makedirs(abs_path, exist_ok=True)
        with open(os.path.join(abs_path, "content_file.ppt"), "w") as f:
            f.write("dummy content")


    def test_content_file_download_success(self):
        response = self.client.get(self.content_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Disposition"], 'attachment; filename="content_file.ppt"')

    def test_content_file_not_found(self):
        self.success_file.path = "test_media/missing_file.ppt"
        self.success_file.save()

        url = reverse("content-detail", kwargs={"file_id": self.success_file.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)
        self.assertIn("file", response.data)
