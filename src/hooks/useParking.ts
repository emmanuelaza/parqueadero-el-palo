import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { TOTAL_ESPACIOS } from '../lib/helpers'
import type { Moto, EspacioParqueadero } from '../types'

export function useParking() {
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
    setMotosActivas(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    cargarActivas()

    const channel = supabase
      .channel('parking-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'motos' },
        () => { cargarActivas() },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [cargarActivas])

  const espacios: EspacioParqueadero[] = Array.from({ length: TOTAL_ESPACIOS }, (_, i) => {
    const numero = i + 1
    const moto = motosActivas.find(m => m.espacio === numero)
    return { numero, ocupado: !!moto, moto }
  })

  const primerEspacioLibre = (): number | null => {
    for (let i = 1; i <= TOTAL_ESPACIOS; i++) {
      if (!motosActivas.find(m => m.espacio === i)) return i
    }
    return null
  }

  const registrarEntrada = async (datos: {
    placa: string
    propietario?: string
    telefono?: string
    tipo: Moto['tipo']
    espacio: number
  }): Promise<boolean> => {
    const { error } = await supabase.from('motos').insert([{
      placa:        datos.placa,
      propietario:  datos.propietario || null,
      telefono:     datos.telefono    || null,
      tipo:         datos.tipo,
      espacio:      datos.espacio,
      hora_entrada: new Date().toISOString(),
      pagado:       false,
    }])

    if (error) {
      toast.error(`Error registrando entrada: ${error.message}`)
      return false
    }

    toast.success(`Moto ${datos.placa} — espacio #${datos.espacio}`)
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
        hora_salida:    new Date().toISOString(),
        monto_cobrado:  monto,
        pagado:         true,
      })
      .eq('id', motoId)

    if (error) {
      toast.error(`Error registrando salida: ${error.message}`)
      return false
    }

    toast.success(`${placa} salió — cobrado ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(monto)}`)
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
