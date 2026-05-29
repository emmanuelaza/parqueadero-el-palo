-- =============================================================================
-- Schema v3 — tiquetes, métodos de pago, atendido por, config extra
-- Ejecutar en Supabase SQL Editor después de schema.sql + schema_v2.sql
-- =============================================================================

-- Tabla para contador secuencial de tiquetes
CREATE TABLE IF NOT EXISTS tiquetes_contador (
  id            integer PRIMARY KEY DEFAULT 1,
  ultimo_numero integer DEFAULT 0,
  CHECK (id = 1)
);

INSERT INTO tiquetes_contador (id, ultimo_numero)
  VALUES (1, 0)
  ON CONFLICT DO NOTHING;

ALTER TABLE tiquetes_contador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden operar tiquetes_contador"
  ON tiquetes_contador FOR ALL TO authenticated USING (true);

-- Nuevas columnas en motos
ALTER TABLE motos ADD COLUMN IF NOT EXISTS numero_tiquete integer;
ALTER TABLE motos ADD COLUMN IF NOT EXISTS metodo_pago    text CHECK (metodo_pago IN ('efectivo', 'transferencia'));
ALTER TABLE motos ADD COLUMN IF NOT EXISTS atendido_por   text;

-- Función atómica para siguiente tiquete
CREATE OR REPLACE FUNCTION siguiente_tiquete()
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  nuevo_numero integer;
BEGIN
  UPDATE tiquetes_contador
    SET ultimo_numero = ultimo_numero + 1
    WHERE id = 1
    RETURNING ultimo_numero INTO nuevo_numero;
  RETURN nuevo_numero;
END;
$$;

GRANT EXECUTE ON FUNCTION siguiente_tiquete() TO authenticated;

-- Nuevas claves de configuración
INSERT INTO configuracion (clave, valor, descripcion)
  VALUES
    ('direccion',        'Medellín, Colombia',  'Dirección visible en tiquetes'),
    ('horario_texto',    'Lun–Sáb 6am – 10pm', 'Horario de atención (texto libre)'),
    ('operario_defecto', '',                    'Nombre del operario por defecto')
  ON CONFLICT (clave) DO NOTHING;
