"""Common utility functions for API operations."""
import json
from rest_framework.exceptions import ValidationError
from django.conf import settings

# server_file_path = "/opt/documentgenerator"
server_file_path = settings.BASE_DIR
def apply_sorting_to_queryset(
    queryset, request, model, allowed_sort_fields=None, sort_key_map=None
):
    """
    Apply sorting to a queryset based on sort_key and sort_order parameters.

    Args:
        queryset: Django queryset to sort
        request: Django request object
        model: Django model class for field validation
        allowed_sort_fields: Optional set of allowed field names for sorting

    Returns:
        Sorted queryset

    Raises:
        ValidationError: If sort_key or sort_order is invalid
    """
    errors = {}
    sort_key = request.query_params.get("sort_key")
    sort_order = request.query_params.get("sort_order")

    if sort_key_map and sort_key in sort_key_map:
        actual_sort_key = sort_key_map[sort_key]

    else:
        actual_sort_key = sort_key

    if actual_sort_key:
        if not hasattr(model, actual_sort_key) and (allowed_sort_fields and actual_sort_key not in allowed_sort_fields):
            errors["sort_key"] = "Invalid sort_key"

    if sort_order and sort_order not in ["asc", "desc"]:
        errors["sort_order"] = "Invalid sort_order. Must be 'asc' or 'desc'"

    if errors:
        raise ValidationError(errors)

    if actual_sort_key:
        sort_order = sort_order or "desc"
        sort_prefix = "-" if sort_order == "desc" else ""
        queryset = queryset.order_by(f"{sort_prefix}{actual_sort_key}")

    return queryset


def parse_value(value):
    """Parse value with JSON, fallback to original if invalid."""
    if not isinstance(value, str):
        return value
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return value


def filter_queryset_by_params(queryset, request, allowed_filters):
    """
    Filters a queryset based on allowed query parameters from the request.

    Args:
        queryset: The initial queryset to filter.
        request: The request object containing query_params.
        allowed_filters: Iterable of allowed filter keys.

    Returns:
        Filtered queryset after applying valid filters from request.
    """
    filter_params = {
        key: value
        for key in allowed_filters
        if (value := parse_value(request.query_params.get(key)))
        not in [None, "", "null", "None", "undefined"]
    }
    if filter_params:
        queryset = queryset.filter(**filter_params)
    return queryset
