import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import OrdersTable from '@/components/OrdersTable';
import CustomerList from '@/components/CustomerList';

export const dynamic = 'force-dynamic'; // Ensure fresh data on each load

export default async function Dashboard() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get role from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';

  // Find linked customer for filtering (customers see own orders)
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('email', user.email ?? '')
    .maybeSingle();

  // Orders fetch
  let query = supabase
    .from('orders')
    .select(`
      id,
      status,
      amount,
      description,
      created_at,
      pickup_address,
      delivery_address,
      customer:customers (
        id,
        name,
        phone,
        address,
        balance,
        credit_approved
      )
    `)
    .order('created_at', { ascending: false });

  if (!isAdmin && customer?.id) {
    query = query.eq('customer_id', customer.id);
  }

  const { data: orders = [] } = await query;

  // Customers fetch – only for admins
  let customers = [];
  if (isAdmin) {
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, address, balance, credit_approved')
      .order('name');
    customers = data ?? [];
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">
            {isAdmin ? 'Admin Dashboard' : 'Your Dashboard'}
          </h1>
          <a
            href="/orders/new"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium shadow-sm transition-colors"
          >
            + New Order
          </a>
        </div>

        {/* Orders */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-10">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {isAdmin ? 'All Orders' : 'Your Orders'}
            </h2>
          </div>
          {orders.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {isAdmin ? 'No orders in the system yet.' : 'You haven’t placed any orders.'}
              <br />
              Click "New Order" to get started.
            </div>
          ) : (
            <OrdersTable orders={orders} />
          )}
        </div>

        {/* Customers – admin only */}
        {isAdmin && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Customers</h2>
            </div>
            {customers.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                No customers added yet.
              </div>
            ) : (
              <CustomerList customers={customers} isAdmin={true} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
