"""List all error messages for validation and exceptions"""

COMMON_ERROR_MESSAGES = {
    "required": "This field is required",
    "blank": "This field cannot be empty",
}

TOKEN_ERROR_MESSAGES = {
    "token_required": "Token is required",
    "invalid_token": "Invalid token",
    "expired_token": "Token expired",
    "refresh_token_required": "Refresh token required",
    "invalid_refresh_token": "Invalid refresh token",
    "invalid_key": "Invalid secret key",
    "reset_token_already_used": "Token already used",
    "refresh_token_already_used": "Refresh Token is no longer valid after token reset",
    "invalid_app_key": "Invalid app key",
}

NAME_ERROR_MESSAGES = {
    "invalid_name": "Invalid name",
    "name_too_long": "Name too long",
    "name_too_short": "Name too short",
    "contains_digit": "Name should not contain digits.",
    "contains_whitespace": "Name should not contain whitespace.",
}


NAME_KANA_ERROR_MESSAGES = {
    "kana_too_short": "name_kana too short.",
    "kana_too_long": "name_kana too long.",
    "invalid_kana": "Invalid name kana",
    "invalid_first_kana": "Invalid kana first name",
    "invalid_last_kana": "Invalid kana last name",
    "contains_whitespace": "Name Kana should not contain whitespace.",
}

NAME_KANJI_ERROR_MESSAGES = {
    "kanji_too_short": "name_kanji too short.",
    "kanji_too_long": "name_kanji too long.",
    "invalid_kanji": "Invalid name kanji",
    "invalid_first_kanji": "Invalid kanji first name",
    "invalid_last_kanji": "Invalid kanji last name",
    "contains_whitespace": "Name Kanji should not contain whitespace.",
}

PASSWORD_ERROR_MESSAGES = {
    "invalid_password": "Invalid password",
    "password_too_long": "Password too long",
    "password_too_short": "Password too short",
    "same_password": "New password cannot be the same as the current password",
    "incorrect_password": "Incorrect password",
    "password_reset_fail": "Password reset failed with errors"
}


EMAIL_ERROR_MESSAGES = {
    "invalid_email_address": "Invalid email address",
    "email_too_long": "Email too long",
    "email_too_short": "Email too short",
    "invalid_format": "Emails should be a list of email objects",
    "duplicate_email": "Email address is duplicate",
    "primary_count_exceed": "Only one email can be marked as primary",
    "already_exist": "This email already exists.",
    "not_found": "Email not found",
    "not_linked": "Email not linked",
    "email_already_registered": "Email address already registered",
    "max_count_exceed": "You can add a maximum of 10 email addresses.",
}





USER_ERROR_MESSAGES = {
    "user_not_found": "User not found",
    "account_exist": "User already exists",
    "invalid_credentials": "Invalid email address or password",
    "account_inactive": "Account is inactive. Please contact administrator.",
    "invalid_user_id": "Invalid id for user",
}


IMAGE_ERROR_MESSAGES = {
    "image_format": "Invalid image base64 format",
    "image_size": "Image size should be less than 1 mb",
    "invalid_image": "Upload a valid image file",
}

PROFILE_ERROR_MESSAGES = {"dob": "DOB cannot be a future date"}

PERMISSION_ERROR_MESSAGES = {
    "Admin Only": "Access denied. Admin privileges required.",
}

SESSION_ERROR_MESSAGES = {
    "invalid_page": "Invalid page number",
    "not_found": "Session not found",
}

FILE_ERROR_MESSAGES = {
    "no_file_attached": "No file was attached.",
    "save_failed": "Faild to save file",
    "not_found": "File not found.",
    "delete_processing": "Cannot delete a file while it is processing.",
    "invalid_page": "Invalid page number.",
    "small_file": "File is too small possibily null",
    "Invalid headers":"Invalid CSV headers",
    "Invalid type":"Invalid File Type",
    "Invalid regex":"Invalid Field value",
}

