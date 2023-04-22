import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import dynamic from 'next/dynamic';

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <>
      <Head>
        <title>BlueBot control panel</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="version" content={process.env.VERSION} />
      </Head>
      <Component {...pageProps} />
    </>
  );
};

// We disable SSR globally here: it's unnecessary for our app as we don't care about SEO,
// and the performance is perfectly fine without SSR. We're really only using Next
// as it's a neat way to get both a React app and simple API routes hosted on Vercel.
const AppNoSsr = dynamic(() => Promise.resolve(App), { ssr: false });

export default AppNoSsr;
