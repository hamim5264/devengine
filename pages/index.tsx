import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import Head from "next/head";

const SplashScreen = dynamic(() => import("../components/SplashScreen"), {
  ssr: false,
});

export default function IndexPage() {
  const router = useRouter();

  const handleEnterConsole = () => {
    router.push("/home");
  };

  return (
    <>
      <Head>
        <title>DevEngine - System Initialization</title>
        <meta
          name="description"
          content="DevEngine - Engineering the digital future. System initialization sequence."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href="https://www.devenginehq.com/home" />
      </Head>

      <main className="w-full h-[100svh] overflow-hidden">
        <SplashScreen onEnterConsole={handleEnterConsole} />
      </main>
    </>
  );
}
