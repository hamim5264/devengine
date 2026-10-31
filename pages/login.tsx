import HeaderControls from "@/components/HeaderControls";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import styles from "@/components/admin/AdminLogin.module.css";
import { useRouter } from "next/router";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import {getCachedStaffByUid} from "@/lib/services/staffAuth";
import {modulesForAdminRoute,hasStudioModule} from "@/lib/staffModules";
import { FiEye, FiEyeOff, FiMail, FiLock, FiArrowLeft, FiCheck, FiAlertCircle, FiPause, FiPlay } from "react-icons/fi";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

const CONSOLE_TICKER = [
  { icon: "dashboard", label: "DevEngine Studio Console", highlight: "Admin" },
  { icon: "folder_open", label: "Projects & Deliverables", highlight: "Workspace" },
  { icon: "edit_note", label: "Content & Publishing", highlight: "CMS" },
  { icon: "shopping_bag", label: "Orders & Payments", highlight: "Commerce" },
  { icon: "palette", label: "Theme & Typography", highlight: "Studio" },
  { icon: "groups", label: "Team & Delivery", highlight: "Operations" },
];

export default function LoginPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const redirectUrl = (router.query.redirect as string) || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [tickerPaused, setTickerPaused] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [fpEmail, setFpEmail] = useState("");
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState("");
  const [fpSent, setFpSent] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = cred.user;
      await user.reload();

      const isAdmin =
        (user.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();

      if (isAdmin) {
        localStorage.setItem("isAdmin", "1");
        if (redirectUrl && redirectUrl.startsWith("/admin")) {
          router.push(redirectUrl);
        } else {
          router.push("/admin/dashboard");
        }
      } else if ((await getCachedStaffByUid(user.uid))?.accountType === "sub_admin") {
        const account = await getCachedStaffByUid(user.uid);
        if (account?.status !== "active") { await auth.signOut(); setError("This account is suspended. Please contact administration."); return; }
        const requested = redirectUrl.startsWith("/admin/") && modulesForAdminRoute(redirectUrl).some(key => hasStudioModule(account,key));
        let destination = "/admin/dashboard";
        if (requested) {
          destination = redirectUrl;
        } else {
          const firstAllowedModule = STUDIO_MODULES.find(m => hasStudioModule(account, m.key) && m.items.length > 0);
          if (firstAllowedModule && firstAllowedModule.items[0]) {
            destination = firstAllowedModule.items[0].href;
          }
        }
        router.push(destination);
      } else {
        localStorage.removeItem("isAdmin");
        await auth.signOut();
        setError("Access restricted. Only authorized DevEngine administrators can log in.");
      }
    } catch (err: any) {
      // Report failed authentication attempt to security monitoring
      fetch("/api/security/report-threat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "failed_login",
          email: email.trim(),
          details: err.code || "authentication_failure",
        }),
      }).catch(() => {});

      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Invalid email or password. Please verify and try again.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password. Please verify your credentials.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many unsuccessful attempts. Access temporarily restricted. Try again later or reset password.");
      } else {
        setError(
          "Authentication failed. Please check your credentials or network."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError("");
    setFpSent(false);

    const targetEmail = fpEmail.trim().toLowerCase();
    if (!targetEmail) {
      setFpError("Please enter your registered email.");
      return;
    }

    setFpLoading(true);
    try {
      await sendPasswordResetEmail(auth, targetEmail, {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: true,
      });
      setFpSent(true);
    } catch (err: any) {
      if (err?.code === "auth/invalid-email") {
        setFpError("Invalid email address format.");
      } else {
        // Generic success to prevent user enumeration
        setFpSent(true);
      }
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign In — DevEngine Console</title>
        <meta name="description" content="Access the DevEngine administrative suite and developer console." />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div className={styles.page}>
        <div className={styles.atmosphere} aria-hidden="true"><div className={styles.glow} /><div className={styles.secondaryGlow} /><div className={styles.grid} /></div>
        <header className={`navbar ${styles.header}`}>
          <Link href="/home" className={styles.backLink}><FiArrowLeft aria-hidden="true" /><span>Return to DevEngine</span></Link>
          <div className={styles.headerRight}><span className={styles.online}><i />Gateway online</span><HeaderControls /></div>
        </header>

        <main className={styles.main}>
          <section className={styles.card} aria-labelledby="admin-login-title">
            <div className={styles.cardIntro}>
              <Link href="/home" className={styles.logo} aria-label="DevEngine home">
                <Image src={theme === "light" ? "/assets/DevEngine-logo-on-light1.png" : "/assets/DevEngine-logo-on-dark2.png"} alt="DevEngine" width={2400} height={600} priority />
              </Link>
              <span className={styles.badge}><span />Admin console</span>
              <h1 id="admin-login-title">{forgotOpen ? "Reset your password." : "Welcome back."}</h1>
              <p>{forgotOpen ? "Enter your registered email and we'll send you a password reset link." : "Sign in with your authorized email to access the DevEngine console."}</p>
            </div>

            {!forgotOpen ? <form key="login" onSubmit={handleLogin} className={styles.form} aria-busy={loading}>
              {error && <div className={styles.message} data-tone="error" role="alert"><FiAlertCircle aria-hidden="true" /><p>{error}</p></div>}
              <div className={styles.field}>
                <label htmlFor="admin-email">Email address</label>
                <div className={styles.inputWrap}><FiMail aria-hidden="true" />
                  <input className="transparent-input" id="admin-email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@devengine.com" />
                </div>
              </div>
              <div className={styles.field}>
                <div className={styles.labelRow}><label htmlFor="admin-password">Password</label><button type="button" className={styles.forgotButton} onClick={() => { setForgotOpen(true); setFpEmail(email); setError(""); setFpError(""); }}>Forgot password?</button></div>
                <div className={styles.inputWrap}><FiLock aria-hidden="true" />
                  <input className="transparent-input" id="admin-password" type={showPass ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
                  <button type="button" className={styles.passwordToggle} onClick={() => setShowPass(!showPass)} aria-label={showPass ? "Hide password" : "Show password"} aria-pressed={showPass}>{showPass ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}</button>
                </div>
              </div>
              <button type="submit" disabled={loading} className={styles.primaryButton}>{loading ? <><span className={styles.spinner} aria-hidden="true" />Authenticating…</> : <>Sign In to Console<span aria-hidden="true">↗</span></>}</button>
            </form> : <form key="recovery" onSubmit={handleForgot} className={styles.form} aria-busy={fpLoading}>
              {fpError && <div className={styles.message} data-tone="error" role="alert"><FiAlertCircle aria-hidden="true" /><p>{fpError}</p></div>}
              {fpSent ? <>
                <div className={styles.message} role="status"><FiCheck aria-hidden="true" /><div><h2>Check your inbox</h2><p>If an account exists under <strong>{fpEmail}</strong>, a password reset link has been dispatched. Please check your inbox and spam filters.</p></div></div>
                <button type="button" className={styles.primaryButton} onClick={() => { setForgotOpen(false); setFpSent(false); setFpEmail(""); }}><FiArrowLeft aria-hidden="true" />Return to Sign In</button>
              </> : <>
                <div className={styles.field}><label htmlFor="recovery-email">Registered email address</label>
                  <div className={styles.inputWrap}><FiMail aria-hidden="true" /><input className="transparent-input" id="recovery-email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required value={fpEmail} onChange={(event) => setFpEmail(event.target.value)} placeholder="admin@devengine.com" /></div>
                </div>
                <div className={styles.recoveryActions}><button type="submit" disabled={fpLoading} className={styles.primaryButton}>{fpLoading ? <><span className={styles.spinner} aria-hidden="true" />Sending…</> : "Send Reset Link"}</button><button type="button" className={styles.secondaryButton} onClick={() => { setForgotOpen(false); setFpError(""); }}>Cancel</button></div>
              </>}
            </form>}
            <div className={styles.cardNote}><FiLock aria-hidden="true" /><span>DevEngine administrator access</span></div>
          </section>
        </main>
        <footer className={styles.footer} aria-label="DevEngine console features" data-paused={tickerPaused}>
          <div className={styles.tickerViewport}><div className={styles.ticker}>
            {[0, 1].map((copy) => <div key={copy} className={styles.tickerCopy} aria-hidden={copy === 1}>
              {CONSOLE_TICKER.map((item) => <div key={item.icon} className={styles.tickerItem}>
                <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span><span>{item.label}</span><strong>{item.highlight}</strong>
              </div>)}
            </div>)}
          </div></div>
          <button type="button" className={styles.tickerToggle} aria-label={tickerPaused ? "Play footer animation" : "Pause footer animation"} aria-pressed={tickerPaused} onClick={() => setTickerPaused((paused) => !paused)}>
            {tickerPaused ? <FiPlay aria-hidden="true" /> : <FiPause aria-hidden="true" />}
          </button>
        </footer>
      </div>
    </>
  );
}
