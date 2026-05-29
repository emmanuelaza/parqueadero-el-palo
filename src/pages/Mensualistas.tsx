import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, RotateCcw, Plus, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { formatCOP, addDias, fechaHoyBogota } from '../lib/helpers'
import { useTarifas } from '../hooks/useTarifas'
import { useParking } from '../hooks/useParking'
import { useConfig } from '../context/ConfiguracionContext'
import EntradaModal from '../components/EntradaModal'
import type { Moto } from '../types'

function diasRestantes(fechaVencimiento: string | null): number {
  if (!fechaVencimiento) return 0
  const hoy   = new Date(fechaHoyBogota() + 'T00:00:00')
  const vence = new Date(fechaVencimiento + 'T00:00:00')
  return Math.ceil((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

function colorDias(dias: number) {
  if (dias <= 0)  return { text: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700'    }
  if (dias <= 7)  return { text: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700'  }
  return            { text: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200',  badge: 'bg-green-100 text-green-700'  }
}

export default function Mensualistas() {
  const { totalEspacios } = useConfig()
  const { tarifasMap }    = useTarifas()
  const { motosActivas, registrarEntrada } = useParking(totalEspacios)

  const [mensualistas, setMensualistas] = useState<Moto[]>([])
  const [loading,      setLoading]      = useState(true)
  const [renovando,    setRenovando]    = useState<string | null>(null)
  const [showModal,    setShowModal]    = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    // Motos activas con tipo mensualidad
    const { data } = await supabase
      .from('motos')
      .select('*')
      .eq('tipo', 'mensualidad')
      .is('hora_salida', null)
      .order('fecha_vencimiento')

    setMensualistas((data ?? []) as Moto[])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const renovar = async (moto: Moto) => {
    setRenovando(moto.id)

    const nuevaFecha = addDias(
      moto.fecha_vencimiento ?? new Date(),
      30,
    ).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })

    const monto = tarifasMap.mensualidad

    const [{ error: errMoto }, { error: errCaja }] = await Promise.all([
      supabase.from('motos').update({ fecha_vencimiento: nuevaFecha }).eq('id', moto.id),
      supabase.rpc('actualizar_caja_manual', { p_monto: monto }),
    ])

    if (errMoto || errCaja) {
      toast.error('Error al renovar mensualidad')
    } else {
      toast.success(`Mensualidad renovada · vence ${nuevaFecha} · ${formatCOP(monto)}`)
      cargar()
    }

    setRenovando(null)
  }

  const abrirNuevaMensualista = () => {
    const hayLibres = motosActivas.length < totalEspacios
    if (!hayLibres) {
      toast.error('No hay espacios disponibles')
      return
    }
    setShowModal(true)
  }

  const primerEspacioLibre = (): number => {
    for (let i = 1; i <= totalEspacios; i++) {
      if (!motosActivas.find(m => m.espacio === i)) return i
    }
    return 1
  }

  const vencidasCount = mensualistas.filter(m => diasRestantes(m.fecha_vencimiento) <= 0).length
  const porVencerCount = mensualistas.filter(m => {
    const d = diasRestantes(m.fecha_vencimiento)
    return d > 0 && d <= 7
  }).length

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mensualistas</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {mensualistas.length} activos
            {vencidasCount > 0 && <span className="text-red-500 font-medium"> · {vencidasCount} vencida{vencidasCount > 1 ? 's' : ''}</span>}
            {porVencerCount > 0 && <span className="text-amber-500 font-medium"> · {porVencerCount} por vencer</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={cargar}
            disabled={loading}
            className="p-2.5 rounded-xl border-2 border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={abrirNuevaMensualista}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors text-sm"
          >
            <Plus size={18} />
            Nuevo mensualista
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 mb-5 text-xs text-slate-500">
        <LegendChip color="bg-green-100 text-green-700"  label="Más de 7 días" />
        <LegendChip color="bg-amber-100 text-amber-700"  label="7 días o menos" />
        <LegendChip color="bg-red-100 text-red-700"      label="Vencida" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw size={32} className="animate-spin mx-auto mb-3 opacity-30" />
            Cargando…
          </div>
        ) : mensualistas.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="mb-2">No hay mensualistas activos</p>
            <button onClick={abrirNuevaMensualista} className="text-orange-500 font-semibold hover:underline">
              Agregar el primero
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <Th>Esp.</Th>
                  <Th>Placa</Th>
                  <Th>Propietario</Th>
                  <Th>Teléfono</Th>
                  <Th>Entrada</Th>
                  <Th>Vence</Th>
                  <Th>Días restantes</Th>
                  <Th>Acción</Th>
                </tr>
              </thead>
              <tbody>
                {mensualistas.map(m => {
                  const dias   = diasRestantes(m.fecha_vencimiento)
                  const colors = colorDias(dias)
                  return (
                    <tr key={m.id} className={`border-t border-slate-100 ${colors.bg}`}>
                      <td className="px-4 py-3 text-slate-600 text-center font-mono">
                        #{m.espacio ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">{m.placa}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate">
                        {m.propietario || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{m.telefono || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 tabular-nums whitespace-nowrap">
                        {new Date(m.hora_entrada).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                        {m.fecha_vencimiento
                          ? new Date(m.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-CO')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${colors.badge}`}>
                          {dias <= 0 && <AlertTriangle size={11} />}
                          {dias <= 0 ? 'Vencida' : `${dias} día${dias !== 1 ? 's' : ''}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => renovar(m)}
                          disabled={renovando === m.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-slate-200 text-slate-600 text-xs font-semibold hover:bg-white transition-colors disabled:opacity-50"
                        >
                          <RotateCcw size={13} className={renovando === m.id ? 'animate-spin' : ''} />
                          {renovando === m.id ? '…' : `Renovar · ${formatCOP(tarifasMap.mensualidad)}`}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nueva entrada mensualidad */}
      {showModal && (
        <EntradaModal
          espacio={primerEspacioLibre()}
          tarifasMap={tarifasMap}
          tipoForzado="mensualidad"
          onClose={() => setShowModal(false)}
          onConfirm={async datos => {
            const ok = await registrarEntrada(datos)
            if (ok) { setShowModal(false); cargar() }
            return ok
          }}
        />
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
      {children}
    </th>
  )
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full font-semibold ${color}`}>
      {label}
    </span>
  )
}
