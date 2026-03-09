import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import OrdersTable from '@/components/OrdersTable';
import CustomerList from '@/components/CustomerList';

export default async function Dashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch orders + customers (server-side for speed)
  const { data: orders } = await supabase
    .from('orders')
    .select('*, customer:customers(name, phone, address, balance, credit_approved)')
    .order('created_at', { ascending: false });

  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, phone, address, balance, credit_approved')
    .order('name');

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl mb-4">Recent Orders</h2>
          <OrdersTable orders={orders ?? []} />
        </div>
        
        <div>
          <h2 className="text-2xl mb-4">Customers</h2>
          <CustomerList customers={customers ?? []} />
        </div>
      </div>
    </div>
  );
}
