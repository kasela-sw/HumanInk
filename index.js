// index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { humanizeText } from "./routes/generate.js";
import paypal from "paypal-rest-sdk";
import paypalRoutes from "./routes/paypal.js";
dotenv.config();

// Configure PayPal
paypal.configure({
  mode: "sandbox", // Use 'live' for production
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.json({ message: "🚀 HumanInk server is running!" });
});

// Humanize text route
app.post("/api/humanize", humanizeText);
app.use("/api/paypal", paypalRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
