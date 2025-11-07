"""Custom Pagination"""

import os
from math import ceil
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from dotenv import load_dotenv

load_dotenv()


class CustomPagination(PageNumberPagination):
    """Custom Pagination class"""

    page_size_query_param = "limit"
    page_size = int(os.getenv("PAGE_SIZE", "10"))
    max_page_size = int(os.getenv("MAXIMUM_PAGE_SIZE", "100"))

    def paginate_queryset(self, queryset, request, view=None):
        self.request = request
        self.total_items = queryset.count()  # total items before pagination
        self.page_count = ceil(self.total_items / self.get_page_size(request))

        try:
            return super().paginate_queryset(queryset, request, view)
        except NotFound:
            self.page = None
            return []
        
    def get_paginated_response(self, data):
        if self.page is None:
            return Response(
                {
                    "pager": {
                        "page": int(self.request.query_params.get("page", 1)),
                        "limit": self.get_page_size(self.request),
                        "page_count": self.page_count,
                        "item_count": 0,
                        "sort_key": self.request.query_params.get("sort_key"),
                        "sort_order": self.request.query_params.get("sort_order"),
                    },
                    "items": [],
                }
            )

        return Response(
            {
                "pager": {
                    "page": self.page.number,
                    "limit": self.page.paginator.per_page,
                    "page_count": self.page.paginator.num_pages,
                    "item_count": self.page.paginator.count,
                    "sort_key": self.request.query_params.get("sort_key"),
                    "sort_order": self.request.query_params.get("sort_order"),
                },
                "items": data,
            }
        )
