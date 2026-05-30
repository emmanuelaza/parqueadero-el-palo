import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, Bike, Banknote, Smartphone, RefreshCw,
  Lock, CheckCircle, BarChart2,
} from 'lucide-react'
import Topbar from './Topbar'
import { supabase } from '../lib/supabase'
import {
  formatCOP, formatFecha, fechaHoyBogota,
  TIPO_LABELS, rangoFechas,
} from '../lib/helpers'
import type { Moto, TarifaTipo, CajaCierre } from '../types'

type TabKey = 'hoy' | 'semana' | 'mes'

interface DatoGrafico { fecha: string; label: string; total: number; motos: number }

export default function CajaDelDia() {
  const [tab, setTab] = useState<TabKey>('hoy')

  return (
    <>
      <Topbar title="Caja" />

      <div className="p-6 max-w-6xl">
        {/* Tabs */}
        <div className="flex gap-6 mb-6" style={{ borderBottom: '1px solid var(--gray-100)' }}>
          {([
            { key: 'hoy',    label: 'Hoy'         },
            { key: 'semana', label: 'Esta semana' },
            { key: 'mes',    label: 'Este mes'    },
          ] as { key: TabKey; label: string }[]).map(t => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="pb-3 text-sm transition-colors"
                style={{
                  color: active ? 'var(--blue-700)' : 'var(--gray-400)',
                  fontWeight: active ? 600 : 500,
                  borderBottom: active ? '2px solid var(--blue-700)' : '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {tab === 'hoy'    && <TabHoy />}
        {tab === 'semana' && <TabPeriodo clave="semana" />}
        {tab === 'mes'    && <TabPeriodo clave="mes" />}
      </div>
    </>
  )
}

// ─── Tab Hoy ─────────────────────────────────────────────────────────────────

function TabHoy() {
  const [motos,     setMotos]     = useState<Moto[]>([])
  const [loading,   setLoading]   = useState(true)
  const [cierre,    setCierre]    = useState<CajaCierre | null>(null)
  const [showModal, setShowModal] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const hoy = fechaHoyBogota()
    const [{ data: motosData }, { data: cierreData }] = await Promise.all([
      supabase
        .from('motos')
        .select('*')
        .not('hora_salida', 'is', null)
        .gte('hora_salida', `${hoy}T00:00:00`)
        .lte('hora_salida', `${hoy}T23:59:59`)
        .eq('pagado', true)
        .order('hora_salida', { ascending: false }),
      supabase
        .from('caja_cierres')
        .select('*')
        .eq('fecha', hoy)
        .maybeSingle(),
    ])
    setMotos((motosData ?? []) as Moto[])
    setCierre(cierreData as CajaCierre | null)
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const [mensHoy, setMensHoy] = useState<Moto[]>([])
  useEffect(() => {
    const hoy = fechaHoyBogota()
    supabase
      .from('motos')
      .select('*')
      .eq('tipo', 'mensualidad')
      .eq('pagado', true)
      .gte('hora_entrada', `${hoy}T00:00:00`)
      .lte('hora_entrada', `${hoy}T23:59:59`)
      .then(({ data }) => setMensHoy((data ?? []) as Moto[]))
  }, [])

  const todosMov = [
    ...motos.filter(m => m.tipo !== 'mensualidad'),
    ...mensHoy.filter(m => (m.monto_cobrado ?? 0) > 0),
  ]
  const totalIngresos    = todosMov.reduce((s, m) => s + (m.monto_cobrado ?? 0), 0)
  const totalEfectivo    = todosMov.filter(m => m.metodo_pago === 'efectivo')     .reduce((s, m) => s + (m.monto_cobrado ?? 0), 0)
  const totalTransfer    = todosMov.filter(m => m.metodo_pago === 'transferencia').reduce((s, m) => s + (m.monto_cobrado ?? 0), 0)

  const resumenPorTipo = (['hora', 'dia', 'mensualidad'] as TarifaTipo[]).map(t => ({
    tipo:     t,
    cantidad: todosMov.filter(m => m.tipo === t).length,
    total:    todosMov.filter(m => m.tipo === t).reduce((s, m) => s + (m.monto_cobrado ?? 0), 0),
  }))

  return (
    <>
      {/* Closed badge */}
      {cierre && (
        <div
          className="flex items-center gap-3 mb-5 px-4 py-3 text-sm"
          style={{
            backgroundColor: 'var(--blue-900)',
            color: 'var(--white)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <Lock size={16} style={{ color: 'var(--yellow-400)' }} />
          <span>
            Caja <strong>CERRADA</strong> por <strong>{cierre.cerrado_por ?? '—'}</strong>
            {' '}a las {new Date(cierre.cerrado_at).toLocaleTimeString('es-CO', { hour12: false })}
          </span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={<DollarSign size={20} style={{ color: 'var(--blue-700)' }} />}
          label="TOTAL"
          value={formatCOP(totalIngresos)}
          accent="var(--blue-700)"
          valueColor="var(--blue-700)"
        />
        <KpiCard
          icon={<Banknote size={20} style={{ color: 'var(--success)' }} />}
          label="EFECTIVO"
          value={formatCOP(totalEfectivo)}
          accent="var(--success)"
          valueColor="var(--success)"
        />
        <KpiCard
          icon={<Smartphone size={20} style={{ color: '#854D0E' }} />}
          label="TRANSFERENCIA"
          value={formatCOP(totalTransfer)}
          accent="var(--yellow-400)"
          valueColor="#854D0E"
        />
        <KpiCard
          icon={<Bike size={20} style={{ color: 'var(--gray-600)' }} />}
          label="MOTOS"
          value={String(todosMov.length)}
          accent="var(--gray-400)"
          valueColor="var(--blue-900)"
        />
      </div>

      {/* Desglose por tipo */}
      <Card className="mb-5">
        <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--blue-900)' }}>
          Desglose por tipo de tarifa
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {resumenPorTipo.map(r => (
            <div
              key={r.tipo}
              className="text-center p-3"
              style={{ backgroundColor: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}
            >
              <div
                className="text-[11px] font-semibold uppercase mb-1"
                style={{ color: 'var(--gray-400)', letterSpacing: '0.06em' }}
              >
                {TIPO_LABELS[r.tipo]}
              </div>
              <div className="text-xl font-extrabold" style={{ color: 'var(--blue-900)' }}>{r.cantidad}</div>
              <div className="text-[13px] mt-1" style={{ color: 'var(--gray-600)' }}>
                {formatCOP(r.total)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Movimientos */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold" style={{ color: 'var(--blue-900)' }}>
            Movimientos de hoy
          </h2>
          <button
            onClick={cargar}
            disabled={loading}
            style={{ color: 'var(--gray-400)' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm" style={{ color: 'var(--gray-400)' }}>Cargando…</div>
        ) : todosMov.length === 0 ? (
          <div className="py-8 text-center text-sm" style={{ color: 'var(--gray-400)' }}>Sin movimientos hoy</div>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--gray-50)' }}>
                  <Th>Placa</Th><Th>Propietario</Th><Th>Tipo</Th>
                  <Th>Entrada</Th><Th>Salida</Th><Th>Método</Th><Th right>Monto</Th>
                </tr>
              </thead>
              <tbody>
                {todosMov.map(m => (
                  <tr
                    key={m.id}
                    className="hover:bg-[var(--gray-50)] transition-colors"
                    style={{ borderTop: '1px solid var(--gray-50)' }}
                  >
                    <td className="px-4 py-2.5 font-bold font-mono" style={{ color: 'var(--blue-900)' }}>{m.placa}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--gray-600)' }}>{m.propietario || '—'}</td>
                    <td className="px-4 py-2.5"><TipoBadge tipo={m.tipo} /></td>
                    <td className="px-4 py-2.5 tabular-nums text-[12.5px]" style={{ color: 'var(--gray-600)' }}>{formatFecha(m.hora_entrada)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-[12.5px]" style={{ color: 'var(--gray-600)' }}>
                      {m.hora_salida
                        ? formatFecha(m.hora_salida)
                        : <span className="font-semibold" style={{ color: 'var(--blue-700)' }}>Mensualidad</span>}
                    </td>
                    <td className="px-4 py-2.5 capitalize text-[12.5px]" style={{ color: 'var(--gray-600)' }}>{m.metodo_pago ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums" style={{ color: 'var(--blue-900)' }}>
                      {formatCOP(m.monto_cobrado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Cerrar caja */}
      {!cierre && (
        <div className="flex justify-end mt-6">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-3 font-bold transition-colors text-[14px]"
            style={{
              backgroundColor: 'var(--danger)',
              color: 'var(--white)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <Lock size={16} />
            Cerrar caja del día
          </button>
        </div>
      )}

      {showModal && (
        <ModalCerrarCaja
          resumen={{ total: totalIngresos, motos: todosMov.length, desglose: resumenPorTipo }}
          onClose={() => setShowModal(false)}
          onConfirm={async (cerradoPor, notas) => {
            const hoy = fechaHoyBogota()
            await supabase.from('caja_cierres').upsert({
              fecha: hoy,
              total_ingresos: totalIngresos,
              total_motos: todosMov.length,
              cerrado_por: cerradoPor || null,
              cerrado_at: new Date().toISOString(),
              notas: notas || null,
            })
            setShowModal(false)
            cargar()
          }}
        />
      )}
    </>
  )
}

// ─── Tab Período ───────────────────────────────────────────────────────────────

function TabPeriodo({ clave }: { clave: 'semana' | 'mes' }) {
  const [datos,   setDatos]   = useState<DatoGrafico[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      setLoading(true)
      const hoy   = new Date()
      let   desde = new Date(hoy)
      if (clave === 'semana') desde.setDate(hoy.getDate() - 6)
      else                    desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

      const fechas = rangoFechas(desde, hoy)
      const { data } = await supabase
        .from('caja_diaria')
        .select('fecha, total_ingresos, total_motos')
        .gte('fecha', fechas[0])
        .lte('fecha', fechas[fechas.length - 1])

      const mapaDB: Record<string, { total: number; motos: number }> = {}
      for (const row of data ?? []) {
        mapaDB[row.fecha] = { total: row.total_ingresos, motos: row.total_motos }
      }

      const resultado: DatoGrafico[] = fechas.map(f => {
        const d = new Date(f + 'T12:00:00')
        const label = clave === 'semana'
          ? ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()]
          : String(d.getDate())
        return {
          fecha: f,
          label,
          total: mapaDB[f]?.total ?? 0,
          motos: mapaDB[f]?.motos ?? 0,
        }
      })

      setDatos(resultado)
      setLoading(false)
    }
    cargar()
  }, [clave])

  const totalPeriodo = datos.reduce((s, d) => s + d.total, 0)
  const motosPeriodo = datos.reduce((s, d) => s + d.motos, 0)
  const diasConData  = datos.filter(d => d.total > 0).length

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard
          icon={<DollarSign size={20} style={{ color: 'var(--blue-700)' }} />}
          label={`TOTAL ${clave === 'semana' ? 'SEMANA' : 'MES'}`}
          value={loading ? '…' : formatCOP(totalPeriodo)}
          accent="var(--blue-700)"
          valueColor="var(--blue-700)"
        />
        <KpiCard
          icon={<Bike size={20} style={{ color: 'var(--gray-600)' }} />}
          label="MOTOS TOTAL"
          value={loading ? '…' : String(motosPeriodo)}
          accent="var(--gray-400)"
          valueColor="var(--blue-900)"
        />
        <KpiCard
          icon={<BarChart2 size={20} style={{ color: 'var(--success)' }} />}
          label="DÍAS CON INGRESOS"
          value={loading ? '…' : String(diasConData)}
          accent="var(--success)"
          valueColor="var(--success)"
        />
      </div>

      <Card>
        <h2 className="text-sm font-bold mb-5" style={{ color: 'var(--blue-900)' }}>
          Ingresos por día {clave === 'semana' ? '(últimos 7 días)' : '(mes actual)'}
        </h2>
        {loading
          ? <div className="h-40 flex items-center justify-center text-sm" style={{ color: 'var(--gray-400)' }}>Cargando…</div>
          : <BarChart data={datos} />}
      </Card>
    </div>
  )
}

function BarChart({ data }: { data: DatoGrafico[] }) {
  const max = Math.max(...data.map(d => d.total), 1)
  return (
    <div>
      <div className="flex items-end gap-1 h-36 mb-2">
        {data.map(d => {
          const pct  = d.total / max
          const barH = Math.max(d.total > 0 ? 4 : 0, Math.round(pct * 120))
          return (
            <div key={d.fecha} className="flex-1 flex flex-col items-center group">
              <div className="relative w-full flex items-end" style={{ height: 120 }}>
                {barH > 0 && (
                  <div
                    className="w-full transition-colors"
                    style={{
                      height: barH,
                      backgroundColor: 'var(--blue-700)',
                      borderRadius: '3px 3px 0 0',
                    }}
                    title={`${d.label}: ${formatCOP(d.total)} · ${d.motos} moto${d.motos !== 1 ? 's' : ''}`}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--blue-600)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--blue-700)')}
                  />
                )}
                {d.total === 0 && (
                  <div className="w-full" style={{ height: 2, backgroundColor: 'var(--gray-100)' }} />
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex gap-1">
        {data.map(d => (
          <div
            key={d.fecha}
            className="flex-1 text-center text-[11px] truncate font-medium"
            style={{ color: 'var(--gray-400)' }}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Modal Cerrar Caja ────────────────────────────────────────────────────────

function ModalCerrarCaja({
  resumen,
  onClose,
  onConfirm,
}: {
  resumen: { total: number; motos: number; desglose: { tipo: TarifaTipo; cantidad: number; total: number }[] }
  onClose: () => void
  onConfirm: (cerradoPor: string, notas: string) => Promise<void>
}) {
  const [cerradoPor, setCerradoPor] = useState('')
  const [notas,      setNotas]      = useState('')
  const [loading,    setLoading]    = useState(false)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pm-overlay pm-animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white w-full max-w-md pm-animate-slide-up overflow-hidden"
        style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="px-6 py-5" style={{ backgroundColor: 'var(--blue-700)', color: 'var(--white)' }}>
          <h2 className="text-base font-bold leading-none">Cerrar caja del día</h2>
          <p className="text-[12px] mt-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Este registro queda guardado permanentemente
          </p>
        </div>

        <div className="p-6">
          <div
            className="rounded-[var(--radius-md)] p-4 mb-5 space-y-2"
            style={{ backgroundColor: 'var(--gray-50)' }}
          >
            <div className="flex justify-between font-semibold">
              <span style={{ color: 'var(--blue-900)' }}>Total recaudado</span>
              <span style={{ color: 'var(--blue-700)' }}>{formatCOP(resumen.total)}</span>
            </div>
            <div className="flex justify-between text-sm" style={{ color: 'var(--gray-600)' }}>
              <span>Motos atendidas</span>
              <span>{resumen.motos}</span>
            </div>
            <div className="pt-2 mt-2 space-y-1" style={{ borderTop: '1px solid var(--gray-100)' }}>
              {resumen.desglose.map(r => (
                <div key={r.tipo} className="flex justify-between text-xs" style={{ color: 'var(--gray-400)' }}>
                  <span>{TIPO_LABELS[r.tipo]}: {r.cantidad}</span>
                  <span>{formatCOP(r.total)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 mb-5">
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--blue-900)' }}>
                Cerrado por
              </label>
              <input
                type="text"
                value={cerradoPor}
                onChange={e => setCerradoPor(e.target.value)}
                placeholder="Nombre del operador"
                autoFocus
                className="w-full"
                style={{
                  border: '1.5px solid var(--gray-100)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  fontSize: 14,
                  outline: 'none',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--blue-700)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(27,47,190,0.1)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--gray-100)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--blue-900)' }}>
                Notas <span className="font-normal ml-1" style={{ color: 'var(--gray-400)' }}>(opcional)</span>
              </label>
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Observaciones del día…"
                rows={2}
                className="w-full resize-none"
                style={{
                  border: '1.5px solid var(--gray-100)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  fontSize: 14,
                  outline: 'none',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--blue-700)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(27,47,190,0.1)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--gray-100)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 font-semibold transition-colors text-sm"
              style={{
                padding: '13px 24px',
                border: '1.5px solid var(--gray-100)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--gray-400)',
                backgroundColor: 'transparent',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={async () => { setLoading(true); await onConfirm(cerradoPor, notas); setLoading(false) }}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 font-bold transition-all disabled:opacity-50 text-sm"
              style={{
                padding: '13px 24px',
                backgroundColor: 'var(--danger)',
                color: 'var(--white)',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
              }}
            >
              <CheckCircle size={16} />
              {loading ? 'Guardando…' : 'Confirmar cierre'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Shared ────────────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white p-5 ${className}`}
      style={{
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {children}
    </div>
  )
}

function KpiCard({
  icon, label, value, accent, valueColor,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent: string
  valueColor: string
}) {
  return (
    <div
      className="bg-white flex items-center gap-3"
      style={{
        padding: '18px 20px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        borderLeft: `4px solid ${accent}`,
      }}
    >
      <div
        className="shrink-0 flex items-center justify-center"
        style={{
          width: 40,
          height: 40,
          backgroundColor: 'var(--gray-50)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div
          className="text-[10px] font-semibold uppercase mb-1"
          style={{ color: 'var(--gray-400)', letterSpacing: '0.06em' }}
        >
          {label}
        </div>
        <div
          className="text-xl font-extrabold leading-none tabular-nums truncate"
          style={{ color: valueColor }}
        >
          {value}
        </div>
      </div>
    </div>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`px-4 py-2.5 text-[11px] font-semibold uppercase ${right ? 'text-right' : 'text-left'}`}
      style={{ color: 'var(--blue-900)', letterSpacing: '0.04em' }}
    >
      {children}
    </th>
  )
}

function TipoBadge({ tipo }: { tipo: TarifaTipo }) {
  const palette: Record<TarifaTipo, { bg: string; color: string }> = {
    hora:        { bg: '#DBEAFE', color: '#1B2FBE' },
    dia:         { bg: '#DCFCE7', color: '#15803D' },
    mensualidad: { bg: '#FEF3C7', color: '#854D0E' },
  }
  return (
    <span
      className="inline-block px-2 py-0.5 text-[10.5px] font-bold uppercase"
      style={{
        backgroundColor: palette[tipo].bg,
        color: palette[tipo].color,
        borderRadius: 999,
        letterSpacing: '0.04em',
      }}
    >
      {TIPO_LABELS[tipo]}
    </span>
  )
}
