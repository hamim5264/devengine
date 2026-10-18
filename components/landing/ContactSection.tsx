import { useCallback, useState, type FormEvent } from "react";
import type { ContactConfig } from "@/types/landing";
import { sendContactEmail } from "@/lib/services/emailService";
import ThankYouModal from "@/components/ThankYouModal";
import styles from "./Landing.module.css";

export default function ContactSection({ config }: { config: ContactConfig }) {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [thankYouOpen, setThankYouOpen] = useState(false);
  const [submittedName, setSubmittedName] = useState("");
  const closeThankYou = useCallback(() => setThankYouOpen(false), []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await sendContactEmail({ name: form.name, email: form.email, title: form.subject || `DevEngine Landing Inquiry from ${form.name}`, message: form.message });
      setSubmittedName(form.name);
      setThankYouOpen(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      console.error("Failed to transmit contact form:", error);
      setErrorMsg(error && typeof error === "object" && "text" in error && typeof error.text === "string" ? error.text : "Failed to transmit message. Please try again or reach out to hamim.leon@gmail.com directly.");
    } finally { setLoading(false); }
  };

  return <>
    <section id="contact" className={styles.section}>
      <div className={`${styles.card} ${styles.contactCard}`}>
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>{config.tag}</p><h2 className={styles.heading}>{config.title}</h2><p className={styles.body}>{config.subtitle}</p></div>
        {errorMsg && <p role="alert" className={styles.error}>{errorMsg}</p>}
        <form onSubmit={handleSubmit} aria-busy={loading}>
          <fieldset disabled={loading} className={styles.formFields}>
            <div className={styles.field}><label htmlFor="home-contact-name" className={styles.label}>Name / Call Sign *</label><input id="home-contact-name" name="name" type="text" autoComplete="name" required placeholder="Your name or organization" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={styles.input} /></div>
            <div className={styles.field}><label htmlFor="home-contact-email" className={styles.label}>Comm Link (Email) *</label><input id="home-contact-email" name="email" type="email" autoComplete="email" required placeholder="hello@company.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={styles.input} /></div>
            <div className={`${styles.field} ${styles.fullField}`}><label htmlFor="home-contact-subject" className={styles.label}>Inquiry Topic / Subject</label><input id="home-contact-subject" name="subject" type="text" placeholder="Web app, mobile platform, AI integration…" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} className={styles.input} /></div>
            <div className={`${styles.field} ${styles.fullField}`}><label htmlFor="home-contact-message" className={styles.label}>Mission Parameters (Message) *</label><textarea id="home-contact-message" name="message" required rows={5} placeholder="Describe your project requirements and objectives…" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className={styles.input} /></div>
          </fieldset>
          <button type="submit" disabled={loading} className={`${styles.primaryButton} ${styles.submitButton}`}>{loading ? "Transmitting to DevEngine…" : "Transmit Request"}</button>
        </form>
      </div>
    </section>
    <ThankYouModal isOpen={thankYouOpen} onClose={closeThankYou} senderName={submittedName} durationMs={5000} />
  </>;
}
