export default function Card({ children }) {
  return (
    <div
      style={{
        background: '#222',
        padding: '1.5rem',
        margin: '1rem 0',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.4)'
      }}
    >
      {children}
    </div>
  );
}
