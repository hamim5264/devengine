import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('devengine_theme');
                  var def = localStorage.getItem('devengine_default_theme') || 'light';
                  var theme = (saved === 'light' || saved === 'dark') ? saved : def;
                  var root = document.documentElement;
                  root.classList.remove('dark', 'light');
                  root.classList.add(theme);
                  root.setAttribute('data-theme', theme);
                  root.style.colorScheme = theme;
                } catch(e) {}
              })();
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        {/* Favicons & Site Brand Icons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=3" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=3" />
        <link rel="icon" type="image/png" href="/dev_url_logo.png?v=3" />
        <link rel="shortcut icon" type="image/png" href="/favicon-32x32.png?v=3" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=3" />
      </Head>
      <body className="bg-[var(--devengine-page)] text-[var(--devengine-text)] antialiased selection:bg-[#38f2ff]/30 selection:text-white transition-colors duration-200">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
