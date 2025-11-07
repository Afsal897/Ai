from django.db import models
from api.models import User

class RazorpayTransaction(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("SUCCESS", "Success"),
        ("FAILED", "Failed"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,  # Set user to NULL if deleted
        null=True,                  # Allow NULL
        blank=True,                 # Optional in forms/admin
        related_name="razorpay_transactions"
    )
    order_id = models.CharField(max_length=100, unique=True)  # Razorpay order_id
    payment_id = models.CharField(max_length=100, null=True, blank=True)  # Razorpay payment_id
    signature = models.CharField(max_length=256, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="INR")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="PENDING")
    payment_method = models.CharField(max_length=50, null=True, blank=True)  # e.g., card, netbanking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = models.Manager()

    def __str__(self):
        return f"{self.user.username} | {self.order_id} | {self.status}"

    class Meta:
        db_table = "razorpay_transaction"
        ordering = ["-created_at"]
