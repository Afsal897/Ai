"""Handles all validations"""

import os
import re
from django.db.models import Q
from rest_framework.exceptions import ValidationError
from dotenv import load_dotenv
from chatbot.utils.messages.error_messages import (
    NAME_ERROR_MESSAGES,
    PASSWORD_ERROR_MESSAGES,
    EMAIL_ERROR_MESSAGES,
)
from chatbot.utils.exceptions import UserAlreadyExistsException
from .models import  User
from rest_framework.response import Response
from rest_framework import status
from chatbot.utils.messages.error_messages import PERMISSION_ERROR_MESSAGES


load_dotenv()


EMAIL_REGEX = os.getenv("EMAIL_REGEX")
PASSWORD_REGEX = os.getenv("PASSWORD_REGEX")


def validate_email_field(email):
    """Validates whether the provided email is in a proper format."""
    email = email.strip()
    if len(email) > 255:
        raise ValidationError(EMAIL_ERROR_MESSAGES["email_too_long"])
    return email

def validate_length(value, field_name, min_length, max_length, error_messages):
    if len(value) < min_length:
        raise ValidationError(error_messages[f"{field_name}_too_short"])
    if len(value) > max_length:
        raise ValidationError(error_messages[f"{field_name}_too_long"])

def validate_name_field(name, min_length=1):
    """Validates regular name (Latin/Unicode, no digits)."""
    if not name:
        return None
    name = name.strip()
    validate_length(name, "name", min_length, 100, NAME_ERROR_MESSAGES)
    return name


def validate_password_field(password):

    """Validates that password matches required regex."""
    if not re.match(PASSWORD_REGEX, password):
        raise ValidationError(PASSWORD_ERROR_MESSAGES["invalid_password"])
    return password


def check_existing_user(email):
    """Check if user already exists."""
    if User.objects.filter(email=email, status=1).exists():
        raise UserAlreadyExistsException()



def validate_and_filter_files(request, queryset, model):
    """
    Validates filters and sorts query parameters for file list API.
    Supports search on file name, size, status and timestamp fields.
    """
    errors = {}
    query_params = request.query_params

    #  Search logic
    search = query_params.get("search")
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(size__icontains=search)
            | Q(created_at__icontains=search)
            | Q(updated_at__icontains=search)
            | Q(type__icontains=search)
            | Q(domain__icontains=search)
            | Q(client_name__icontains=search)
            | Q(status__icontains=search)
            | Q(technologies__technology_name__icontains=search)

        ).distinct()


    # Sorting logic
    sort_key = query_params.get("sort_key")
    sort_order = query_params.get("sort_order")

    if sort_key and not hasattr(model, sort_key):
        errors["sort_key"] = "Invalid sort_key"

    if sort_order and sort_order not in ["asc", "desc"]:
        errors["sort_order"] = "Invalid sort_order"

    if errors:
        raise ValidationError(errors)

    if sort_key:
        sort_order = sort_order or "desc"
        sort_prefix = "-" if sort_order == "desc" else ""
        queryset = queryset.order_by(f"{sort_prefix}{sort_key}")

    return queryset


# Regex pattern: only letters A-Z, a-z
ONLY_LETTERS_REGEX = re.compile(r'^[A-Za-z\s]+$')


def validate_request_fields(data):
    """
    Validate domain, technology, client_name
    to only contain letters.
    """
    fields_to_check = ["domain", "client_name"]
    errors = {}

    for field in fields_to_check:
        value = data.get(field)
        if value:  # only validate if provided (None or empty is allowed)
            if not ONLY_LETTERS_REGEX.match(value.strip()):
                errors[field] = f"{field} must only contain letters (A-Z, a-z)."

    if errors:
        raise ValidationError(errors)

    return True

def check_admin(user):
    """
    Check if the user has admin privileges.
    Returns None if admin, else returns a Response with 403 error.
    """
    if user.role != 0:
        return Response(
            {"error": PERMISSION_ERROR_MESSAGES["Admin Only"]},
            status=status.HTTP_403_FORBIDDEN
        )
    return None