interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  balance: number | null;
  credit_approved: boolean | null;
}

interface Props {
  customers: Customer[];
  isAdmin: boolean;
}

export default function CustomerList({ customers, isAdmin }: Props) {
  const handleApprove = async (id: string, name: string) => {
    if (!confirm(`Approve credit line for ${name}?`)) return;
    const res = await fetch(`/api/customers/${id}/credit`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: true }),
    });
    if (res.ok) {
      alert('Credit approved!');
      window.location.reload();
    } else {
      alert('Error: ' + (await res.json()).error || 'Unknown');
    }
  };

  const handleAdjustBalance = async (id: string, name: string, current: number | null) => {
    const amountStr = prompt(`Adjust balance for ${name} (current: $${current?.toFixed(2) || '0.00'})\nEnter amount to add (negative to subtract):`);
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) return alert('Invalid amount');

    const res = await fetch(`/api/customers/${id}/balance`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adjustment: amount }),
    });
    if (res.ok) {
      alert('Balance updated!');
      window.location.reload();
    } else {
      alert('Error: ' + (await res.json()).error || 'Unknown');
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl shadow-md border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Phone</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Address</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Balance</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Credit</th>
            {isAdmin && <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {customers.map((cust) => (
            <tr key={cust.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 font-medium text-gray-900">{cust.name}</td>
              <td className="px-6 py-4 text-gray-600">{cust.phone || '—'}</td>
              <td className="px-6 py-4 text-gray-600">{cust.address || '—'}</td>
              <td className="px-6 py-4">
                {cust.balance !== null ? (
                  <span className={cust.balance >= 0 ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                    ${cust.balance.toFixed(2)}
                  </span>
                ) : '—'}
              </td>
              <td className="px-6 py-4">
                {cust.credit_approved ? (
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Approved</span>
                ) : (
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                )}
              </td>
              {isAdmin && (
                <td className="px-6 py-4 text-sm space-x-3">
                  {!cust.credit_approved && (
                    <button
                      onClick={() => handleApprove(cust.id, cust.name)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md text-sm transition"
                    >
                      Approve Credit
                    </button>
                  )}
                  <button
                    onClick={() => handleAdjustBalance(cust.id, cust.name, cust.balance)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm transition"
                  >
                    Adjust Balance
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
