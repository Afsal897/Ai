import os, json
import razorpay
import logging
from django.db import transaction as db_transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from chatbot.utils.authentication import CustomIsAuthenticated
from payments.models import RazorpayTransaction  # Make sure the model is imported
from api.models import User

logger = logging.getLogger("api_logger")

KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_xxxxxxxx")
KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "xxxxxxxxxxxxxxx")
WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "xxxxxxxxxxxxxxx") 

# Initialize Razorpay client
razorpay_client = razorpay.Client(auth=(KEY_ID, KEY_SECRET))

class CreateRazorpayOrderView(APIView):
    authentication_classes = [CustomIsAuthenticated]

    @db_transaction.atomic
    def post(self, request):
        try:
            user = request.user
            data = request.data
            amount = data.get("amount")   # Frontend sends amount like 800
            order_id = data.get("order_id")
            user_instance = User.objects.get(id=request.user.id) 
            if not amount or not order_id:
                return Response({"error": "amount and order_id are required"}, status=400)

            logger.info(f"Creating Razorpay order {order_id}, Amount ₹{amount}")

            # Create Razorpay order
            order = razorpay_client.order.create({
                "amount": int(amount) * 100,  # amount in paise
                "currency": "INR",
                "receipt": order_id,
                "payment_capture": 1
            })

            # Save transaction to DB
            RazorpayTransaction.objects.create(
                user=user_instance,
                order_id=order["id"],
                amount=amount,
                currency="INR",
                status="PENDING"
            )

            return Response({
                "orderId": order["id"],
                "amount": amount,
                "currency": "INR",
                "key": KEY_ID  # Send public key for JS
            }, status=200)

        except Exception as e:
            logger.error(f"Razorpay Order Creation Error: {e}", exc_info=True)
            return Response({"error": "Something went wrong"}, status=500)


class VerifyRazorpayPaymentView(APIView):
    """
    Verifies the payment signature sent by Razorpay after payment completion
    and updates the transaction with payment method.
    """
    authentication_classes = [CustomIsAuthenticated]

    def post(self, request):
        try:
            data = request.data
            razorpay_order_id = data.get("razorpay_order_id")
            razorpay_payment_id = data.get("razorpay_payment_id")
            razorpay_signature = data.get("razorpay_signature")

            if not razorpay_order_id or not razorpay_payment_id or not razorpay_signature:
                return Response({"error": "Missing payment details"}, status=400)

            # Prepare params for verification
            params_dict = {
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature
            }

            # Verify signature
            try:
                razorpay_client.utility.verify_payment_signature(params_dict)
            except razorpay.errors.SignatureVerificationError:
                # Update transaction as FAILED
                RazorpayTransaction.objects.filter(order_id=razorpay_order_id).update(
                    status="FAILED",
                    payment_id=razorpay_payment_id,
                    signature=razorpay_signature
                )
                return Response({"status": "failure", "message": "Invalid signature"}, status=400)

            # Fetch payment details from Razorpay
            payment = razorpay_client.payment.fetch(razorpay_payment_id)
            payment_method = payment.get("method")  # card, netbanking, upi, wallet, etc.

            # Update transaction as SUCCESS with payment method
            RazorpayTransaction.objects.filter(order_id=razorpay_order_id).update(
                status="SUCCESS",
                payment_id=razorpay_payment_id,
                signature=razorpay_signature,
                payment_method=payment_method
            )
            User.objects.filter(id=request.user.id).update(is_subscribed=True)

            return Response({
                "status": "success",
                "message": "Payment verified successfully",
                "payment_method": payment_method
            }, status=200)

        except Exception as e:
            logger.error(f"Payment verification error: {e}", exc_info=True)
            return Response({"error": str(e)}, status=500)


class RazorpayWebhookView(APIView):
    """
    Handles Razorpay webhook events like payment captured, failed, refunds, etc.
    """
    authentication_classes = []  # Webhooks are called by Razorpay, no auth needed
    permission_classes = []

    def post(self, request, *args, **kwargs):
        payload = request.body
        signature = request.headers.get("X-Razorpay-Signature")

        # Verify webhook signature
        try:
            razorpay_client.utility.verify_webhook_signature(payload, signature, WEBHOOK_SECRET)
        except razorpay.errors.SignatureVerificationError:
            logger.warning("Invalid Razorpay webhook signature")
            return Response(status=400)

        try:
            event = json.loads(payload)
            logger.info(f"Received webhook event: {event['event']}")

            # Handle payment captured
            if event["event"] == "payment.captured":
                payment = event["payload"]["payment"]["entity"]
                razorpay_order_id = payment["order_id"]
                razorpay_payment_id = payment["id"]
                payment_method = payment.get("method", "unknown")

                # Update transaction in DB
                RazorpayTransaction.objects.filter(order_id=razorpay_order_id).update(
                    status="SUCCESS",
                    payment_id=razorpay_payment_id,
                    payment_method=payment_method
                )

            # Handle other events if needed: payment.failed, refund.processed, etc.

            return Response(status=200)
        except Exception as e:
            logger.error(f"Error processing webhook: {e}", exc_info=True)
            return Response(status=500)