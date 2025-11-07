import { useState } from "react";
import { Button, Card, Spinner } from "react-bootstrap";
import {
  createOrder,
  verifyPayment,
} from "../../services/auth-service/authService";

// Extend window for Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

// Dynamically load Razorpay checkout script
const loadRazorpayScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector("#razorpay-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Razorpay SDK failed to load"));
      document.body.appendChild(script);
    } else {
      resolve();
    }
  });
};

export default function PaymentPage() {
  const [loading, setLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const initiatePayment = async () => {
    try {
      setLoading(true);

      await loadRazorpayScript();

      const orderId = "ORDER_" + Date.now();
      const data = await createOrder(1, orderId);

      const options = {
        key: data.key,
        amount: data.amount * 100,
        currency: data.currency,
        name: "Your App Name",
        description: "Premium Plan",
        order_id: data.orderId,
        handler: async function (response: any) {
          try {
            const result = await verifyPayment(response);

            if (result.status === "success") {
              setPaymentSuccess(true);
            } else {
              alert("Payment verification failed: " + result.message);
            }
          } catch (err) {
            console.error("Verification error:", err);
            alert("Error verifying payment");
          }
        },
        modal: {
          ondismiss: function () {
            alert("Payment popup closed.");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment initiation failed:", error);
      alert("Payment could not be initiated.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ height: "80vh" }}
    >
      <Card className="p-4 shadow text-center" style={{ width: 350 }}>
        <h4 className="mb-3">Get Premium</h4>
        <p className="text-muted">Unlock advanced features</p>

        {paymentSuccess ? (
          <div className="text-success">
            <h2>
              <span style={{ fontSize: "2rem" }}></span> Subscribed
            </h2>
          </div>
        ) : (
          <h2>₹1</h2>
        )}

        {!paymentSuccess && (
          <Button
            variant="primary"
            className="w-100 mt-3"
            onClick={initiatePayment}
            disabled={loading}
          >
            {loading ? <Spinner animation="border" size="sm" /> : "Pay ₹1"}
          </Button>
        )}
      </Card>
    </div>
  );
}
