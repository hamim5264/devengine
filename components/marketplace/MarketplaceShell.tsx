import type { ReactNode } from "react";
import LandingFooter from "@/components/landing/LandingFooter";
import LandingNavbar from "@/components/landing/LandingNavbar";
import styles from "./Marketplace.module.css";
import polish from "./SearchPolish.module.css";
import cards from "./CardRefinements.module.css";
import load from "./LoadCenter.module.css";

export default function MarketplaceShell({ children }: { children: ReactNode }) {
  return <div className={`${styles.page} ${polish.scope} ${cards.scope} ${load.scope}`}><LandingNavbar /><main className={styles.main}>{children}</main><LandingFooter /></div>;
}
