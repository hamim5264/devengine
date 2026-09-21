import axios from "axios";

async function testEmail() {
  const payload = {
    service_id: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_4yl6voe",
    template_id: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "template_zasrq8t",
    user_id: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "1EjxPg3_raS1xxgZ9",
    template_params: {
      name: "DevEngine Assistant (Test)",
      email: "hamim.leon@gmail.com",
      title: "System Integration Test",
      time: new Date().toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      message:
        "Hello Hamim! This is a test message to confirm your EmailJS template (template_zasrq8t) and service (service_4yl6voe) are fully connected and working.",
    },
  };

  try {
    const res = await axios.post(
      "https://api.emailjs.com/api/v1.0/email/send",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log("SUCCESS! Response status:", res.status, res.data);
  } catch (err) {
    console.error(
      "ERROR sending test email:",
      err.response ? err.response.status : err.message,
      err.response ? err.response.data : ""
    );
  }
}

testEmail();
