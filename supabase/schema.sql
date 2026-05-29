-- ============================================================
-- El Palo Parking — Supabase Schema
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- Extensión UUID
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------
-- TIPOS ENUMERADOS
-- ----------------------------------------------------------------
create type tarifa_tipo as enum ('hora', 'dia', 'mensualidad');

-- ----------------------------------------------------------------
-- TABLA: tarifas
-- ----------------------------------------------------------------
create table if not exists tarifas (
  id           uuid primary key default uuid_generate_v4(),
  tipo         tarifa_tipo not null unique,
  monto        numeric not null check (monto >= 0),
  descripcion  text,
  activo       boolean default true,
  updated_at   timestamptz default now()
);

-- ----------------------------------------------------------------
-- TABLA: motos
-- ----------------------------------------------------------------
create table if not exists motos (
  id             uuid primary key default uuid_generate_v4(),
  placa          text not null,
  propietario    text,
  telefono       text,
  tipo           tarifa_tipo not null,
  espacio        integer check (espacio between 1 and 50),
  hora_entrada   timestamptz not null default now(),
  hora_salida    timestamptz,
  monto_cobrado  numeric,
  pagado         boolean default false,
  created_at     timestamptz default now()
);

create index if not exists idx_motos_hora_salida on motos (hora_salida);
create index if not exists idx_motos_espacio on motos (espacio) where hora_salida is null;
create index if not exists idx_motos_created_at on motos (created_at desc);
create index if not exists idx_motos_placa on motos (placa);

-- ----------------------------------------------------------------
-- TABLA: caja_diaria
-- ----------------------------------------------------------------
create table if not exists caja_diaria (
  id              uuid primary key default uuid_generate_v4(),
  fecha           date not null unique,
  total_ingresos  numeric default 0,
  total_motos     integer default 0,
  created_at      timestamptz default now()
);

-- ----------------------------------------------------------------
-- TABLA: horarios
-- ----------------------------------------------------------------
create table if not exists horarios (
  id             uuid primary key default uuid_generate_v4(),
  dia_semana     integer not null unique check (dia_semana between 0 and 6),
  hora_apertura  time not null,
  hora_cierre    time not null,
  activo         boolean default true
);

-- ----------------------------------------------------------------
-- TRIGGER: actualizar caja_diaria cuando sale una moto
-- ----------------------------------------------------------------
create or replace function fn_actualizar_caja_diaria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo cuando hora_salida pasa de NULL a un valor (primera vez)
  if new.hora_salida is not null and old.hora_salida is null then
    insert into caja_diaria (fecha, total_ingresos, total_motos)
    values (
      (new.hora_salida at time zone 'America/Bogota')::date,
      coalesce(new.monto_cobrado, 0),
      1
    )
    on conflict (fecha) do update
    set
      total_ingresos = caja_diaria.total_ingresos + coalesce(new.monto_cobrado, 0),
      total_motos    = caja_diaria.total_motos + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_actualizar_caja_diaria on motos;
create trigger trg_actualizar_caja_diaria
  after update on motos
  for each row execute function fn_actualizar_caja_diaria();

-- ----------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------
alter table tarifas    enable row level security;
alter table motos      enable row level security;
alter table caja_diaria enable row level security;
alter table horarios   enable row level security;

-- Authenticated users can do everything
create policy "auth_all_tarifas"
  on tarifas for all to authenticated
  using (true) with check (true);

create policy "auth_all_motos"
  on motos for all to authenticated
  using (true) with check (true);

create policy "auth_all_caja_diaria"
  on caja_diaria for all to authenticated
  using (true) with check (true);

create policy "auth_all_horarios"
  on horarios for all to authenticated
  using (true) with check (true);

-- ----------------------------------------------------------------
-- REALTIME — habilitar para el grid en tiempo real
-- ----------------------------------------------------------------
alter publication supabase_realtime add table motos;
alter publication supabase_realtime add table tarifas;

-- ----------------------------------------------------------------
-- DATOS INICIALES
-- ----------------------------------------------------------------

-- Tarifas (montos en COP)
insert into tarifas (tipo, monto, descripcion) values
  ('hora',         2000,  'Tarifa por hora — fracción se cobra como hora completa'),
  ('dia',          8000,  'Tarifa por día'),
  ('mensualidad',  80000, 'Mensualidad — acceso ilimitado por mes')
on conflict (tipo) do nothing;

-- Horarios por defecto (Colombia: Bogotá/Medellín)
insert into horarios (dia_semana, hora_apertura, hora_cierre, activo) values
  (0, '08:00', '18:00', true),  -- Domingo
  (1, '06:00', '22:00', true),  -- Lunes
  (2, '06:00', '22:00', true),  -- Martes
  (3, '06:00', '22:00', true),  -- Miércoles
  (4, '06:00', '22:00', true),  -- Jueves
  (5, '06:00', '22:00', true),  -- Viernes
  (6, '07:00', '20:00', true)   -- Sábado
on conflict (dia_semana) do nothing;

-- ----------------------------------------------------------------
-- COMENTARIOS
-- ----------------------------------------------------------------
comment on table motos is 'Registro de todas las motos — activas (hora_salida null) e históricas';
comment on table tarifas is 'Tarifas editables por el admin';
comment on table caja_diaria is 'Resumen diario de ingresos — actualizado por trigger';
comment on table horarios is 'Horario de apertura por día de la semana';
