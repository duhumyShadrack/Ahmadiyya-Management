import NavBar from '../components/NavBar';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  // Dummy fleet data
  const fleetData = {
    labels: ['Vehicle A', 'Vehicle B', 'Vehicle C', 'Vehicle D'],
    datasets: [
      {
        label: 'Mileage (km)',
        data: [12000, 8000, 15000, 6000],
        backgroundColor: '#6A0DAD'
      }
    ]
  };

  // Dummy finance data
  const financeData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr'],
    datasets: [
      {
        label: 'Transactions ($)',
        data: [20000, 30000, 25000, 40000],
        borderColor: '#C0C0C0',
        backgroundColor: 'rgba(192,192,192,0.2)',
        fill: true
      }
    ]
  };

  return (
    <div style={{ background: '#111', color: '#eee', minHeight: '100vh', padding: '2rem' }}>
      <NavBar />
      <h2 style={{ color: '#C0C0C0' }}>Unified Dashboard</h2>

      <div style={{ margin: '2rem 0' }}>
        <h3>Fleet Status</h3>
        <Bar data={fleetData} />
      </div>

      <div style={{ margin: '2rem 0' }}>
        <h3>Finance Overview</h3>
        <Line data={financeData} />
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3>Quick Stats</h3>
        <ul>
          <li>Fleet: 12 vehicles active</li>
          <li>Finance: $120k transactions this month</li>
          <li>Inventory: 3 items below threshold</li>
          <li>AI Alerts: 2 anomalies detected</li>
        </ul>
      </div>
    </div>
  );
}
