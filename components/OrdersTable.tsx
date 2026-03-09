// Add to Props: drivers: {id: string, name: string}[]
interface Props {
  orders: any[];
  drivers?: any[]; // fetch in dashboard: supabase.from('profiles').select('id, email').eq('role', 'driver')
  isAdmin?: boolean;
}

export default function OrdersTable({ orders, drivers = [], isAdmin = false }: Props) {
  const handleAssignDriver = async (orderId: string, driverId: string) => {
    const res = await fetch(`/api/orders/${orderId}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ driver_id: driverId }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) toast.success('Driver assigned!');
    else toast.error('Failed to assign');
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Phone</th>
            <th>Address</th>
            <th>Balance</th>
            <th>Credit</th>
            <th>Status</th>
            {isAdmin && <th>Assign Driver</th>}
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td>{order.customer?.name}</td>
              <td>{order.customer?.phone}</td>
              <td>{order.customer?.address}</td>
              <td>{order.customer?.balance ? `$${order.customer.balance.toFixed(2)}` : '-'}</td>
              <td>{order.customer?.credit_approved ? 'Yes' : 'No'}</td>
              <td>{order.status}</td>
              {isAdmin && (
                <td>
                  <select
                    onChange={(e) => handleAssignDriver(order.id, e.target.value)}
                    defaultValue={order.driver_id || ''}
                    className="border p-1 rounded"
                  >
                    <option value="">Unassigned</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.email || 'Driver'}</option>
                    ))}
                  </select>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
