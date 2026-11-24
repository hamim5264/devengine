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
        <title>DevEngine | Enterprise Software & Digital Product Studio</title>
        <meta
          name="description"
          content="DevEngine engineers performant web platforms, mobile applications, AI systems, and enterprise software for ambitious teams."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href="https://www.devenginehq.com/" />
        <meta name="robots" content="index,follow,max-image-preview:large" />
        <meta property="og:site_name" content="DevEngine" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="DevEngine | Enterprise Software & Digital Product Studio" />
        <meta property="og:description" content="DevEngine engineers performant web platforms, mobile applications, AI systems, and enterprise software for ambitious teams." />
        <meta property="og:url" content="https://www.devenginehq.com/" />
        <meta property="og:image" content="https://www.devenginehq.com/dev_url_logo.png" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <main className="w-full h-[100svh] overflow-hidden">
        <SplashScreen onEnterConsole={handleEnterConsole} />
      </main>
    </>
  );
}
