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
    if (!confirm(`Approve credit for ${name}? This cannot be undone easily.`)) return;

    const res = await fetch(`/api/customers/${id}/credit`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: true }),
    });

    if (res.ok) {
      alert('Credit approved!');
      window.location.reload(); // Refresh to show updated status (use router.refresh() for better UX later)
    } else {
      const { error } = await res.json();
      alert(`Error: ${error || 'Something went wrong'}`);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
            {isAdmin && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {customers.map((cust) => (
            <tr key={cust.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{cust.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-500">{cust.phone || '—'}</td>
              <td className="px-6 py-4 text-gray-500">{cust.address || '—'}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                {cust.balance !== null ? (
                  <span className={cust.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ${Math.abs(cust.balance).toFixed(2)}{cust.balance < 0 ? ' due' : ''}
                  </span>
                ) : '—'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {cust.credit_approved ? (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Approved
                  </span>
                ) : (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                )}
              </td>
              {isAdmin && (
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {!cust.credit_approved && (
                    <button
                      onClick={() => handleApprove(cust.id, cust.name)}
                      className="text-white bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-md text-sm transition-colors"
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
