-- ============================================================
-- El Palo Parking — Schema v2 (mejoras)
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================

-- ----------------------------------------------------------------
-- 1. NUEVAS COLUMNAS EN MOTOS
-- ----------------------------------------------------------------
ALTER TABLE motos ADD COLUMN IF NOT EXISTS notas text;
ALTER TABLE motos ADD COLUMN IF NOT EXISTS fecha_vencimiento date;

-- ----------------------------------------------------------------
-- 2. TABLA: configuracion
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracion (
  id          uuid primary key default uuid_generate_v4(),
  clave       text not null unique,
  valor       text not null,
  descripcion text,
  updated_at  timestamptz default now()
);

ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden leer configuracion"
  ON configuracion FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados pueden actualizar configuracion"
  ON configuracion FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Autenticados pueden insertar configuracion"
  ON configuracion FOR INSERT TO authenticated WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE configuracion;

-- Datos iniciales
INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('nombre_parqueadero', 'El Palo Parking',  'Nombre del parqueadero'),
  ('total_espacios',     '30',               'Número total de espacios'),
  ('alerta_horas',       '8',                'Horas para alerta de moto abandonada')
ON CONFLICT (clave) DO NOTHING;

-- ----------------------------------------------------------------
-- 3. TABLA: caja_cierres
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS caja_cierres (
  id              uuid primary key default uuid_generate_v4(),
  fecha           date not null unique,
  total_ingresos  numeric default 0,
  total_motos     integer default 0,
  cerrado_por     text,
  cerrado_at      timestamptz default now(),
  notas           text
);

ALTER TABLE caja_cierres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados pueden operar caja_cierres"
  ON caja_cierres FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------
-- 4. TRIGGER ACTUALIZADO: excluir salidas de mensualidad
-- (mensualistas pagan en la entrada, no en la salida)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_actualizar_caja_diaria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.hora_salida IS NOT NULL AND OLD.hora_salida IS NULL THEN
    -- Mensualistas ya pagaron al entrar → no contar la salida
    IF NEW.tipo != 'mensualidad' THEN
      INSERT INTO caja_diaria (fecha, total_ingresos, total_motos)
      VALUES (
        (NEW.hora_salida AT TIME ZONE 'America/Bogota')::date,
        COALESCE(NEW.monto_cobrado, 0),
        1
      )
      ON CONFLICT (fecha) DO UPDATE
      SET
        total_ingresos = caja_diaria.total_ingresos + COALESCE(NEW.monto_cobrado, 0),
        total_motos    = caja_diaria.total_motos + 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------
-- 5. NUEVO TRIGGER: cobro de mensualidad en la ENTRADA
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_mensualidad_entrada_caja()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo = 'mensualidad' AND NEW.pagado = TRUE AND COALESCE(NEW.monto_cobrado, 0) > 0 THEN
    INSERT INTO caja_diaria (fecha, total_ingresos, total_motos)
    VALUES (
      (NOW() AT TIME ZONE 'America/Bogota')::date,
      NEW.monto_cobrado,
      1
    )
    ON CONFLICT (fecha) DO UPDATE
    SET
      total_ingresos = caja_diaria.total_ingresos + NEW.monto_cobrado,
      total_motos    = caja_diaria.total_motos + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mensualidad_entrada_caja ON motos;
CREATE TRIGGER trg_mensualidad_entrada_caja
  AFTER INSERT ON motos
  FOR EACH ROW EXECUTE FUNCTION fn_mensualidad_entrada_caja();

-- ----------------------------------------------------------------
-- 6. RPC: actualizar caja manualmente (usado para renovar mensualidad)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION actualizar_caja_manual(p_monto NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO caja_diaria (fecha, total_ingresos, total_motos)
  VALUES ((NOW() AT TIME ZONE 'America/Bogota')::date, p_monto, 1)
  ON CONFLICT (fecha) DO UPDATE
  SET
    total_ingresos = caja_diaria.total_ingresos + p_monto,
    total_motos    = caja_diaria.total_motos + 1;
END;
$$;

-- ----------------------------------------------------------------
-- COMENTARIOS
-- ----------------------------------------------------------------
COMMENT ON TABLE configuracion IS 'Parámetros editables del sistema';
COMMENT ON TABLE caja_cierres  IS 'Registro de cierres diarios de caja';
COMMENT ON COLUMN motos.notas            IS 'Notas internas sobre la moto/cliente';
COMMENT ON COLUMN motos.fecha_vencimiento IS 'Fecha de vencimiento para mensualidades';
