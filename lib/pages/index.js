import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    // Demo fallback: fake login
    if (email === 'user' && pass === 'demo123') {
      router.push('/dashboard');
      return;
    }

    // Supabase login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      alert('Login failed: ' + error.message);
    } else {
      router.push('/dashboard');
    }
  };

  const handleSignup = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
    });

    if (error) {
      alert('Signup failed: ' + error.message);
    } else {
      alert('Signup successful! Please log in.');
    }
  };

  return (
    <div style={{ background: '#111', color: '#eee', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ padding: '2rem', background: '#222', borderRadius: '8px', width: '300px' }}>
        <h2 style={{ color: '#C0C0C0' }}>Login</h2>
        <input
          type="email"
          placeholder="Email"
          onChange={e => setEmail(e.target.value)}
          style={{ display: 'block', margin: '0.5rem 0', padding: '10px', width: '100%', borderRadius: '6px', border: 'none' }}
        />
        <input
          type="password"
          placeholder="Password"
          onChange={e => setPass(e.target.value)}
          style={{ display: 'block', margin: '0.5rem 0', padding: '10px', width: '100%', borderRadius: '6px', border: 'none' }}
        />
        <button onClick={handleLogin} style={{ background: '#6A0DAD', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', width: '100%' }}>
          Login
        </button>
        <button onClick={handleSignup} style={{ background: '#8A2BE2', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', width: '100%', marginTop: '1rem' }}>
          Sign Up
        </button>
        <p style={{ color: '#aaa', marginTop: '1rem' }}>Demo login: user / demo123</p>
      </div>
    </div>
  );
}
