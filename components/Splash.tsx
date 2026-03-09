// components/Splash.tsx
export default function Splash() {
  return (
    <div style={{
      background: '#000',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <img src="/splash.png" alt="AHMAIYYA Splash" style={{ width: '300px' }} />
      <div style={{ marginTop: '2rem', display: 'flex', gap: '0.5rem' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#C0C0C0', animation: 'pulse 1s infinite' }} />
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#A080D0', animation: 'pulse 1s infinite 0.2s' }} />
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#6A0DAD', animation: 'pulse 1s infinite 0.4s' }} />
      </div>
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
