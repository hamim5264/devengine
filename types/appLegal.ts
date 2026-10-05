export interface AppPolicy {
  id: string;
  slug: string; // URL-safe identifier: /apps/[slug]
  appName: string;
  appSubtitle: string;
  description: string;
  logoUrl: string;
  category: string;
  packageName: string; // e.g. com.devengine.myapp
  playStoreUrl?: string; // Optional Google Play link
  appStoreUrl?: string; // Optional Apple App Store link
  contactEmail: string;
  effectiveDate: string; // e.g. "October 2026"
  privacyPolicy: string;
  termsOfService: string;
  dataDeletionPolicy: string;
  isPublished?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface AppDataDeletionRequest {
  id?: string;
  appSlug: string;
  appName: string;
  userEmail: string;
  userIdOrUsername?: string;
  requestType: "delete_account" | "delete_all" | "delete_history";
  reason?: string;
  status: "pending" | "processing" | "completed" | "rejected";
  createdAt?: any;
}

export const APP_CATEGORIES = [
  "Tools & Utilities",
  "Productivity",
  "Health & Fitness",
  "Finance & Business",
  "Education",
  "Entertainment",
  "Social & Networking",
  "Lifestyle",
  "Games",
  "Developer Tools",
  "Other",
] as const;

/**
 * Generates pre-filled, Google Play Store compliant legal policy templates
 */
export function generatePlayCompliantTemplates(params: {
  appName: string;
  packageName: string;
  contactEmail: string;
  companyName?: string;
  effectiveDate?: string;
}) {
  const {
    appName,
    packageName,
    contactEmail,
    companyName = "DevEngine",
    effectiveDate = "October 2026",
  } = params;

  const privacyPolicy = `# Privacy Policy for ${appName}

**Effective Date:** ${effectiveDate}  
**Package Name / Application Identifier:** \`${packageName || "com.devengine.app"}\`  
**Developer / Publisher:** ${companyName}  
**Contact Email:** ${contactEmail}

---

### 1. Introduction & Overview
This Privacy Policy describes how **${companyName}** ("we," "our," or "us") collects, uses, stores, and protects information when you download, install, access, or use **${appName}** (the "Application" or "App"). 

We respect your personal privacy and are committed to maintaining transparent data practices in full compliance with **Google Play Developer Policies**, **GDPR**, and international data privacy regulations.

---

### 2. Information We Collect
Depending on your usage of ${appName}, we may collect the following categories of information:

#### A. Information You Voluntarily Provide
- **Account Credentials:** If you create an account, we may store your email address, username, and encrypted credentials.
- **Support & Communications:** When contacting our support team, we collect your email address and message contents to assist you.
- **User-Generated Content:** Any preferences, custom settings, or records you choose to input into the App.

#### B. Automatically Collected Information
- **Device & System Diagnostics:** Device model, operating system version, unique device identifiers, language settings, and network operator.
- **App Usage Telemetry:** Frequency of feature interactions, session durations, screen navigations, and crash logs to diagnose technical errors.
- **IP Address & General Geolocation:** Coarse geographic location (country/region level) derived from IP address for performance routing and regional compliance.

---

### 3. Device Permissions & Use
${appName} may request access to specific device capabilities only when strictly necessary for core functionality:
- **Internet / Network Access:** Required to synchronize data, access cloud resources, and verify security tokens.
- **Storage / Photos (Optional):** Requested only if you explicitly choose to upload, save, or export media/documents within the App.
- **Notifications (Optional):** Requested to send you timely updates, reminders, or alert notifications. You can revoke this permission anytime in your device settings.

---

### 4. Third-Party Services & SDK Disclosures
To deliver reliable features, cloud storage, crash reporting, and analytics, ${appName} may integrate vetted third-party service providers who process data on our behalf in accordance with strict security terms:
- **Google Play Services:** Fundamental framework for Android device integration and account services.
- **Firebase Analytics & Crashlytics (Google LLC):** Collects aggregated diagnostic telemetry and crash traces to optimize stability.
- **Google AdMob (if applicable):** May serve contextual or non-personalized advertisements adhering to Google Play Ads Policy.

Each third-party service provider operates under its respective privacy policy. We encourage you to review Google's Privacy Policy at: [https://policies.google.com/privacy](https://policies.google.com/privacy).

---

### 5. How We Use Your Information
We use information collected strictly for legitimate business and operational purposes:
1. To operate, maintain, and enhance the features of ${appName}.
2. To diagnose software bugs, performance bottlenecks, and crash events.
3. To safeguard against fraudulent, malicious, or abusive activities.
4. To communicate critical service announcements, security updates, or respond to support inquiries.
5. To comply with valid legal obligations and regulatory standards.

**We do NOT sell, rent, or trade your personal data to data brokers or third parties.**

---

### 6. Data Retention & Security Measures
- **Retention Period:** We retain your personal information only for as long as your account remains active or as needed to provide you with the App's services, after which it is securely deleted or anonymized.
- **Security Protocols:** All data transmission between the App and our servers is secured using modern TLS/HTTPS encryption. Data stored in databases is protected with role-based access controls and encrypted storage at rest.

---

### 7. Children's Privacy (COPPA Compliance)
${appName} is not directed to children under the age of 13 (or under 16 in the European Union). We do not knowingly collect personal identifiable information from children. If we discover that a child has provided us with personal information without parental consent, we will promptly delete it. If you believe your child has provided us information, contact us at: **${contactEmail}**.

---

### 8. Your Rights & Data Deletion
Depending on your jurisdiction, you have the right to:
- Access and inspect the personal information we hold about you.
- Request correction of inaccurate or outdated information.
- Request the complete deletion of your account and associated data.

For comprehensive instructions on how to request deletion of your account and personal data, please visit our dedicated **[Data & Account Deletion Policy](/apps/${params.packageName ? params.packageName.split(".").pop() : "app"}/data-deletion)** page or email us directly at **${contactEmail}**.

---

### 9. Changes to This Privacy Policy
We may periodically update our Privacy Policy to reflect changes in our practices or applicable legal mandates. We will notify you of any material changes by updating the "Effective Date" at the top of this document or displaying an in-app notice.

---

### 10. Contact Us
If you have questions, feedback, or concerns regarding this Privacy Policy or our data protection practices, please contact our Data Protection Team at:
- **Email:** ${contactEmail}
- **Developer Website:** [DevEngine Legal Hub](/)
`;

  const termsOfService = `# Terms of Service for ${appName}

**Effective Date:** ${effectiveDate}  
**Package Name / Application Identifier:** \`${packageName || "com.devengine.app"}\`  
**Publisher:** ${companyName}  
**Contact:** ${contactEmail}

---

### 1. Acceptance of Terms
By downloading, installing, accessing, or using **${appName}** (the "Application"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not install or use the Application.

---

### 2. License Grant
${companyName} grants you a revocable, non-exclusive, non-transferable, limited license to download, install, and use the Application strictly for personal, non-commercial purposes (unless explicitly licensed otherwise) in accordance with these Terms and applicable store agreements.

---

### 3. Restrictions & Prohibited Conduct
You agree not to, and will not permit others to:
1. Reverse engineer, decompile, disassemble, or attempt to derive source code from the Application.
2. Modify, adapt, translate, or create derivative works of any component of the Application.
3. Circumvent, disable, or tamper with any digital rights management or security mechanisms.
4. Use the Application in any manner that infringes intellectual property, violates local or international laws, or transmits malicious code.

---

### 4. Intellectual Property
All rights, title, and interest in and to ${appName}, including software architecture, UI design, trademarks, logos, graphics, and documentation, are and remain the exclusive property of ${companyName} and its licensors.

---

### 5. Termination
These Terms remain effective until terminated by either you or ${companyName}. You may terminate these Terms by uninstalling the Application and deleting your account. We reserve the right to suspend or terminate access immediately without prior notice if you violate these Terms.

---

### 6. Disclaimer of Warranties
THE APPLICATION IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.

---

### 7. Limitation of Liability
TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL ${companyName.toUpperCase()}, ITS DIRECTORS, EMPLOYEES, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF OR INABILITY TO USE THE APPLICATION.

---

### 8. Governing Law & Dispute Resolution
These Terms shall be governed by and construed in accordance with applicable laws without regard to conflict of law principles.

---

### 9. Contact Information
For inquiries regarding these Terms of Service, contact us at:
- **Email:** ${contactEmail}
`;

  const dataDeletionPolicy = `# Data & Account Deletion Policy for ${appName}

**Effective Date:** ${effectiveDate}  
**Application Identifier:** \`${packageName || "com.devengine.app"}\`  
**Publisher:** ${companyName}  
**Support Contact:** ${contactEmail}

---

### 1. Overview & Google Play Compliance
In strict adherence to **Google Play Data Safety & User Data Policies**, ${companyName} provides a clear, frictionless pathway for users to request the permanent deletion of their account and all associated personal data stored within **${appName}**.

You do not need to keep the Application installed to request data deletion. You may submit your deletion request via our in-app settings or via our secure web request form below.

---

### 2. What Data Is Deleted Upon Request
When you initiate an account and data deletion request, the following information will be permanently wiped from our active databases and cloud storage:
- **Account Profile & Identifiers:** Name, email address, usernames, authentication tokens, and profile avatar.
- **Activity & Usage Records:** App history, synced preferences, favorites, logs, and custom entries.
- **Uploaded Media / Assets:** Any files or media content uploaded to our cloud servers through the App.
- **Support History:** Past communication transcripts and customer support tickets associated with your account.

---

### 3. What Data May Be Retained (Exceptions)
Certain minimal data may be retained for limited legal or operational compliance:
- **Transaction Records:** Financial receipts, tax records, or in-app purchase confirmations required by statutory tax and accounting laws (retained for the legally mandated period).
- **Security & Fraud Prevention Logs:** Anonymized logs strictly necessary to prevent recurring malicious abuse or security attacks.

*All retained data is strictly isolated, stripped of direct identifiers where possible, and not used for commercial or analytical purposes.*

---

### 4. How to Request Deletion

#### Option A: Within the Application (In-App)
1. Open **${appName}** on your device.
2. Navigate to **Settings** or **Profile** > **Security & Account**.
3. Tap **Delete Account & Data**.
4. Confirm your choice. Your session will terminate immediately and deletion processing will begin.

#### Option B: Via Web Form or Email (No App Required)
If you have uninstalled the App or cannot access your device:
1. Submit your request using the web submission form on this page below.
2. Alternatively, send an email to **${contactEmail}** with the subject:  
   \`[Data Deletion Request] - ${appName}\`  
   Include your registered email address or user identifier.

---

### 5. Deletion Timeline & Verification
- **Verification:** To protect your account from unauthorized deletion, we may send a verification email to your registered address.
- **Timeline:** Data deletion requests are processed and completed within **30 days** of identity verification.
- **Confirmation:** You will receive an automated confirmation email once your account and all associated data have been permanently purged.

---

### 6. Questions & Data Protection Officer
If you have questions regarding our data retention practices or deletion procedures, reach out to our team at:
- **Email:** ${contactEmail}
`;

  return { privacyPolicy, termsOfService, dataDeletionPolicy };
}
