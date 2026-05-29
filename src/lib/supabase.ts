import { createClient } from '@supabase/supabase-js'
import type { Moto, Tarifa, CajaDiaria, Horario } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

// Typed table helpers
export type Tables = {
  motos: Moto
  tarifas: Tarifa
  caja_diaria: CajaDiaria
  horarios: Horario
}
