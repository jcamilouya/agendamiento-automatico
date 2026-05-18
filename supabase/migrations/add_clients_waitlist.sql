-- Migración: tablas clients y waitlist para features anti no-show
-- Ejecutar en Supabase SQL Editor (una sola vez)

-- Tabla de clientes por negocio (agrupa historial y notas)
CREATE TABLE IF NOT EXISTS clients (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  email           TEXT,
  notes           TEXT,                     -- notas privadas del barbero
  visit_count     INTEGER DEFAULT 0,
  last_visit_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, phone)
);

-- Tabla de lista de espera
CREATE TABLE IF NOT EXISTS waitlist (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id         UUID REFERENCES businesses(id),
  stylist_id          UUID REFERENCES stylists(id),
  service_id          UUID REFERENCES services(id),
  client_name         TEXT NOT NULL,
  client_phone        TEXT NOT NULL,
  preferred_date      DATE,
  preferred_time_from TEXT,
  preferred_time_to   TEXT,
  notified_at         TIMESTAMPTZ,
  status              TEXT DEFAULT 'waiting',  -- waiting|offered|booked|expired
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: dueño ve sus propios registros; inserción pública para el booking flow
ALTER TABLE clients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- clients: el dueño autenticado ve sus clientes
DROP POLICY IF EXISTS "Owner sees clients" ON clients;
CREATE POLICY "Owner sees clients" ON clients
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- waitlist: inserción pública (desde booking flow sin auth)
DROP POLICY IF EXISTS "Public insert waitlist" ON waitlist;
CREATE POLICY "Public insert waitlist" ON waitlist
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Owner sees waitlist" ON waitlist;
CREATE POLICY "Owner sees waitlist" ON waitlist
  FOR SELECT USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner updates waitlist" ON waitlist;
CREATE POLICY "Owner updates waitlist" ON waitlist
  FOR UPDATE USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- Trigger: cuando se inserta un appointment, actualiza o crea el registro en clients
CREATE OR REPLACE FUNCTION sync_client_from_appointment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO clients (business_id, name, phone, visit_count, last_visit_at)
  VALUES (NEW.business_id, NEW.client_name, NEW.client_phone, 1, NOW())
  ON CONFLICT (business_id, phone)
  DO UPDATE SET
    visit_count   = clients.visit_count + 1,
    last_visit_at = NOW(),
    name          = EXCLUDED.name;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_appointment_insert_sync_client ON appointments;
CREATE TRIGGER on_appointment_insert_sync_client
  AFTER INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION sync_client_from_appointment();
