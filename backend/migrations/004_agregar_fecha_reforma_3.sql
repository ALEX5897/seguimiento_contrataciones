-- Agregar columna fecha_reforma_3 a las tablas subtareas y subtareas_etapas
ALTER TABLE subtareas
  ADD COLUMN IF NOT EXISTS fecha_reforma_3 DATE NULL AFTER updated_at;

ALTER TABLE subtareas_etapas
  ADD COLUMN IF NOT EXISTS fecha_reforma_3 DATE NULL AFTER fecha_reforma;
