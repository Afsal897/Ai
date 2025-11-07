"""Unliversal links view"""

import os
import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.renderers import JSONRenderer


class AssetLinksView(APIView):
    """univsersal link route for android"""

    renderer_classes = [JSONRenderer]

    def get(self, _request):
        """Return universal link data for android"""
        file_path = os.path.join("chatbot/utils/mobile_data", "assetlinks.json")

        # Read and load the JSON file
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        return Response(data)


class AppleAppSiteAssociationView(APIView):
    """Universal link route for iOS"""

    renderer_classes = [JSONRenderer]

    def get(self, _request):
        """Return universal link data for ios"""
        file_path = os.path.join(
            "chatbot/utils/mobile_data", "apple-app-site-association"
        )

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        return Response(data, content_type="application/json")
