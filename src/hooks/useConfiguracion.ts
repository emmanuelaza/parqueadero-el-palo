import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { TOTAL_ESPACIOS, PARKING_NAME } from '../lib/helpers'

export interface ConfiguracionState {
  nombreParqueadero: string
  totalEspacios: number
  alertaHoras: number
  loading: boolean
  actualizarConfig: (clave: string, valor: string) => Promise<boolean>
  recargar: () => void
}

const DEFAULTS = {
  nombreParqueadero: PARKING_NAME,
  totalEspacios:     TOTAL_ESPACIOS,
  alertaHoras:       8,
}

export function useConfiguracion(): ConfiguracionState {
  const [nombreParqueadero, setNombre]   = useState(DEFAULTS.nombreParqueadero)
  const [totalEspacios,     setEspacios] = useState(DEFAULTS.totalEspacios)
  const [alertaHoras,       setAlerta]   = useState(DEFAULTS.alertaHoras)
  const [loading,           setLoading]  = useState(true)

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from('configuracion')
      .select('clave, valor')

    if (error) {
      // Tabla puede no existir aún (schema_v2.sql pendiente) — usar defaults
      setLoading(false)
      return
    }

    const map: Record<string, string> = {}
    for (const row of data ?? []) map[row.clave] = row.valor

    if (map.nombre_parqueadero) setNombre(map.nombre_parqueadero)
    if (map.total_espacios)     setEspacios(Number(map.total_espacios))
    if (map.alerta_horas)       setAlerta(Number(map.alerta_horas))

    setLoading(false)
  }, [])

  useEffect(() => {
    cargar()

    const channel = supabase
      .channel('config-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracion' }, cargar)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [cargar])

  const actualizarConfig = async (clave: string, valor: string): Promise<boolean> => {
    const { error } = await supabase
      .from('configuracion')
      .upsert(
        { clave, valor, updated_at: new Date().toISOString() },
        { onConflict: 'clave' },
      )

    if (error) {
      toast.error('Error guardando configuración')
      return false
    }
    return true
  }

  return {
    nombreParqueadero,
    totalEspacios,
    alertaHoras,
    loading,
    actualizarConfig,
    recargar: cargar,
  }
}
