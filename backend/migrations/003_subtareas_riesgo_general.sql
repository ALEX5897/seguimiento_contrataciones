ALTER TABLE subtareas
  ADD COLUMN IF NOT EXISTS proceso_en_riesgo TINYINT(1) NOT NULL DEFAULT 0 AFTER observaciones,
  ADD COLUMN IF NOT EXISTS riesgo_comentario TEXT NULL AFTER proceso_en_riesgo;
