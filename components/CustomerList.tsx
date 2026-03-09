interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  balance?: number;
  credit_approved?: boolean;
}

export default function CustomerList({ customers }: { customers: Customer[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Phone</th>
            <th className="px-4 py-2">Address</th>
            <th className="px-4 py-2">Balance</th>
            <th className="px-4 py-2">Credit Approved</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((cust) => (
            <tr key={cust.id} className="border-t">
              <td className="px-4 py-2">{cust.name}</td>
              <td className="px-4 py-2">{cust.phone || '-'}</td>
              <td className="px-4 py-2">{cust.address || '-'}</td>
              <td className="px-4 py-2">
                {cust.balance ? `$${cust.balance.toFixed(2)}` : '-'}
              </td>
              <td className="px-4 py-2">{cust.credit_approved ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
