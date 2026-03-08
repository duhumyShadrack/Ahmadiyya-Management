
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
