from django.conf import settings
import logging

logger = logging.getLogger("api_logger")

def generate_download_url(file_path: str, download_filename: str) -> str | None:
    """Generate a presigned URL for S3 or return None if failed."""
    if not getattr(settings, "USE_S3", False):
        return None
    try:
        return settings.S3_CLIENT.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": settings.S3_BUCKET_NAME,
                "Key": file_path,
                "ResponseContentDisposition": f'attachment; filename="{download_filename}"'
            },
            ExpiresIn=3600  # URL valid for 1 hour
        )
    except Exception as e:
        logger.error(f"Failed to generate presigned URL for {file_path}: {e}")
        return None
