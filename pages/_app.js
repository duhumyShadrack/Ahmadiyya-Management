import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <div style={{ background: '#111', minHeight: '100vh' }}>
      <Component {...pageProps} />
    </div>
  );
}
