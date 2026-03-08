## 🖥️ Index Page (Login)

### `pages/index.js`
```js
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const router = useRouter();

  const handleLogin = () => {
    if (user === 'user' && pass === 'demo123') {
      router.push('/dashboard');
    } else {
      alert('Invalid credentials. Try user / demo123');
    }
  };

  return (
    <div style={{ background: '#111', color: '#eee', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ padding: '2rem', background: '#222', borderRadius: '8px', width: '300px' }}>
        <h2 style={{ color: '#C0C0C0' }}>Login</h2>
        <input
          type="text"
          placeholder="Username"
          onChange={e => setUser(e.target.value)}
          style={{ display: 'block', margin: '0.5rem 0', padding: '10px', width: '100%', borderRadius: '6px', border: 'none' }}
        />
        <input
          type="password"
          placeholder="Password"
          onChange={e => setPass(e.target.value)}
          style={{ display: 'block', margin: '0.5rem 0', padding: '10px', width: '100%', borderRadius: '6px', border: 'none' }}
        />
        <button
          onClick={handleLogin}
          style={{ background: '#6A0DAD', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', width: '100%' }}
        >
          Login
        </button>
        <p style={{ color: '#aaa', marginTop: '1rem' }}>Demo: user / demo123</p>
      </div>
    </div>
  );
}
