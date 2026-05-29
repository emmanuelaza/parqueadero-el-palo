import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { TOTAL_ESPACIOS, formatCOP } from '../lib/helpers'
import type { Moto, EspacioParqueadero } from '../types'

export interface EntradaDatos {
  placa: string
  propietario?: string
  telefono?: string
  tipo: Moto['tipo']
  espacio: number
  notas?: string
  monto_cobrado?: number
  pagado?: boolean
  fecha_vencimiento?: string
}

export function useParking(totalEspacios: number = TOTAL_ESPACIOS) {
  const [motosActivas, setMotosActivas] = useState<Moto[]>([])
  const [loading, setLoading] = useState(true)

  const cargarActivas = useCallback(async () => {
    const { data, error } = await supabase
      .from('motos')
      .select('*')
      .is('hora_salida', null)
      .order('espacio')

    if (error) {
      toast.error('Error cargando parqueadero')
      return
    }
    setMotosActivas((data ?? []) as Moto[])
    setLoading(false)
  }, [])

  useEffect(() => {
    cargarActivas()

    const channel = supabase
      .channel('parking-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'motos' }, cargarActivas)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [cargarActivas])

  const espacios: EspacioParqueadero[] = Array.from({ length: totalEspacios }, (_, i) => {
    const numero = i + 1
    const moto   = motosActivas.find(m => m.espacio === numero)
    return { numero, ocupado: !!moto, moto }
  })

  const primerEspacioLibre = (): number | null => {
    for (let i = 1; i <= totalEspacios; i++) {
      if (!motosActivas.find(m => m.espacio === i)) return i
    }
    return null
  }

  const registrarEntrada = async (datos: EntradaDatos): Promise<boolean> => {
    const registro: Record<string, unknown> = {
      placa:        datos.placa,
      propietario:  datos.propietario  || null,
      telefono:     datos.telefono     || null,
      tipo:         datos.tipo,
      espacio:      datos.espacio,
      notas:        datos.notas        || null,
      hora_entrada: new Date().toISOString(),
      pagado:       datos.pagado       ?? false,
    }

    if (datos.monto_cobrado !== undefined) registro.monto_cobrado  = datos.monto_cobrado
    if (datos.fecha_vencimiento)           registro.fecha_vencimiento = datos.fecha_vencimiento

    const { error } = await supabase.from('motos').insert([registro])

    if (error) {
      toast.error(`Error registrando entrada: ${error.message}`)
      return false
    }

    if (datos.tipo === 'mensualidad') {
      toast.success(`Mensualidad registrada — ${datos.placa} · ${formatCOP(datos.monto_cobrado ?? 0)} cobrado`)
    } else {
      toast.success(`${datos.placa} entró — espacio #${datos.espacio}`)
    }
    return true
  }

  const registrarSalida = async (
    motoId: string,
    placa: string,
    monto: number,
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('motos')
      .update({
        hora_salida:   new Date().toISOString(),
        monto_cobrado: monto,
        pagado:        monto > 0 ? true : undefined,
      })
      .eq('id', motoId)

    if (error) {
      toast.error(`Error registrando salida: ${error.message}`)
      return false
    }

    if (monto > 0) {
      toast.success(`${placa} salió · ${formatCOP(monto)}`)
    } else {
      toast.success(`${placa} salió`)
    }
    return true
  }

  return {
    espacios,
    motosActivas,
    loading,
    primerEspacioLibre,
    registrarEntrada,
    registrarSalida,
    recargar: cargarActivas,
  }
}
