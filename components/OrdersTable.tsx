'use client';

import { toast } from 'sonner';

interface Order {
  id: string;
  status: string;
  amount?: number | null;
  description?: string | null;
  created_at: string;
  pickup_address?: string | null;
  delivery_address?: string | null;
  customer?: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    balance: number | null;
    credit_approved: boolean | null;
  } | null;
  driver_id?: string | null;
}

interface Driver {
  id: string;
  email: string;
}

interface OrdersTableProps {
  orders: Order[];
  drivers: Driver[];
  isAdmin: boolean;
  isDriver?: boolean;
  currentUserId?: string;
}

export default function OrdersTable({
  orders,
  drivers = [],
  isAdmin = false,
  isDriver = false,
  currentUserId = '',
}: OrdersTableProps) {
  // ────────────────────────────────────────────────────────────────
  // Helper: Update order status (called by driver action buttons)
  // ────────────────────────────────────────────────────────────────
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!confirm(`Change status to "${newStatus}"?`)) return;

    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.ok) {
      toast.success(`Order marked as ${newStatus}`);
      // No manual refresh needed — realtime subscription in dashboard will update the UI
    } else {
      toast.error('Failed to update status');
    }
  };

  // ────────────────────────────────────────────────────────────────
  // Handler for admin assigning/unassigning a driver
  // ────────────────────────────────────────────────────────────────
  const handleAssignDriver = async (orderId: string, driverId: string) => {
    if (!confirm('Assign this driver to the order?')) return;

    try {
      const response = await fetch(`/api/orders/${orderId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: driverId || null }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to assign driver');
      }

      toast.success('Driver assigned successfully');
    } catch (err: any) {
      toast.error(err.message || 'Assignment failed');
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Customer</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Phone</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Address</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Balance</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Credit</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
            {isAdmin && (
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Assign Driver</th>
            )}
            {(isDriver || isAdmin) && (
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {order.customer?.name || '—'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {order.customer?.phone || '—'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {order.customer?.address || '—'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {order.customer?.balance != null ? (
                  <span className={order.customer.balance >= 0 ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                    ${order.customer.balance.toFixed(2)}
                  </span>
                ) : '—'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {order.customer?.credit_approved ? (
                  <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    Approved
                  </span>
                ) : (
                  <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm capitalize font-medium text-gray-800">
                {order.status}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {new Date(order.created_at).toLocaleDateString()}
              </td>

              {/* Admin: Assign driver dropdown */}
              {isAdmin && (
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <select
                    value={order.driver_id || ''}
                    onChange={(e) => handleAssignDriver(order.id, e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              {/* Driver: Status update buttons */}
              {isDriver && order.driver_id === currentUserId && (
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                  {order.status === 'assigned' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'in_progress')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-xs font-medium transition-colors shadow-sm"
                    >
                      Start Delivery
                    </button>
                  )}

                  {order.status === 'in_progress' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'delivered')}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-xs font-medium transition-colors shadow-sm"
                    >
                      Mark Delivered
                    </button>
                  )}

                  {['assigned', 'in_progress'].includes(order.status) && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-xs font-medium transition-colors shadow-sm"
                    >
                      Cancel
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
