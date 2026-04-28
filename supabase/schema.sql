-- TURNO — Schema completo
-- Pegar en: Supabase > SQL Editor > New query

-- Negocios (cada estética/barbería)
create table if not exists businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  phone       text,
  address     text,
  logo_url    text,
  description text,
  created_at  timestamptz default now()
);

-- Estilistas
create table if not exists stylists (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  name        text not null,
  photo_url   text,
  specialties text[],
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- Servicios
create table if not exists services (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid references businesses(id) on delete cascade,
  name             text not null,
  description      text,
  duration_minutes integer not null,
  price            numeric(10,2) not null,
  category         text,
  is_active        boolean default true,
  created_at       timestamptz default now()
);

-- Disponibilidad semanal por estilista
create table if not exists availability (
  id          uuid primary key default gen_random_uuid(),
  stylist_id  uuid references stylists(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6), -- 0=domingo
  start_time  time not null,
  end_time    time not null,
  is_active   boolean default true
);

-- Citas
create table if not exists appointments (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid references businesses(id) on delete cascade,
  stylist_id    uuid references stylists(id),
  service_id    uuid references services(id),
  client_name   text not null,
  client_phone  text not null,
  date          date not null,
  start_time    time not null,
  end_time      time not null,
  status        text default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  notes         text,
  reminder_sent boolean default false,
  review_sent   boolean default false,
  created_at    timestamptz default now()
);

-- Bloqueos de horario (almuerzo, vacaciones, etc.)
create table if not exists time_blocks (
  id         uuid primary key default gen_random_uuid(),
  stylist_id uuid references stylists(id) on delete cascade,
  date       date not null,
  start_time time not null,
  end_time   time not null,
  reason     text
);

-- RLS: habilitar para todas las tablas
alter table businesses   enable row level security;
alter table stylists     enable row level security;
alter table services     enable row level security;
alter table availability enable row level security;
alter table appointments enable row level security;
alter table time_blocks  enable row level security;

-- Políticas de lectura pública (el cliente puede ver todo sin auth)
create policy "lectura publica businesses"   on businesses   for select using (true);
create policy "lectura publica stylists"     on stylists     for select using (true);
create policy "lectura publica services"     on services     for select using (true);
create policy "lectura publica availability" on availability for select using (true);
create policy "lectura publica appointments" on appointments for select using (true);
create policy "lectura publica time_blocks"  on time_blocks  for select using (true);

-- El cliente puede insertar citas sin auth
create policy "insertar cita publica" on appointments for insert with check (true);

-- Datos de demo: negocio de prueba
insert into businesses (name, slug, phone, address, description)
values (
  'Barbería Turno Demo',
  'turno-demo',
  '+573001234567',
  'Calle 123 #45-67, Bogotá',
  'La barbería más elegante de la ciudad'
) on conflict (slug) do nothing;
