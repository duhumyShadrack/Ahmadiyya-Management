interface Order {
  id: string;
  status: string;
  amount?: number;
  description?: string;
  created_at: string;
  pickup_address?: string;
  delivery_address?: string;
  customer?: {
    name: string;
    phone: string | null;
    address: string | null;
    balance: number | null;
    credit_approved: boolean | null;
  };
  driver_id?: string | null; // current assigned driver (if any)
}

interface Driver {
  id: string;
  email: string; // or add full_name if you have it in profiles
}

interface OrdersTableProps {
  orders: Order[];
  drivers: Driver[]; // passed from dashboard
  isAdmin: boolean;
}

export default function OrdersTable({ orders, drivers, isAdmin }: OrdersTableProps) {
  const handleAssignDriver = async (orderId: string, driverId: string) => {
    if (!confirm('Assign this driver to the order?')) return;

    try {
      const response = await fetch(`/api/orders/${orderId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: driverId || null }), // null to unassign
      });

      if (response.ok) {
        alert('Driver assigned successfully!');
        // For immediate UI refresh without realtime: reload page
        window.location.reload();
        // Better: use router.refresh() if you switch to client component
      } else {
        const errData = await response.json();
        alert(`Failed: ${errData.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert('Network error while assigning driver');
      console.error(err);
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            {isAdmin && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assign Driver</th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {order.customer?.name || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {order.customer?.phone || '—'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {order.customer?.address || '—'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {order.customer?.balance !== null ? (
                  <span className={order.customer.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ${order.customer.balance.toFixed(2)}
                  </span>
                ) : '—'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {order.customer?.credit_approved ? (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Approved
                  </span>
                ) : (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm capitalize text-gray-700">
                {order.status}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(order.created_at).toLocaleDateString()}
              </td>

              {isAdmin && (
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <select
                    value={order.driver_id || ''}
                    onChange={(e) => handleAssignDriver(order.id, e.target.value)}
                    className="border border-gray-300 rounded-md p-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {drivers.length === 0 ? (
                      <option disabled>No drivers available</option>
                    ) : (
                      drivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.email}
                        </option>
                      ))
                    )}
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
