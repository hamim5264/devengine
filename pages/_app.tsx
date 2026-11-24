import dynamic from "next/dynamic";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { HeaderControlsProvider } from "@/components/HeaderControls";
import { ThemeProvider } from "@/context/ThemeContext";
import "../styles/globals.css";
import "../styles/admin.css";

const AppRuntime = dynamic(() => import("@/components/AppRuntime"));

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  if (router.pathname === "/") {
    return (
      <ThemeProvider syncRemote={false}>
        <HeaderControlsProvider assistantEnabled={false}>
          <Component {...pageProps} />
        </HeaderControlsProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <AppRuntime Component={Component} pageProps={pageProps} />
    </ThemeProvider>
  );
}

export default MyApp;
