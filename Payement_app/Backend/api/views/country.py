"""Hanldes country data"""

from datetime import datetime, timedelta, timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from chatbot.utils.country_list import COUNTRIES


class CountryListView(APIView):
    """view to handle country list"""

    def get(self, _request):
        """Returns a list of countries with ISO codes and expiry in header"""

        expiry_time = datetime.now(timezone.utc) + timedelta(days=1)
        expiry_str = expiry_time.strftime("%a, %d %b %Y %H:%M:%S GMT")

        response = Response(COUNTRIES)
        response["Expiry"] = expiry_str
        return response
