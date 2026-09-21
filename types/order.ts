export type PaymentMethodType =
  | "bKash"
  | "Nagad"
  | "Rocket"
  | "Dutch-Bangla Bank"
  | "BRAC Bank"
  | "Other";

export type OrderStatus = "Pending Verification" | "Verified" | "Rejected";

export interface OrderRecord {
  id: string; // e.g. "DEV-2026-X892A"
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;

  projectId: string;
  projectSlug: string;
  projectTitle: string;
  planId: string;
  planName: string;

  amount: string;
  currency: string;
  paymentMethod: PaymentMethodType;
  transactionId: string;
  senderNumberOrAccount: string;
  additionalNotes?: string;

  status: OrderStatus;
  createdAt: any;
  verifiedAt?: any;
}

export interface PaymentAccountInfo {
  id: PaymentMethodType;
  name: string;
  accountHolder: string;
  accountNumber: string;
  methodType: string;
  typeBadge: string;
  accentColor: string;
  instructions: string;
}

export const PAYMENT_ACCOUNTS: PaymentAccountInfo[] = [
  {
    id: "bKash",
    name: "bKash",
    accountHolder: "MD. ABDUL HAMIM",
    accountNumber: "01724879284",
    methodType: "Mobile Payment (Send Money)",
    typeBadge: "Personal",
    accentColor: "#e2136e",
    instructions: "Open bKash app > Send Money to this personal number > Copy the TrxID.",
  },
  {
    id: "Nagad",
    name: "Nagad",
    accountHolder: "MD. ABDUL HAMIM",
    accountNumber: "01724879284",
    methodType: "Mobile Payment (Send Money)",
    typeBadge: "Personal",
    accentColor: "#f7921e",
    instructions: "Open Nagad app > Send Money to this number > Note down the TrxID.",
  },
  {
    id: "Rocket",
    name: "Rocket",
    accountHolder: "MD. ABDUL HAMIM",
    accountNumber: "01724879284",
    methodType: "Mobile Payment (Send Money)",
    typeBadge: "Personal",
    accentColor: "#8c3494",
    instructions: "Open Rocket app > Send Money to this number > Copy Transaction ID.",
  },
  {
    id: "Dutch-Bangla Bank",
    name: "Dutch-Bangla Bank",
    accountHolder: "MD. ABDUL HAMIM",
    accountNumber: "7017321870818",
    methodType: "Bank Transfer (NPSB / BEFTN)",
    typeBadge: "Bank Account",
    accentColor: "#006837",
    instructions: "Transfer via NPSB, BEFTN or DBBL NexusPay > Note down reference/TrxID.",
  },
  {
    id: "BRAC Bank",
    name: "BRAC Bank",
    accountHolder: "MD. ABDUL HAMIM",
    accountNumber: "1061077260001",
    methodType: "Bank Transfer (NPSB / BEFTN)",
    typeBadge: "Bank Account",
    accentColor: "#005a9c",
    instructions: "Transfer via Astha app, NPSB or BEFTN > Note down transaction reference.",
  },
];
