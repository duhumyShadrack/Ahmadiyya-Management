interface Order {
  id: string;
  status: string;
  amount?: number;
  description?: string;
  created_at: string;
  customer: {
    name: string;
    phone: string;
    address: string;
    balance?: number;
    credit_approved?: boolean;
  };
}

export default function OrdersTable({ orders }: { orders: Order[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2">Customer</th>
            <th className="px-4 py-2">Phone</th>
            <th className="px-4 py-2">Address</th>
            <th className="px-4 py-2">Balance</th>
            <th className="px-4 py-2">Credit</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-t">
              <td className="px-4 py-2">{order.customer?.name || 'N/A'}</td>
              <td className="px-4 py-2">{order.customer?.phone || '-'}</td>
              <td className="px-4 py-2">{order.customer?.address || '-'}</td>
              <td className="px-4 py-2">
                {order.customer?.balance ? `$${order.customer.balance.toFixed(2)}` : '-'}
              </td>
              <td className="px-4 py-2">
                {order.customer?.credit_approved ? 'Yes' : 'No'}
              </td>
              <td className="px-4 py-2 capitalize">{order.status}</td>
              <td className="px-4 py-2">
                {new Date(order.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
