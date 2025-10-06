import express from "express";
import paypal from "paypal-rest-sdk";

const router = express.Router();

// Create payment
router.post("/pay", (req, res) => {
  const { planName, price, billing } = req.body;

  // Check if PayPal credentials are configured
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    return res.status(500).json({
      error:
        "PayPal credentials not configured. Please add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to your .env file.",
    });
  }

  // Validate and format price
  if (!price || isNaN(parseFloat(price))) {
    return res.status(400).json({
      error: "Invalid price provided. Price must be a valid number.",
    });
  }

  // Remove any currency symbols and format price to 2 decimal places as required by PayPal
  const cleanPrice = price.toString().replace(/[$,]/g, "").trim(); // Remove $ and , symbols and trim whitespace
  const numericPrice = parseFloat(cleanPrice);

  // Validate the cleaned price
  if (isNaN(numericPrice) || numericPrice <= 0) {
    return res.status(400).json({
      error: "Invalid price provided. Price must be a positive number.",
    });
  }

  const formattedPrice = numericPrice.toFixed(2);

  const merchantEmail =
    process.env.PAYPAL_MERCHANT_EMAIL || "your-business@example.com";
  console.log("Using merchant email:", merchantEmail);

  const create_payment_json = {
    intent: "sale",
    payer: { payment_method: "paypal" },
    redirect_urls: {
      return_url: "http://localhost:3000/success",
      cancel_url: "http://localhost:3000/cancel",
    },
    transactions: [
      {
        item_list: {
          items: [
            {
              name: `HumanInk ${planName} Plan`,
              sku: planName.toLowerCase(),
              price: formattedPrice,
              currency: "USD",
              quantity: 1,
            },
          ],
        },
        amount: { currency: "USD", total: formattedPrice },
        description: `HumanInk ${planName} Plan - ${billing}`,
        payee: {
          email: merchantEmail,
        },
      },
    ],
  };

  paypal.payment.create(create_payment_json, (error, payment) => {
    if (error) {
      console.error("PayPal Payment Creation Error:", error);
      console.error("Error Details:", error.response);

      // Check if it's a credentials issue
      if (error.response && error.response.name === "VALIDATION_ERROR") {
        return res.status(400).json({
          error:
            "PayPal configuration error. Please check your PayPal credentials in the .env file.",
          details: error.response.details || error.response.message,
        });
      }

      res.status(500).json({
        error: "Failed to create PayPal payment",
        details: error.response?.message || error.message,
      });
    } else {
      for (let link of payment.links) {
        if (link.rel === "approval_url") {
          res.json({ forwardLink: link.href });
        }
      }
    }
  });
});

// Success route
router.get("/success", (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;

  // First, get the payment details to get the original amount
  paypal.payment.get(paymentId, (error, payment) => {
    if (error) {
      console.error("Error getting payment details:", error);
      return res.redirect("http://localhost:3000?payment=failed");
    }

    // Extract the amount from the original payment
    const originalAmount = payment.transactions[0].amount.total;
    console.log("Original payment amount:", originalAmount);

    const execute_payment_json = {
      payer_id: payerId,
      transactions: [{ amount: { currency: "USD", total: originalAmount } }],
    };

    paypal.payment.execute(
      paymentId,
      execute_payment_json,
      (error, payment) => {
        if (error) {
          console.error("Payment execution error:", error.response);
          res.status(500).json({
            success: false,
            error: "Payment execution failed",
            details: error.response,
          });
        } else {
          console.log("Payment executed successfully:", payment);
          res.json({
            success: true,
            message: "Payment completed successfully",
            payment: payment,
          });
        }
      }
    );
  });
});

// Cancel route
router.get("/cancel", (req, res) => res.send("Payment cancelled ❌"));

export default router;
