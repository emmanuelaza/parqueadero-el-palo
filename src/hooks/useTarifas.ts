import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import type { Tarifa, TarifaTipo, TarifasMap } from '../types'

export function useTarifas() {
  const [tarifas, setTarifas] = useState<Tarifa[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from('tarifas')
      .select('*')
      .order('tipo')

    if (error) {
      toast.error('Error cargando tarifas')
      return
    }
    setTarifas(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    cargar()

    const channel = supabase
      .channel('tarifas-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tarifas' }, cargar)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [cargar])

  const actualizar = async (id: string, monto: number) => {
    const { error } = await supabase
      .from('tarifas')
      .update({ monto, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      toast.error('Error guardando tarifa')
      return false
    }
    toast.success('Tarifa actualizada')
    await cargar()
    return true
  }

  const tarifasMap: TarifasMap = {
    hora:         tarifas.find(t => t.tipo === 'hora')?.monto        ?? 2000,
    dia:          tarifas.find(t => t.tipo === 'dia')?.monto         ?? 8000,
    mensualidad:  tarifas.find(t => t.tipo === 'mensualidad')?.monto ?? 80000,
  }

  const getTarifa = (tipo: TarifaTipo): Tarifa | undefined =>
    tarifas.find(t => t.tipo === tipo)

  return { tarifas, tarifasMap, getTarifa, loading, actualizar, recargar: cargar }
}
