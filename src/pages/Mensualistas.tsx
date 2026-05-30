import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, RotateCcw, Plus, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import Topbar from '../components/Topbar'
import PageHeader from '../components/PageHeader'
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
      moto.fecha_vencimiento ?? new Date(), 30,
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

  const vencidasCount  = mensualistas.filter(m => diasRestantes(m.fecha_vencimiento) <= 0).length
  const porVencerCount = mensualistas.filter(m => {
    const d = diasRestantes(m.fecha_vencimiento)
    return d > 0 && d <= 7
  }).length

  // Desktop topbar actions
  const desktopRight = (
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

  // Mobile page header: just refresh icon
  const mobileRight = (
    <button
      onClick={cargar}
      disabled={loading}
      aria-label="Recargar"
      style={{
        width: 40, height: 40,
        border: '1.5px solid var(--gray-100)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--blue-700)',
        backgroundColor: 'var(--white)',
      }}
      className="flex items-center justify-center"
    >
      <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
    </button>
  )

  const subtitle = (
    <>
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
    </>
  )

  return (
    <>
      <Topbar title="Mensualistas" right={desktopRight} />

      <div className="p-3 lg:p-6 max-w-6xl pb-24 lg:pb-6">
        <PageHeader title="Mensualistas" subtitle={subtitle} right={mobileRight} />

        {/* Desktop subtitle */}
        <p className="hidden lg:block text-sm mb-5" style={{ color: 'var(--gray-600)' }}>
          {subtitle}
        </p>

        {/* ── Desktop table ─────────────────────────────────────────── */}
        <div
          className="hidden lg:block bg-white"
          style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}
        >
          {loading ? (
            <LoadingBox />
          ) : mensualistas.length === 0 ? (
            <EmptyBox onAdd={abrirNuevaMensualista} />
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
                          style={{ fontFamily: '"JetBrains Mono", monospace', color: 'var(--blue-900)' }}
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
                          <StatusPill dias={dias} colors={colors} />
                        </td>
                        <td className="px-4 py-3">
                          <RenovarBtn
                            onClick={() => renovar(m)}
                            loading={renovando === m.id}
                            monto={tarifasMap.mensualidad}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Mobile cards ──────────────────────────────────────────── */}
        <div className="lg:hidden">
          {loading ? (
            <div
              className="bg-white p-10 text-center text-sm"
              style={{ color: 'var(--gray-400)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}
            >
              <RefreshCw size={24} className="animate-spin mx-auto mb-3 opacity-50" />
              Cargando…
            </div>
          ) : mensualistas.length === 0 ? (
            <div
              className="bg-white p-10 text-center text-sm"
              style={{ color: 'var(--gray-400)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}
            >
              No hay mensualistas activos
            </div>
          ) : (
            <div className="space-y-2">
              {mensualistas.map(m => {
                const dias   = diasRestantes(m.fecha_vencimiento)
                const colors = colorDias(dias)
                return (
                  <div
                    key={m.id}
                    className="bg-white p-4"
                    style={{ borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-lg font-bold tracking-wider truncate"
                          style={{ fontFamily: '"JetBrains Mono", monospace', color: 'var(--blue-900)' }}
                        >
                          {m.placa}
                        </div>
                        {m.propietario && (
                          <div className="text-[13px] truncate" style={{ color: 'var(--gray-600)' }}>
                            {m.propietario}
                          </div>
                        )}
                      </div>
                      <StatusPill dias={dias} colors={colors} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[12px] mb-3">
                      <Info label="Espacio" value={m.hora_salida === null && m.espacio ? `#${m.espacio}` : '—'} />
                      <Info
                        label="Vence"
                        value={m.fecha_vencimiento
                          ? new Date(m.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-CO')
                          : '—'}
                      />
                      {m.telefono && <Info label="Teléfono" value={m.telefono} />}
                    </div>

                    <RenovarBtn
                      fullWidth
                      onClick={() => renovar(m)}
                      loading={renovando === m.id}
                      monto={tarifasMap.mensualidad}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── FAB (mobile only) ──────────────────────────────────────── */}
        <button
          onClick={abrirNuevaMensualista}
          aria-label="Nuevo mensualista"
          className="lg:hidden fixed bottom-5 right-5 z-20 flex items-center justify-center"
          style={{
            width: 56, height: 56,
            borderRadius: '50%',
            backgroundColor: 'var(--yellow-400)',
            color: 'var(--blue-900)',
            boxShadow: 'var(--shadow-lg)',
            border: 'none',
          }}
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>

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

// ─── Sub-components ────────────────────────────────────────────────────────────

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

function StatusPill({ dias, colors }: { dias: number; colors: BadgePalette }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap"
      style={{ backgroundColor: colors.bg, color: colors.color, borderRadius: 999 }}
    >
      {dias <= 0 && <AlertTriangle size={10} />}
      {dias <= 0 ? 'Vencida' : `${dias} día${dias !== 1 ? 's' : ''}`}
    </span>
  )
}

function RenovarBtn({
  onClick, loading, monto, fullWidth,
}: { onClick: () => void; loading: boolean; monto: number; fullWidth?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center justify-center gap-1.5 font-bold transition-all disabled:opacity-50 ${fullWidth ? 'w-full' : ''}`}
      style={{
        padding: fullWidth ? '10px 14px' : '6px 12px',
        backgroundColor: 'var(--yellow-400)',
        color: 'var(--blue-900)',
        borderRadius: 'var(--radius-sm)',
        fontSize: 13,
        border: 'none',
        minHeight: fullWidth ? 44 : 32,
      }}
    >
      <RotateCcw size={13} className={loading ? 'animate-spin' : ''} />
      {loading ? '…' : `Renovar · ${formatCOP(monto)}`}
    </button>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="text-[10px] font-semibold uppercase mb-0.5"
        style={{ color: 'var(--gray-400)', letterSpacing: '0.05em' }}
      >
        {label}
      </div>
      <div className="font-medium truncate" style={{ color: 'var(--blue-900)' }}>{value}</div>
    </div>
  )
}

function LoadingBox() {
  return (
    <div className="p-12 text-center text-sm" style={{ color: 'var(--gray-400)' }}>
      <RefreshCw size={28} className="animate-spin mx-auto mb-3 opacity-50" />
      Cargando…
    </div>
  )
}

function EmptyBox({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="p-12 text-center text-sm" style={{ color: 'var(--gray-400)' }}>
      <p className="mb-2">No hay mensualistas activos</p>
      <button onClick={onAdd} className="font-bold underline" style={{ color: 'var(--blue-700)' }}>
        Agregar el primero
      </button>
    </div>
  )
}
