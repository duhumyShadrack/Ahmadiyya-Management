import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import OrdersTable from '@/components/OrdersTable';
import CustomerList from '@/components/CustomerList';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';

  // Get linked customer record (for non-admin filtering)
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('email', user.email ?? '')
    .maybeSingle();

  // Fetch orders
  let ordersQuery = supabase
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
    ordersQuery = ordersQuery.eq('customer_id', customer.id);
  }

  const { data: orders = [] } = await ordersQuery;

  // Fetch customers (admins only)
  let customers = [];
  if (isAdmin) {
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, address, balance, credit_approved')
      .order('name');
    customers = data ?? [];
  }

  // Fetch drivers (only needed if admin, but fetch anyway – can optimize later)
  const { data: drvs = [] } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('role', 'driver')
    .order('email');

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

        {/* Orders Section */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-10">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {isAdmin ? 'All Orders' : 'Your Orders'}
            </h2>
          </div>
          {orders.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {isAdmin ? 'No orders yet.' : 'You have no orders yet.'}
            </div>
          ) : (
            <OrdersTable 
              orders={orders} 
              drivers={drvs} 
              isAdmin={isAdmin} 
            />
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
                No customers registered yet.
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
