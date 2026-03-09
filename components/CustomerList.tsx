interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  balance: number | null;
  credit_approved: boolean | null;
}

interface CustomerListProps {
  customers: Customer[];
  isAdmin?: boolean; // passed from dashboard
}

export default function CustomerList({ customers, isAdmin = false }: CustomerListProps) {
  const handleApproveCredit = async (customerId: string, name: string) => {
    if (!confirm(`Approve credit line for ${name}?`)) return;

    try {
      const response = await fetch(`/api/customers/${customerId}/credit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true }),
      });

      if (response.ok) {
        alert('Credit approved successfully!');
        window.location.reload(); // Simple refresh – use router.refresh() in future
      } else {
        const err = await response.json();
        alert('Failed to approve: ' + (err.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Network error while approving credit');
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Status</th>
            {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {customers.map((customer) => (
            <tr key={customer.id} className="hover:bg-gray-50 transition">
              <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{customer.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-500">{customer.phone || '—'}</td>
              <td className="px-6 py-4 text-gray-500">{customer.address || '—'}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                {customer.balance != null ? (
                  <span className={customer.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ${customer.balance.toFixed(2)}
                  </span>
                ) : '—'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {customer.credit_approved ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Approved
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                )}
              </td>
              {isAdmin && (
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {!customer.credit_approved && (
                    <button
                      onClick={() => handleApproveCredit(customer.id, customer.name)}
                      className="text-white bg-yellow-500 hover:bg-yellow-600 px-3 py-1.5 rounded text-sm font-medium transition"
                    >
                      Approve Credit
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
