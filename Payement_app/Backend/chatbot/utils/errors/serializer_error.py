"""
Utility functions for handling and formatting serializer validation errors.
Used to create a consistent error response structure across the API.
"""
import re

def clean_error_value(value):
    """Return the first value if list, else the value itself."""
    if isinstance(value, list):
        return str(value[0]) if value else ""
    return str(value)

def normalize_index_keys(flat_dict):
    """
    Converts keys like 'phones.0.phone' to 'phones[0].phone'
    """
    result = {}
    for key, value in flat_dict.items():
        normalized_key = re.sub(r"\.(\d+)\.", lambda m: f"[{m.group(1)}].", key)
        result[normalized_key] = value
    return result

def flatten_errors(errors, parent_key=""):
    """
    Recursively flattens nested serializer error dictionaries
    into a flat dictionary with proper index-style keys (e.g., phones[0].phone).
    """
    flat = {}

    if isinstance(errors, dict):
        for key, value in errors.items():
            full_key = f"{parent_key}.{key}" if parent_key else key
            flat.update(flatten_errors(value, full_key))

    elif isinstance(errors, list):
        for index, item in enumerate(errors):
            if isinstance(item, dict):
                flat.update(flatten_errors(item, f"{parent_key}[{index}]"))
            elif item:
                flat[parent_key] = clean_error_value(errors)
                break

    else:
        flat[parent_key] = str(errors)

    return normalize_index_keys(flat)

def format_serializer_errors(errors):
    """Main function to format serializer errors."""
    flat_errors = flatten_errors(errors)
    return {"error": flat_errors}
