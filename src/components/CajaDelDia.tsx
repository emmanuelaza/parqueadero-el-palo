import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, Bike, TrendingUp, RefreshCw,
  Lock, CheckCircle, BarChart2,
} from 'lucide-react'
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
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Caja</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
        {([
          { key: 'hoy',    label: 'Hoy'           },
          { key: 'semana', label: 'Esta semana'    },
          { key: 'mes',    label: 'Este mes'       },
        ] as { key: TabKey; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'hoy'    && <TabHoy />}
      {tab === 'semana' && <TabPeriodo clave="semana" />}
      {tab === 'mes'    && <TabPeriodo clave="mes" />}
    </div>
  )
}

// ─── Tab Hoy ─────────────────────────────────────────────────────────────────

function TabHoy() {
  const [motos,      setMotos]      = useState<Moto[]>([])
  const [loading,    setLoading]    = useState(true)
  const [cierre,     setCierre]     = useState<CajaCierre | null>(null)
  const [showModal,  setShowModal]  = useState(false)

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

  // Also count mensualidades paid today (hora_entrada, tipo='mensualidad')
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
    ...mensHoy,
  ]
  const totalIngresos = todosMov.reduce((s, m) => s + (m.monto_cobrado ?? 0), 0)

  const resumenPorTipo = (['hora', 'dia', 'mensualidad'] as TarifaTipo[]).map(t => ({
    tipo:     t,
    cantidad: todosMov.filter(m => m.tipo === t).length,
    total:    todosMov.filter(m => m.tipo === t).reduce((s, m) => s + (m.monto_cobrado ?? 0), 0),
  }))

  return (
    <>
      {/* Closed badge */}
      {cierre && (
        <div className="flex items-center gap-3 mb-5 px-4 py-3 bg-slate-800 text-white rounded-xl text-sm">
          <Lock size={16} className="text-slate-400" />
          <span>Caja <strong>CERRADA</strong> por <strong>{cierre.cerrado_por ?? '—'}</strong> a las {new Date(cierre.cerrado_at).toLocaleTimeString('es-CO', { hour12: false })}</span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard icon={<DollarSign size={24} className="text-orange-600" />}  label="Total recaudado"   value={formatCOP(totalIngresos)} bg="bg-orange-50" border="border-orange-200" />
        <KpiCard icon={<Bike size={24} className="text-blue-600" />}          label="Motos atendidas"   value={String(todosMov.length)} bg="bg-blue-50" border="border-blue-200" />
        <KpiCard icon={<TrendingUp size={24} className="text-green-600" />}   label="Ticket promedio"   value={todosMov.length > 0 ? formatCOP(totalIngresos / todosMov.length) : '—'} bg="bg-green-50" border="border-green-200" />
      </div>

      {/* Desglose por tipo */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
        <h2 className="font-bold text-slate-800 mb-4">Desglose por tipo</h2>
        <div className="grid grid-cols-3 gap-4">
          {resumenPorTipo.map(r => (
            <div key={r.tipo} className="text-center p-3 bg-slate-50 rounded-xl">
              <div className="text-sm font-semibold text-slate-500 mb-1">{TIPO_LABELS[r.tipo]}</div>
              <div className="text-xl font-bold text-slate-900">{r.cantidad}</div>
              <div className="text-sm text-slate-600 mt-1">{formatCOP(r.total)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Desglose por método de pago */}
      {todosMov.some(m => m.metodo_pago) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
          <h2 className="font-bold text-slate-800 mb-4">Desglose por método de pago</h2>
          <div className="grid grid-cols-2 gap-4">
            {(['efectivo', 'transferencia'] as const).map(mp => {
              const movs = todosMov.filter(m => m.metodo_pago === mp)
              return (
                <div key={mp} className="text-center p-3 bg-slate-50 rounded-xl">
                  <div className="text-sm font-semibold text-slate-500 mb-1 capitalize">{mp}</div>
                  <div className="text-xl font-bold text-slate-900">{movs.length}</div>
                  <div className="text-sm text-slate-600 mt-1">
                    {formatCOP(movs.reduce((s, m) => s + (m.monto_cobrado ?? 0), 0))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Movimientos */}
      <div className="bg-white rounded-2xl border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Movimientos de hoy</h2>
          <button onClick={cargar} disabled={loading} className="text-slate-400 hover:text-slate-600">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando…</div>
        ) : todosMov.length === 0 ? (
          <div className="p-8 text-center text-slate-400">Sin movimientos hoy</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <Th>Placa</Th><Th>Propietario</Th><Th>Tipo</Th><Th>Entrada</Th><Th>Salida</Th><Th right>Monto</Th>
                </tr>
              </thead>
              <tbody>
                {todosMov.map(m => (
                  <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-bold text-slate-900">{m.placa}</td>
                    <td className="px-4 py-2.5 text-slate-600">{m.propietario || '—'}</td>
                    <td className="px-4 py-2.5"><TipoBadge tipo={m.tipo} /></td>
                    <td className="px-4 py-2.5 text-slate-600 tabular-nums">{formatFecha(m.hora_entrada)}</td>
                    <td className="px-4 py-2.5 text-slate-600 tabular-nums">{m.hora_salida ? formatFecha(m.hora_salida) : <span className="text-purple-600 font-semibold">Mensualidad</span>}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{formatCOP(m.monto_cobrado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cerrar caja */}
      {!cierre && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors"
          >
            <Lock size={18} />
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

// ─── Tab Período (semana / mes) ───────────────────────────────────────────────

function TabPeriodo({ clave }: { clave: 'semana' | 'mes' }) {
  const [datos,   setDatos]   = useState<DatoGrafico[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      setLoading(true)
      const hoy   = new Date()
      let   desde = new Date(hoy)

      if (clave === 'semana') {
        desde.setDate(hoy.getDate() - 6)
      } else {
        desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      }

      const fechas = rangoFechas(desde, hoy)
      const desdeFmt = fechas[0]
      const hastaFmt = fechas[fechas.length - 1]

      const { data } = await supabase
        .from('caja_diaria')
        .select('fecha, total_ingresos, total_motos')
        .gte('fecha', desdeFmt)
        .lte('fecha', hastaFmt)

      const mapaDB: Record<string, { total: number; motos: number }> = {}
      for (const row of data ?? []) {
        mapaDB[row.fecha] = { total: row.total_ingresos, motos: row.total_motos }
      }

      const resultado: DatoGrafico[] = fechas.map(f => {
        const d    = new Date(f + 'T12:00:00')
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
      {/* KPIs del período */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard icon={<DollarSign size={24} className="text-orange-600" />} label={`Total ${clave === 'semana' ? 'semana' : 'mes'}`} value={loading ? '…' : formatCOP(totalPeriodo)} bg="bg-orange-50" border="border-orange-200" />
        <KpiCard icon={<Bike size={24} className="text-blue-600" />}        label="Motos total"   value={loading ? '…' : String(motosPeriodo)} bg="bg-blue-50" border="border-blue-200" />
        <KpiCard icon={<BarChart2 size={24} className="text-green-600" />}  label="Días con ingresos" value={loading ? '…' : String(diasConData)} bg="bg-green-50" border="border-green-200" />
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-bold text-slate-800 mb-5">
          Ingresos por día {clave === 'semana' ? '(últimos 7 días)' : '(mes actual)'}
        </h2>
        {loading ? (
          <div className="h-40 flex items-center justify-center text-slate-400">Cargando…</div>
        ) : (
          <BarChart data={datos} />
        )}
      </div>
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
              <div className="relative w-full flex items-end" style={{ height: '120px' }}>
                {barH > 0 && (
                  <div
                    className="w-full bg-orange-500 rounded-t-sm group-hover:bg-orange-400 transition-colors"
                    style={{ height: `${barH}px` }}
                    title={`${d.label}: ${formatCOP(d.total)} · ${d.motos} moto${d.motos !== 1 ? 's' : ''}`}
                  />
                )}
                {d.total === 0 && (
                  <div className="w-full bg-slate-100 rounded-t-sm" style={{ height: '2px' }} />
                )}
              </div>
            </div>
          )
        })}
      </div>
      {/* X-axis labels */}
      <div className="flex gap-1">
        {data.map(d => (
          <div key={d.fecha} className="flex-1 text-center text-xs text-slate-400 truncate">
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-1">Cerrar caja del día</h2>
        <p className="text-sm text-slate-500 mb-5">Este registro queda guardado permanentemente.</p>

        {/* Resumen */}
        <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-2">
          <div className="flex justify-between font-semibold">
            <span className="text-slate-700">Total recaudado</span>
            <span className="text-orange-600">{formatCOP(resumen.total)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>Motos atendidas</span>
            <span>{resumen.motos}</span>
          </div>
          <div className="border-t border-slate-200 pt-2 mt-2 space-y-1">
            {resumen.desglose.map(r => (
              <div key={r.tipo} className="flex justify-between text-xs text-slate-500">
                <span>{TIPO_LABELS[r.tipo]}: {r.cantidad}</span>
                <span>{formatCOP(r.total)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Cerrado por</label>
            <input
              type="text"
              value={cerradoPor}
              onChange={e => setCerradoPor(e.target.value)}
              placeholder="Nombre del operador"
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-orange-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Notas <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Observaciones del día…"
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-orange-400 focus:outline-none resize-none text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              setLoading(true)
              await onConfirm(cerradoPor, notas)
              setLoading(false)
            }}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            <CheckCircle size={18} />
            {loading ? 'Guardando…' : 'Confirmar cierre'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function KpiCard({ icon, label, value, bg, border }: {
  icon: React.ReactNode; label: string; value: string; bg: string; border: string
}) {
  return (
    <div className={`${bg} ${border} border-2 rounded-2xl p-5 flex items-center gap-4`}>
      <div className="shrink-0">{icon}</div>
      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
      </div>
    </div>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide ${right ? 'text-right' : ''}`}>
      {children}
    </th>
  )
}

function TipoBadge({ tipo }: { tipo: TarifaTipo }) {
  const c: Record<TarifaTipo, string> = {
    hora:        'bg-blue-100 text-blue-700',
    dia:         'bg-green-100 text-green-700',
    mensualidad: 'bg-purple-100 text-purple-700',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${c[tipo]}`}>
      {TIPO_LABELS[tipo]}
    </span>
  )
}
