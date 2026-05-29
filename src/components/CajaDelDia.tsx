import { useState, useEffect, useCallback } from 'react'
import { DollarSign, Bike, TrendingUp, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCOP, formatFecha, fechaHoyBogota, TIPO_LABELS } from '../lib/helpers'
import type { Moto, TarifaTipo } from '../types'

type Resumen = {
  tipo: TarifaTipo
  cantidad: number
  total: number
}

export default function CajaDelDia() {
  const [motos,    setMotos]    = useState<Moto[]>([])
  const [loading,  setLoading]  = useState(true)
  const [lastFetch, setLastFetch] = useState<Date>(new Date())

  const cargar = useCallback(async () => {
    setLoading(true)
    const hoy = fechaHoyBogota()

    const { data, error } = await supabase
      .from('motos')
      .select('*')
      .not('hora_salida', 'is', null)
      .gte('hora_salida', `${hoy}T00:00:00`)
      .lte('hora_salida', `${hoy}T23:59:59`)
      .eq('pagado', true)
      .order('hora_salida', { ascending: false })

    if (!error) {
      setMotos(data ?? [])
    }
    setLoading(false)
    setLastFetch(new Date())
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const totalIngresos = motos.reduce((s, m) => s + (m.monto_cobrado ?? 0), 0)

  const resumenPorTipo: Resumen[] = (['hora', 'dia', 'mensualidad'] as TarifaTipo[]).map(tipo => ({
    tipo,
    cantidad: motos.filter(m => m.tipo === tipo).length,
    total:    motos.filter(m => m.tipo === tipo).reduce((s, m) => s + (m.monto_cobrado ?? 0), 0),
  }))

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Caja del día</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={cargar}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <KpiCard
          icon={<DollarSign size={24} className="text-orange-600" />}
          label="Total recaudado"
          value={formatCOP(totalIngresos)}
          bg="bg-orange-50"
          border="border-orange-200"
        />
        <KpiCard
          icon={<Bike size={24} className="text-blue-600" />}
          label="Motos atendidas"
          value={String(motos.length)}
          bg="bg-blue-50"
          border="border-blue-200"
        />
        <KpiCard
          icon={<TrendingUp size={24} className="text-green-600" />}
          label="Ticket promedio"
          value={motos.length > 0 ? formatCOP(totalIngresos / motos.length) : '—'}
          bg="bg-green-50"
          border="border-green-200"
        />
      </div>

      {/* Desglose por tipo */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
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

      {/* Movimientos del día */}
      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Movimientos del día</h2>
          <p className="text-xs text-slate-400 mt-0.5">Actualizado: {lastFetch.toLocaleTimeString('es-CO', { hour12: false })}</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando…</div>
        ) : motos.length === 0 ? (
          <div className="p-8 text-center text-slate-400">Sin movimientos hoy</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <Th>Placa</Th>
                  <Th>Propietario</Th>
                  <Th>Tipo</Th>
                  <Th>Entrada</Th>
                  <Th>Salida</Th>
                  <Th right>Monto</Th>
                </tr>
              </thead>
              <tbody>
                {motos.map(m => (
                  <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{m.placa}</td>
                    <td className="px-4 py-3 text-slate-600">{m.propietario || <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <TipoBadge tipo={m.tipo} />
                    </td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">{formatFecha(m.hora_entrada)}</td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">{formatFecha(m.hora_salida)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCOP(m.monto_cobrado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({ icon, label, value, bg, border }: {
  icon: React.ReactNode
  label: string
  value: string
  bg: string
  border: string
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
  const colors: Record<TarifaTipo, string> = {
    hora:        'bg-blue-100 text-blue-700',
    dia:         'bg-green-100 text-green-700',
    mensualidad: 'bg-purple-100 text-purple-700',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${colors[tipo]}`}>
      {TIPO_LABELS[tipo]}
    </span>
  )
}
