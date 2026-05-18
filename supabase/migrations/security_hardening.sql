-- ════════════════════════════════════════════════════════════════
-- TURNO — Endurecimiento de seguridad pre-lanzamiento
-- Fecha: 2026-05-18
-- ════════════════════════════════════════════════════════════════

-- ── 1. APPOINTMENTS: cerrar SELECT público (PII filtrada) ───────
drop policy if exists "lectura publica appointments" on appointments;
drop policy if exists "owner read appointments"      on appointments;

create policy "owner read appointments"
  on appointments for select
  using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  );

create or replace view public_booked_slots as
select
  stylist_id,
  date,
  start_time,
  end_time,
  status
from appointments
where status in ('pending', 'confirmed');

grant select on public_booked_slots to anon, authenticated;

-- ── 2. APPOINTMENTS: validar INSERT + UPDATE solo dueño ─────────
drop policy if exists "insertar cita publica"          on appointments;
drop policy if exists "insertar cita publica validada" on appointments;
drop policy if exists "owner update appointments"      on appointments;

create policy "insertar cita publica validada"
  on appointments for insert
  with check (
    business_id is not null
    and stylist_id is not null
    and service_id is not null
    and date >= current_date
    and date <= current_date + interval '90 days'
    and length(client_name) between 2 and 80
    and length(client_phone) between 7 and 20
    and status in ('pending', 'confirmed')
  );

create policy "owner update appointments"
  on appointments for update
  using (business_id in (select id from businesses where owner_id = auth.uid()));

-- ── 3. STYLISTS ─────────────────────────────────────────────────
drop policy if exists "owner write stylists" on stylists;
create policy "owner write stylists"
  on stylists for all
  using (business_id in (select id from businesses where owner_id = auth.uid()))
  with check (business_id in (select id from businesses where owner_id = auth.uid()));

-- ── 4. SERVICES ─────────────────────────────────────────────────
drop policy if exists "owner write services" on services;
create policy "owner write services"
  on services for all
  using (business_id in (select id from businesses where owner_id = auth.uid()))
  with check (business_id in (select id from businesses where owner_id = auth.uid()));

-- ── 5. AVAILABILITY ─────────────────────────────────────────────
drop policy if exists "owner write availability" on availability;
create policy "owner write availability"
  on availability for all
  using (
    stylist_id in (
      select s.id from stylists s
      join businesses b on b.id = s.business_id
      where b.owner_id = auth.uid()
    )
  )
  with check (
    stylist_id in (
      select s.id from stylists s
      join businesses b on b.id = s.business_id
      where b.owner_id = auth.uid()
    )
  );

-- ── 6. TIME_BLOCKS ──────────────────────────────────────────────
drop policy if exists "owner write time_blocks" on time_blocks;
create policy "owner write time_blocks"
  on time_blocks for all
  using (
    stylist_id in (
      select s.id from stylists s
      join businesses b on b.id = s.business_id
      where b.owner_id = auth.uid()
    )
  )
  with check (
    stylist_id in (
      select s.id from stylists s
      join businesses b on b.id = s.business_id
      where b.owner_id = auth.uid()
    )
  );

-- ── 7. BUSINESSES: restringir bypass NULL solo al demo ──────────
drop policy if exists "Owner sees own business"    on businesses;
drop policy if exists "owner sees own business"    on businesses;
drop policy if exists "owner updates own business" on businesses;

create policy "owner sees own business"
  on businesses for select
  using (
    owner_id = auth.uid()
    or slug = 'turno-demo'
  );

create policy "owner updates own business"
  on businesses for update
  using (owner_id = auth.uid());

-- ── 8. WAITLIST ─────────────────────────────────────────────────
drop policy if exists "public insert waitlist"          on waitlist;
drop policy if exists "public insert waitlist validado" on waitlist;
drop policy if exists "owner read waitlist"             on waitlist;
drop policy if exists "owner update waitlist"           on waitlist;

create policy "public insert waitlist validado"
  on waitlist for insert
  with check (
    business_id is not null
    and length(client_name) between 2 and 80
    and length(client_phone) between 7 and 20
  );

create policy "owner read waitlist"
  on waitlist for select
  using (business_id in (select id from businesses where owner_id = auth.uid()));

create policy "owner update waitlist"
  on waitlist for update
  using (business_id in (select id from businesses where owner_id = auth.uid()));

-- ── 9. CLIENTS ──────────────────────────────────────────────────
drop policy if exists "owner all clients" on clients;
create policy "owner all clients"
  on clients for all
  using (business_id in (select id from businesses where owner_id = auth.uid()))
  with check (business_id in (select id from businesses where owner_id = auth.uid()));
