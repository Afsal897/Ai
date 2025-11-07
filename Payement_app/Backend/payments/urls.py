from django.urls import path
from .views import CreateRazorpayOrderView, VerifyRazorpayPaymentView, RazorpayWebhookView

urlpatterns = [
    path("create-order/", CreateRazorpayOrderView.as_view(), name="create_order"),
    path("verify-payment/", VerifyRazorpayPaymentView.as_view(), name="verify_payment"),
    path("webhook/", RazorpayWebhookView.as_view(), name="razorpay-webhook"),#needs to host inorder to use
]