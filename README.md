# El Palo Parking — Sistema de Gestión

Sistema web completo para gestión de parqueadero de motos. Medellín, Colombia.

**Stack:** React + TypeScript + Tailwind CSS + Vite + Supabase + Vercel

---

## Requisitos previos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com) (gratuita)
- Cuenta en [Vercel](https://vercel.com) (gratuita)

---

## Setup paso a paso

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd el-palo-parking
npm install
```

### 2. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → **New project**
2. Elige nombre, contraseña de BD y región **South America (São Paulo)** (la más cercana a Colombia)
3. Espera a que el proyecto se inicialice (~2 min)

### 3. Ejecutar el schema SQL

1. En el dashboard de Supabase: **SQL Editor** → **New query**
2. Pega el contenido de `supabase/schema.sql`
3. Click **Run** (▶)

Esto crea todas las tablas, el trigger de caja diaria, las políticas RLS y los datos iniciales.

### 4. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` con los valores de tu proyecto Supabase:
- **VITE_SUPABASE_URL** → Project Settings → API → Project URL
- **VITE_SUPABASE_ANON_KEY** → Project Settings → API → anon/public key

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_TOTAL_ESPACIOS=30
VITE_PARKING_NAME=El Palo Parking
VITE_PARKING_CIUDAD=Medellín, Colombia
```

### 5. Crear usuario administrador

1. En Supabase: **Authentication** → **Users** → **Add user**
2. Ingresa el correo y contraseña del administrador
3. Guarda las credenciales en un lugar seguro

### 6. Habilitar Realtime

En Supabase: **Database** → **Replication** → habilita la tabla `motos` (si el script SQL no lo hizo automáticamente).

### 7. Correr en desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

---

## Deploy en Vercel

### Opción A — Desde CLI

```bash
npm install -g vercel
vercel --prod
```

Sigue el wizard y agrega las variables de entorno cuando lo pida.

### Opción B — Desde GitHub

1. Sube el repo a GitHub
2. En Vercel: **New Project** → importa el repo
3. Framework: **Vite**
4. En **Environment Variables**, agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**

El archivo `vercel.json` ya está configurado para SPA routing.

---

## Estructura del proyecto

```
src/
├── components/
│   ├── CajaDelDia.tsx     # Resumen del día y movimientos
│   ├── EntradaModal.tsx   # Modal registro de entrada
│   ├── Historial.tsx      # Tabla histórica con filtros y CSV
│   ├── Horarios.tsx       # Editar horarios por día
│   ├── Layout.tsx         # Sidebar + navegación
│   ├── ParkingGrid.tsx    # Grid de espacios en tiempo real
│   ├── SalidaModal.tsx    # Modal cobro y salida
│   └── Tarifas.tsx        # Editar tarifas
├── hooks/
│   ├── useParking.ts      # Estado del parqueadero + realtime
│   └── useTarifas.ts      # Tarifas con realtime
├── lib/
│   ├── helpers.ts         # Cálculos, formateo, CSV
│   └── supabase.ts        # Cliente Supabase
├── pages/
│   ├── Configuracion.tsx  # Página configuración admin
│   ├── Dashboard.tsx      # Página principal (operación)
│   └── Login.tsx          # Autenticación
└── types/
    └── index.ts           # TypeScript interfaces
supabase/
└── schema.sql             # SQL completo para ejecutar en Supabase
```

---

## Personalización del branding

Edita las variables CSS en `src/index.css`:

```css
:root {
  --brand-accent:       #f97316;  /* ← Color acento (naranja) */
  --brand-primary:      #1e293b;  /* ← Fondo sidebar */
}
```

Cambia `#f97316` por el color del cliente cuando llegue el logo.

---

## Lógica de cobro

| Tipo         | Cálculo                                                    |
|:-------------|:-----------------------------------------------------------|
| **Hora**     | `ceil(horas)` × tarifa/hora. Fracción = hora completa. Mínimo 1h. |
| **Día**      | Tarifa plana por día                                       |
| **Mensualidad** | Tarifa plana mensual                                    |

---

## Funcionalidades

- **Grid en tiempo real** — 30 espacios, actualización vía Supabase Realtime
- **Registro entrada** — placa (req.), propietario, teléfono, tipo de tarifa
- **Registro salida y cobro** — tiempo y monto calculados automáticamente
- **Impresión de recibo** — ventana nueva optimizada para impresora térmica 80mm
- **Caja del día** — totales, desglose por tipo, listado de movimientos
- **Historial** — filtros por placa/tipo/fecha, exportar CSV
- **Configuración** — editar tarifas y horarios en tiempo real
- **Autenticación** — Supabase Auth (un admin)
- **Trigger automático** — caja_diaria se actualiza al registrar cada salida

---

## Problemas comunes

**"Faltan variables de entorno"**  
→ Verifica que el archivo `.env.local` existe y tiene los valores correctos.

**El grid no se actualiza en tiempo real**  
→ En Supabase Dashboard, verifica que Realtime esté habilitado para la tabla `motos` (Database → Replication).

**No puedo iniciar sesión**  
→ Crea el usuario desde Supabase Dashboard → Authentication → Users.

**Error al ejecutar el schema: "type tarifa_tipo already exists"**  
→ El schema usa `if not exists` donde es posible. Si hay conflicto, ejecuta solo la parte que faltó.
