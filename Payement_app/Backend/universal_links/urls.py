"""URL Configuration For Universal Links"""

from django.urls import path
from universal_links.views import AssetLinksView, AppleAppSiteAssociationView

urlpatterns = [
    path(".well-known/assetlinks.json", AssetLinksView.as_view()),
    path(
        ".well-known/apple-app-site-association", AppleAppSiteAssociationView.as_view()
    ),
]
