import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/favicon-512x512.png" />
        <meta name="theme-color" content="#111" />
        <meta name="description" content="AHMAIYYA MANAGEMENT – Sovereign fleet, finance, and AI oversight platform." />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
