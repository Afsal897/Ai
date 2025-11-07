"""Helper functions to handle s3 operations"""
import logging
import boto3
from botocore.exceptions import BotoCoreError, NoCredentialsError
from django.conf import settings

logger = logging.getLogger("api_logger")


def get_s3_client():
    """Returns a boto3 S3 client configured from settings."""
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION_NAME,
    )

def upload_to_s3(file_bytes, filename, content_type):
    """
    Uploads a file to AWS S3 under contact/uploads/ and returns the S3 key and public URL.
    """
    try:
        s3_key = f"contact/uploads/{filename}"
        s3 = get_s3_client()

        s3.put_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=s3_key,
            Body=file_bytes,
            ContentType=content_type
        )

        public_url = f"{settings.IMAGE_HOST_URL}/{s3_key}"
        return s3_key, public_url

    except (BotoCoreError, NoCredentialsError) as e:
        logger.error("S3 Upload Error: %s", e)
        raise


def delete_from_s3(filename):
    """
    Deletes a file from AWS S3 under contact/uploads/.
    """
    s3 = get_s3_client()
    s3_key = f"contact/uploads/{filename}"
    s3.delete_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=s3_key)
