import { createClient } from '@supabase/supabase-js'
import type { Moto, Tarifa, CajaDiaria, Horario } from '../types'

const supabaseUrl     = (import.meta.env.VITE_SUPABASE_URL     ?? '') as string
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '') as string

export const supabaseConfigOk = !!(supabaseUrl && supabaseAnonKey)

if (!supabaseConfigOk) {
  console.error(
    '⚠️  Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Copia .env.example → .env.local con las credenciales reales.',
  )
}

// Create client with safe fallbacks so the module load doesn't crash the whole app.
// The UI checks supabaseConfigOk to display a helpful error screen.
export const supabase = createClient(
  supabaseUrl     || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  { realtime: { params: { eventsPerSecond: 10 } } },
)

// Typed table helpers
export type Tables = {
  motos:        Moto
  tarifas:      Tarifa
  caja_diaria:  CajaDiaria
  horarios:     Horario
}
