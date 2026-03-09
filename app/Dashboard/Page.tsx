// Inside loadData async function

let ordQuery = supabase
  .from('orders')
  .select(`
    id, status, amount, description, created_at, pickup_address, delivery_address,
    customer:customers (id, name, phone, address, balance, credit_approved),
    driver_id
  `)
  .order('created_at', { ascending: false });

// Role-based filtering
if (isAdmin) {
  // admins see all
} else if (isDriver) {
  ordQuery = ordQuery.eq('driver_id', user.id);
} else if (customerId) {
  ordQuery = ordQuery.eq('customer_id', customerId);
}

const { data: ords } = await ordQuery;
if (isMounted) setOrders(ords || []);
