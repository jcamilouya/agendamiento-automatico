-- Migración: columnas multi-negocio en businesses
-- Ejecutar en Supabase SQL Editor (una sola vez)

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'barbershop';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#00FF88';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Bogotá';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'trial';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days';

-- RLS: cada dueño solo ve y edita SU negocio
-- (el negocio demo turno-demo no tiene owner_id, así que las políticas existentes lo siguen leyendo)
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner sees own business" ON businesses;
CREATE POLICY "Owner sees own business"
  ON businesses FOR SELECT
  USING (owner_id = auth.uid() OR owner_id IS NULL);

DROP POLICY IF EXISTS "Owner inserts own business" ON businesses;
CREATE POLICY "Owner inserts own business"
  ON businesses FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owner updates own business" ON businesses;
CREATE POLICY "Owner updates own business"
  ON businesses FOR UPDATE
  USING (owner_id = auth.uid());
