import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

const store_id = process.env.STORE_ID!;
const store_passwd = process.env.STORE_PASSWORD!;
const is_live = false; // sandbox mode

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 🔵 Log incoming request
  console.log("🔵 Incoming Payment API Call:", req.body);

  const { name, email, amount, projectSlug } = req.body;

  // ✅ Validation
  if (!name || !email || !amount || !projectSlug) {
    console.error("❌ Missing required fields:", { name, email, amount, projectSlug });
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
    console.error("❌ Invalid amount:", amount);
    return res.status(400).json({ error: "Invalid amount value" });
  }

  if (!store_id || !store_passwd) {
    console.error("❌ Missing SSLCommerz credentials");
    return res.status(500).json({ error: "Store credentials missing on server!" });
  }

  const transactionId = `${projectSlug}_${Date.now()}`;

  const postData = {
    store_id,
    store_passwd,
    total_amount: amount,
    currency: "BDT",
    tran_id: transactionId,
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-success`,
    fail_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-fail`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancel`,
    cus_name: name,
    cus_email: email,
    cus_add1: "Customer Address",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    cus_phone: "01700000000",
    shipping_method: "NO",
    product_name: projectSlug,
    product_category: "Software",
    product_profile: "general",
  };

  const sslcommerzUrl = is_live
    ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"
    : "https://securepay.sslcommerz.com/gwprocess/v4/api.php";

  try {
    const apiResponse = await axios.post(sslcommerzUrl, postData);

    if (apiResponse.data?.GatewayPageURL) {
      return res.status(200).json({ url: apiResponse.data.GatewayPageURL });
    } else {
      console.error("❌ SSLCommerz Response Error:", apiResponse.data);
      return res.status(400).json({ error: "Failed to create payment session" });
    }
  } catch (error) {
    console.error("❌ SSLCommerz API Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
