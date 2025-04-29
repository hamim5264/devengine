import type { NextApiRequest, NextApiResponse } from "next";
import FormData from "form-data";
import axios from "axios";

// const store_id = process.env.NEXT_PUBLIC_STORE_ID;
// const store_passwd = process.env.NEXT_PUBLIC_STORE_PASSWORD;
// const is_live = false; // ✨ Set to false for sandbox mode

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASSWORD;
const is_live = true; // ✨ Set to false for sandbox mode

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { name, email, amount, projectSlug } = req.body;

  if (!name || !email || !amount || !projectSlug) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!store_id || !store_passwd) {
    return res.status(500).json({ error: "Store credentials missing" });
  }

  const transactionId = `${projectSlug}_${Date.now()}`;

  const formData = new FormData();
  formData.append("store_id", store_id);
  formData.append("store_passwd", store_passwd);
  formData.append("total_amount", amount);
  formData.append("currency", "BDT");
  formData.append("tran_id", transactionId);
  formData.append("success_url", `${process.env.NEXT_PUBLIC_BASE_URL}/payment-success`);
  formData.append("fail_url", `${process.env.NEXT_PUBLIC_BASE_URL}/payment-fail`);
  formData.append("cancel_url", `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancel`);
  formData.append("cus_name", name);
  formData.append("cus_email", email);
  formData.append("cus_add1", "Dhaka");
  formData.append("cus_city", "Dhaka");
  formData.append("cus_country", "Bangladesh");
  formData.append("cus_phone", "01724879284");
  formData.append("shipping_method", "NO");
  formData.append("product_name", projectSlug);
  formData.append("product_category", "Software");
  formData.append("product_profile", "general");

  const sslcommerzUrl = is_live
    ? "https://securepay.sslcommerz.com/gwprocess/v4/api.php"
    : "https://sandbox.sslcommerz.com/gwprocess/v4/api.php";

  try {
    const response = await axios.post(sslcommerzUrl, formData, {
      headers: formData.getHeaders(),
    });

    if (response.data?.GatewayPageURL) {
      return res.status(200).json({ url: response.data.GatewayPageURL });
    } else {
      console.error("❌ SSLCommerz Response Error:", response.data);
      return res.status(400).json({ error: "Failed to create payment session" });
    }
  } catch (error: any) {
    console.error("❌ SSLCommerz API Error:", error?.response?.data || error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
