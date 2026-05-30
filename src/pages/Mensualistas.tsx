import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, RotateCcw, Plus, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import Topbar from '../components/Topbar'
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

interface BadgePalette { bg: string; color: string }
function colorDias(dias: number): BadgePalette {
  if (dias <= 0) return { bg: '#FEE2E2', color: '#DC2626' }
  if (dias <= 7) return { bg: '#FEF9C3', color: '#854D0E' }
  return            { bg: '#DCFCE7', color: '#16A34A' }
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
    const hoy = fechaHoyBogota()
    const { data } = await supabase
      .from('motos')
      .select('*')
      .eq('tipo', 'mensualidad')
      .gt('fecha_vencimiento', hoy)
      .order('fecha_vencimiento', { ascending: false })

    const map = new Map<string, Moto>()
    for (const m of (data ?? []) as Moto[]) {
      if (!map.has(m.placa)) map.set(m.placa, m)
    }
    const unique = Array.from(map.values()).sort((a, b) =>
      (a.fecha_vencimiento ?? '').localeCompare(b.fecha_vencimiento ?? '')
    )
    setMensualistas(unique)
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

    if (errMoto || errCaja) toast.error('Error al renovar mensualidad')
    else {
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

  const right = (
    <>
      <button
        onClick={cargar}
        disabled={loading}
        className="p-2.5"
        style={{
          border: '1.5px solid var(--gray-100)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--blue-700)',
        }}
      >
        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
      </button>
      <button
        onClick={abrirNuevaMensualista}
        className="flex items-center gap-2 font-bold transition-all"
        style={{
          padding: '10px 16px',
          backgroundColor: 'var(--yellow-400)',
          color: 'var(--blue-900)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 13,
          border: 'none',
        }}
      >
        <Plus size={16} />
        Nuevo mensualista
      </button>
    </>
  )

  return (
    <>
      <Topbar title="Mensualistas" right={right} />

      <div className="p-6 max-w-6xl">
        {/* Resumen */}
        <p className="text-sm mb-5" style={{ color: 'var(--gray-600)' }}>
          <span className="font-semibold" style={{ color: 'var(--blue-900)' }}>
            {mensualistas.length} activos
          </span>
          {vencidasCount > 0 && (
            <span className="ml-2 font-medium" style={{ color: 'var(--danger)' }}>
              · {vencidasCount} vencida{vencidasCount > 1 ? 's' : ''}
            </span>
          )}
          {porVencerCount > 0 && (
            <span className="ml-2 font-medium" style={{ color: 'var(--warning)' }}>
              · {porVencerCount} por vencer
            </span>
          )}
        </p>

        {/* Tabla */}
        <div
          className="bg-white"
          style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}
        >
          {loading ? (
            <div className="p-12 text-center text-sm" style={{ color: 'var(--gray-400)' }}>
              <RefreshCw size={28} className="animate-spin mx-auto mb-3 opacity-50" />
              Cargando…
            </div>
          ) : mensualistas.length === 0 ? (
            <div className="p-12 text-center text-sm" style={{ color: 'var(--gray-400)' }}>
              <p className="mb-2">No hay mensualistas activos</p>
              <button
                onClick={abrirNuevaMensualista}
                className="font-bold underline"
                style={{ color: 'var(--blue-700)' }}
              >
                Agregar el primero
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--gray-50)' }}>
                    <Th>Esp.</Th>
                    <Th>Placa</Th>
                    <Th>Propietario</Th>
                    <Th>Teléfono</Th>
                    <Th>Vence</Th>
                    <Th>Estado</Th>
                    <Th>Acción</Th>
                  </tr>
                </thead>
                <tbody>
                  {mensualistas.map(m => {
                    const dias   = diasRestantes(m.fecha_vencimiento)
                    const colors = colorDias(dias)
                    return (
                      <tr key={m.id} style={{ borderTop: '1px solid var(--gray-50)' }}>
                        <td className="px-4 py-3 text-center font-mono tabular-nums" style={{ color: 'var(--gray-600)' }}>
                          {m.hora_salida === null && m.espacio ? `#${m.espacio}` : '—'}
                        </td>
                        <td
                          className="px-4 py-3 font-bold tracking-wider"
                          style={{
                            fontFamily: '"JetBrains Mono", monospace',
                            color: 'var(--blue-900)',
                          }}
                        >
                          {m.placa}
                        </td>
                        <td className="px-4 py-3 max-w-[140px] truncate" style={{ color: 'var(--gray-600)' }}>
                          {m.propietario || '—'}
                        </td>
                        <td className="px-4 py-3" style={{ color: 'var(--gray-600)' }}>
                          {m.telefono || '—'}
                        </td>
                        <td className="px-4 py-3 tabular-nums whitespace-nowrap" style={{ color: 'var(--blue-900)' }}>
                          {m.fecha_vencimiento
                            ? new Date(m.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-CO')
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold"
                            style={{
                              backgroundColor: colors.bg,
                              color: colors.color,
                              borderRadius: 999,
                            }}
                          >
                            {dias <= 0 && <AlertTriangle size={10} />}
                            {dias <= 0 ? 'Vencida' : `${dias} día${dias !== 1 ? 's' : ''}`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => renovar(m)}
                            disabled={renovando === m.id}
                            className="flex items-center gap-1.5 font-bold transition-all disabled:opacity-50"
                            style={{
                              padding: '6px 12px',
                              backgroundColor: 'var(--yellow-400)',
                              color: 'var(--blue-900)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: 12,
                              border: 'none',
                            }}
                          >
                            <RotateCcw size={12} className={renovando === m.id ? 'animate-spin' : ''} />
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
    </>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase"
      style={{ color: 'var(--blue-900)', letterSpacing: '0.04em' }}
    >
      {children}
    </th>
  )
}
