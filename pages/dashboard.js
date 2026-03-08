import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import NavBar from '../components/NavBar';
import { Bar, Line } from 'react-chartjs-2';

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);

  useEffect(() => {
    const currentSession = supabase.auth.getSession();
    currentSession.then(({ data }) => {
      if (!data.session) {
        router.push('/');
      } else {
        setSession(data.session);
      }
    });
  }, []);

  // Dummy chart data
  const fleetData = {
    labels: ['Vehicle A', 'Vehicle B', 'Vehicle C', 'Vehicle D'],
    datasets: [{ label: 'Mileage (km)', data: [12000, 8000, 15000, 6000], backgroundColor: '#6A0DAD' }]
  };

  const financeData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr'],
    datasets: [{ label: 'Transactions ($)', data: [20000, 30000, 25000, 40000], borderColor: '#C0C0C0', fill: true }]
  };

  return (
    <div style={{ background: '#111', color: '#eee', minHeight: '100vh', padding: '2rem' }}>
      <NavBar />
      <h2 style={{ color: '#C0C0C0' }}>Unified Dashboard</h2>
      <Bar data={fleetData} />
      <Line data={financeData} />
      <p style={{ marginTop: '2rem' }}>Welcome {session?.user?.email || 'Demo User'}!</p>
    </div>
  );
}
