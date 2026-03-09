create table users(
id uuid primary key,
email text,
role text
);

create table customers(
id uuid primary key,
name text,
phone text,
address text
);

create table orders(
id uuid primary key,
customer_id uuid,
status text,
created_at timestamp default now()
);

create table vehicles(
id uuid primary key,
vehicle_name text,
plate_number text,
vin text,
make text,
model text,
year integer,
mileage integer,
status text,
assigned_driver uuid,
created_at timestamp default now()
);

create table vehicle_maintenance(
id uuid primary key,
vehicle_id uuid,
service_type text,
service_interval_miles integer,
service_interval_days integer,
last_service_date date,
next_service_date date
);

create table driver_locations(
id uuid primary key,
driver_id uuid,
latitude float,
longitude float,
created_at timestamp default now()
);

-- Add credit/balance fields (if not already there)
alter table public.customers
  add column if not exists balance numeric(10,2) default 0,
  add column if not exists credit_approved boolean default false;

-- Optional: index for faster searches
create index if not exists idx_customers_phone on public.customers(phone);

-- Clear existing data first (optional—skip if you want to keep real stuff)
delete from public.orders;
delete from public.customers;

-- Seed customers with balance & credit
insert into public.customers (name, phone, address, balance, credit_approved)
values 
  ('Aisha Rahman', '+1-555-0123', '123 Main St, Toronto, ON', 150.75, true),
  ('Omar Khalid', '+1-555-0456', '456 Elm Ave, Mississauga, ON', -45.00, false),
  ('Fatima Yusuf', '+1-555-0789', '789 Oak Rd, Brampton, ON', 0.00, true);

-- Seed orders linked to customers (using their IDs)
insert into public.orders (customer_id, status, amount, description, pickup_address, delivery_address)
values 
  ((select id from customers where name = 'Aisha Rahman'), 'delivered', 89.99, 'Groceries', '123 Main St', '789 Oak Rd'),
  ((select id from customers where name = 'Omar Khalid'), 'in_progress', 45.50, 'Medical supplies', '456 Elm Ave', 'Warehouse'),
  ((select id from customers where name = 'Fatima Yusuf'), 'pending', 120.00, 'Books & stationery', '789 Oak Rd', 'Library'),
  ((select id from customers where name = 'Aisha Rahman'), 'assigned', 200.00, 'Bulk order', '123 Main St', 'Storefront');

-- Optional: log in as admin and assign yourself as driver (for testing)
update public.profiles 
set role = 'admin' 
where email = 'your-email@here.com';  -- change to your actual email

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  type text default 'info' check (type in ('info', 'success', 'warning', 'error')),
  order_id uuid references orders(id) on delete set null,
  read boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table notifications enable row level security;

-- Policy: users see only their notifications
create policy "Users view own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "Users mark as read"
  on notifications for update
  using (auth.uid() = user_id);

-- Already in your schema.sql – just confirm
create table driver_locations (
  id uuid primary key default uuid_generate_v4(),
  driver_id uuid references profiles(id) not null,
  latitude numeric not null,
  longitude numeric not null,
  last_updated timestamptz default now()
);

-- RLS: drivers can only upsert their own row
alter table driver_locations enable row level security;

create policy "Drivers update own location"
  on driver_locations for all
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

-- Admins/drivers can read all (adjust as needed)
create policy "View locations"
  on driver_locations for select
  using (true);
