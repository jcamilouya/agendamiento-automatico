-- Seed de datos demo para TURNO
-- Correr en Supabase > SQL Editor después del schema.sql

-- Servicios
INSERT INTO services (business_id, name, description, duration_minutes, price, category)
VALUES
  ((SELECT id FROM businesses WHERE slug = 'turno-demo'), 'Corte de cabello',  'Corte clásico con tijera o máquina',          30, 25000, 'Cortes'),
  ((SELECT id FROM businesses WHERE slug = 'turno-demo'), 'Corte + barba',     'Corte completo más arreglo de barba',          45, 35000, 'Combos'),
  ((SELECT id FROM businesses WHERE slug = 'turno-demo'), 'Afeitado clásico',  'Afeitado con navaja y toalla caliente',        30, 20000, 'Barba'),
  ((SELECT id FROM businesses WHERE slug = 'turno-demo'), 'Corte de niño',     'Para menores de 12 años',                      20, 18000, 'Cortes');

-- Estilistas
INSERT INTO stylists (business_id, name, specialties)
VALUES
  ((SELECT id FROM businesses WHERE slug = 'turno-demo'), 'Carlos Mendez',   ARRAY['Barba', 'Corte clásico']),
  ((SELECT id FROM businesses WHERE slug = 'turno-demo'), 'Andrés López',    ARRAY['Degradados', 'Cortes modernos']),
  ((SELECT id FROM businesses WHERE slug = 'turno-demo'), 'Sofía Restrepo',  ARRAY['Colorimetría', 'Tratamientos']);

-- Disponibilidad lunes (1) a sábado (6), 9am-7pm
INSERT INTO availability (stylist_id, day_of_week, start_time, end_time)
SELECT s.id, dow, '09:00:00', '19:00:00'
FROM stylists s
CROSS JOIN generate_series(1, 6) AS dow
WHERE s.business_id = (SELECT id FROM businesses WHERE slug = 'turno-demo');
