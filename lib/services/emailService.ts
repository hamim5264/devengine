import emailjs from "emailjs-com";

export const EMAILJS_CONFIG = {
  SERVICE_ID:
    process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID ||
    process.env.EMAILJS_SERVICE_ID ||
    "service_4yl6voe",
  TEMPLATE_ID:
    process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID ||
    process.env.EMAILJS_TEMPLATE_ID ||
    "template_zasrq8t",
  PUBLIC_KEY:
    process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ||
    process.env.EMAILJS_PUBLIC_KEY ||
    "1EjxPg3_raS1xxgZ9",
};

export interface ContactMailParams {
  name: string;
  email: string;
  title?: string;
  message: string;
}

/**
 * Sends contact email via EmailJS using template_zasrq8t.
 * Matches all required template fields: {{name}}, {{email}}, {{title}}, {{time}}, {{message}}.
 */
export async function sendContactEmail(params: ContactMailParams): Promise<void> {
  const formattedTime = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const templateParams = {
    name: params.name.trim(),
    email: params.email.trim(),
    title: params.title?.trim() || "DevEngine Website Inquiry",
    time: formattedTime,
    message: params.message.trim(),
  };

  await emailjs.send(
    EMAILJS_CONFIG.SERVICE_ID,
    EMAILJS_CONFIG.TEMPLATE_ID,
    templateParams,
    EMAILJS_CONFIG.PUBLIC_KEY
  );
}
