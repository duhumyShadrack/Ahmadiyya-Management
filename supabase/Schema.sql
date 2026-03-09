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

-- Time clock entries (punch in/out history with location proof)
create table time_clock_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  type text not null check (type in ('in', 'out')), -- punch in or out
  timestamp timestamptz default now() not null,
  latitude numeric not null,
  longitude numeric not null,
  accuracy numeric, -- meters, from geolocation.coords.accuracy
  job_site_id uuid references job_sites(id), -- optional: link to specific job
  notes text,
  created_at timestamptz default now()
);

-- Optional: Job sites / geofences (for verification)
create table job_sites (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  latitude numeric not null,
  longitude numeric not null,
  radius_meters numeric default 100, -- allowed distance in meters
  address text
);

-- RLS for time_clock_entries
alter table time_clock_entries enable row level security;

-- Drivers see their own punches
create policy "Drivers view own punches"
  on time_clock_entries for select
  using (auth.uid() = user_id);

-- Drivers insert their own
create policy "Drivers punch in/out"
  on time_clock_entries for insert
  with check (auth.uid() = user_id);

-- Admins see all
create policy "Admins view all punches"
  on time_clock_entries for select
  using ((select role from profiles where id = auth.uid()) in ('admin', 'manager'));

-- Time clock entries with location proof
create table if not exists time_clock_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  type text not null check (type in ('in', 'out')),
  timestamp timestamptz default now() not null,
  latitude numeric not null,
  longitude numeric not null,
  accuracy numeric,                    -- from geolocation.coords.accuracy (meters)
  job_site_id uuid,                    -- optional foreign key
  notes text,
  created_at timestamptz default now()
);

-- Optional: predefined job sites / geofences
create table if not exists job_sites (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  latitude numeric not null,
  longitude numeric not null,
  radius_meters numeric default 100,
  address text,
  created_at timestamptz default now()
);

-- RLS
alter table time_clock_entries enable row level security;

create policy "Drivers view own time clock entries"
  on time_clock_entries for select
  using (auth.uid() = user_id);

create policy "Drivers can punch in/out"
  on time_clock_entries for insert
  with check (auth.uid() = user_id);

create policy "Admins/managers view all time clock entries"
  on time_clock_entries for select
  using ((select role from profiles where id = auth.uid()) in ('admin', 'manager'));

-- Indexes for performance
create index if not exists idx_time_clock_user_id on time_clock_entries(user_id);
create index if not exists idx_time_clock_timestamp on time_clock_entries(timestamp);

-- Insert a default office/job site (run once)
insert into job_sites (name, latitude, longitude, radius_meters, address)
values ('Main Office', 17.5046, -88.1962, 200, 'Belize City HQ');  -- adjust coords

create table fleet_vehicles (
  id uuid primary key default uuid_generate_v4(),
  name text not null, -- e.g., 'Truck #1'
  model text,
  year integer,
  mileage numeric default 0,
  last_maintenance timestamptz,
  assigned_driver_id uuid references profiles(id),
  created_at timestamptz default now()
);

create table fleet_maintenance (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid references fleet_vehicles(id) not null,
  type text not null, -- e.g., 'oil change', 'tire rotation'
  scheduled_date timestamptz not null,
  completed_date timestamptz,
  mileage_at_service numeric,
  notes text,
  cost numeric,
  created_at timestamptz default now()
);

-- RLS
alter table fleet_vehicles enable row level security;
alter table fleet_maintenance enable row level security;

-- Admins/managers view/add
create policy "Ops view fleet"
  on fleet_vehicles for all
  using ((select role from profiles where id = auth.uid()) in ('admin', 'manager'));
create policy "Ops view maintenance"
  on fleet_maintenance for all
  using ((select role from profiles where id = auth.uid()) in ('admin', '

  -- Job sites for geofence (already suggested, but confirm)
create table job_sites (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  latitude numeric not null,
  longitude numeric not null,
  radius_meters numeric default 100,
  address text,
  created_at timestamptz default now()
);

-- RLS: admins/managers view/add, drivers view
alter table job_sites enable row level security;

create policy "Ops manage job sites"
  on job_sites for all
  using ((select role from profiles where id = auth.uid()) in ('admin', 'manager'));

create policy "Drivers view job sites"
  on job_sites for select
  using ((select role from profiles where id = auth.uid()) = 'driver');

  -- Replace or extend 'orders' with generic 'tasks' or 'jobs'
alter table orders rename to jobs;

alter table jobs
  rename column description to details,
  rename column amount to price,
  add column service_type text default 'general',  -- e.g., delivery, cleaning, repair
  add column category text,                         -- e.g., plumbing, electrical
  add column scheduled_start timestamptz,
  add column scheduled_end timestamptz,
  add column priority integer default 0,
  add column estimated_duration_minutes integer;

-- Generic assignees (not just drivers)
alter table jobs add column assignee_id uuid references profiles(id);

-- Service catalog (for monetization & customization)
create table service_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,          -- "Delivery", "Home Cleaning", "Handyman Repair"
  description text,
  default_price numeric,
  estimated_duration_minutes integer,
  requires_vehicle boolean default false,
  requires_license boolean default false,
  created_at timestamptz default now()
);

-- Job sites / geofences remain generic (already good)
-- Time clock entries already generic (user_id + location + timestamp)
-- Fleet vehicles already generic

  create table service_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  default_price numeric,
  created_at timestamptz default now()
);

-- RLS: admins manage, others view
alter table service_types enable row level security;

create policy "Admin manage services"
  on service_types for all
  using ((select role from profiles where id = auth.uid()) = 'admin');

create policy "Others view services"
  on service_types for select
  using (true);

  create table invoices (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references jobs(id) not null,
  customer_id uuid references customers(id) not null,
  amount numeric not null,
  status text default 'pending' check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  due_date timestamptz not null,
  created_at timestamptz default now(),
  pdf_url text -- link to generated PDF in storage
);

 alter table invoices
  add column last_reminder_sent timestamptz,
  add column reminder_count integer default 0,
  add column collection_notes text,
  add column escalated_to_human boolean default false,
  add column whatsapp_thread_id text,   -- for WhatsApp conversation tracking
  add column last_communication_at timestamptz; 

  create table collection_logs (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references customers(id),
  invoice_id uuid references invoices(id),
  message text,
  channel text,
  needs_human boolean default false,
  created_at timestamptz default now()
);

  SELECT
  TO_CHAR(due_date, 'YYYY-MM') AS month,
  COUNT(*) AS total_invoices,
  COUNT(CASE WHEN status = 'paid' THEN 1 END) AS paid_invoices,
  ROUND((COUNT(CASE WHEN status = 'paid' THEN 1 END)::numeric / COUNT(*) * 100), 2) AS success_rate,
  SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS recovered_amount
FROM invoices
WHERE due_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY month
ORDER BY month DESC;
  
