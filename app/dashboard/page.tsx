import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import OrdersTable from '@/components/OrdersTable';
import CustomerList from '@/components/CustomerList';

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch user profile for role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  // Fetch linked customer record (for filtering own orders)
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('email', user.email)
    .maybeSingle();

  // Orders query - admins see all, others see only their own
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

  // Customers - admins only
  let customers = [];
  if (isAdmin) {
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, address, balance, credit_approved')
      .order('name');
    customers = data ?? [];
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl md:text-4xl font-bold">
          {isAdmin ? 'Admin Dashboard' : 'My Orders & Dashboard'}
        </h1>
        <a
          href="/orders/new"
          className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-lg shadow transition"
        >
          + Place New Order
        </a>
      </div>

      {/* Orders Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">
          {isAdmin ? 'All Recent Orders' : 'Your Orders'}
        </h2>

        {orders.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
            No orders found yet. {isAdmin ? 'Start by creating some.' : 'Place your first order!'}
          </div>
        ) : (
          <OrdersTable orders={orders} />
        )}
      </section>

      {/* Customers Section - Admins only */}
      {isAdmin && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Customers & Credit Management</h2>

          {customers.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
              No customers registered yet.
            </div>
          ) : (
            <CustomerList customers={customers} isAdmin={isAdmin} />
          )}
        </section>
      )}
    </div>
  );
}
