import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { TOTAL_ESPACIOS, PARKING_NAME } from '../lib/helpers'

export interface ConfiguracionState {
  nombreParqueadero: string
  totalEspacios: number
  alertaHoras: number
  direccion: string
  horarioTexto: string
  operarioPorDefecto: string
  loading: boolean
  actualizarConfig: (clave: string, valor: string) => Promise<boolean>
  recargar: () => void
}

const DEFAULTS = {
  nombreParqueadero:   PARKING_NAME,
  totalEspacios:       TOTAL_ESPACIOS,
  alertaHoras:         8,
  direccion:           'Medellín, Colombia',
  horarioTexto:        '',
  operarioPorDefecto:  '',
}

export function useConfiguracion(): ConfiguracionState {
  const [nombreParqueadero,  setNombre]    = useState(DEFAULTS.nombreParqueadero)
  const [totalEspacios,      setEspacios]  = useState(DEFAULTS.totalEspacios)
  const [alertaHoras,        setAlerta]    = useState(DEFAULTS.alertaHoras)
  const [direccion,          setDireccion] = useState(DEFAULTS.direccion)
  const [horarioTexto,       setHorario]   = useState(DEFAULTS.horarioTexto)
  const [operarioPorDefecto, setOperario]  = useState(DEFAULTS.operarioPorDefecto)
  const [loading,            setLoading]   = useState(true)

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from('configuracion')
      .select('clave, valor')

    if (error) {
      setLoading(false)
      return
    }

    const map: Record<string, string> = {}
    for (const row of data ?? []) map[row.clave] = row.valor

    if (map.nombre_parqueadero) setNombre(map.nombre_parqueadero)
    if (map.total_espacios)     setEspacios(Number(map.total_espacios))
    if (map.alerta_horas)       setAlerta(Number(map.alerta_horas))
    if (map.direccion)          setDireccion(map.direccion)
    if (map.horario_texto)      setHorario(map.horario_texto)
    if (map.operario_defecto !== undefined) setOperario(map.operario_defecto)

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
    direccion,
    horarioTexto,
    operarioPorDefecto,
    loading,
    actualizarConfig,
    recargar: cargar,
  }
}
