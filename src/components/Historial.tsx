import { useState, useCallback } from 'react'
import { Search, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  formatCOP,
  formatFecha,
  formatDuracion,
  normalizarPlaca,
  descargarCSV,
  TIPO_LABELS,
} from '../lib/helpers'
import type { Moto, TarifaTipo } from '../types'

const PAGE_SIZE = 30

const TIPOS_FILTRO: Array<{ value: string; label: string }> = [
  { value: '',            label: 'Todos'       },
  { value: 'hora',        label: 'Por hora'    },
  { value: 'dia',         label: 'Por día'     },
  { value: 'mensualidad', label: 'Mensualidad' },
]

export default function Historial() {
  const [motos,        setMotos]       = useState<Moto[]>([])
  const [loading,      setLoading]     = useState(false)
  const [total,        setTotal]       = useState(0)
  const [page,         setPage]        = useState(0)
  const [buscado,      setBuscado]     = useState(false)

  const [placa,      setPlaca]      = useState('')
  const [tipo,       setTipo]       = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const buscar = useCallback(async (pg = 0) => {
    setLoading(true)
    setPage(pg)
    setBuscado(true)

    let query = supabase
      .from('motos')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE - 1)

    if (placa.trim())    query = query.ilike('placa', `%${normalizarPlaca(placa)}%`)
    if (tipo)            query = query.eq('tipo', tipo as TarifaTipo)
    if (fechaDesde)      query = query.gte('hora_entrada', `${fechaDesde}T00:00:00`)
    if (fechaHasta)      query = query.lte('hora_entrada', `${fechaHasta}T23:59:59`)

    const { data, count, error } = await query
    if (!error) {
      setMotos(data ?? [])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [placa, tipo, fechaDesde, fechaHasta])

  const exportarCSV = async () => {
    // Fetch all matching rows (no pagination)
    let query = supabase
      .from('motos')
      .select('*')
      .order('created_at', { ascending: false })

    if (placa.trim())    query = query.ilike('placa', `%${normalizarPlaca(placa)}%`)
    if (tipo)            query = query.eq('tipo', tipo as TarifaTipo)
    if (fechaDesde)      query = query.gte('hora_entrada', `${fechaDesde}T00:00:00`)
    if (fechaHasta)      query = query.lte('hora_entrada', `${fechaHasta}T23:59:59`)

    const { data } = await query
    if (!data) return

    const headers = ['Placa','Propietario','Teléfono','Tipo','Espacio','Entrada','Salida','Duración','Monto','Pagado']
    const rows = (data as import('../types').Moto[]).map(m => [
      m.placa,
      m.propietario ?? '',
      m.telefono    ?? '',
      TIPO_LABELS[m.tipo],
      m.espacio     ?? '',
      formatFecha(m.hora_entrada),
      formatFecha(m.hora_salida),
      m.hora_salida ? formatDuracion(m.hora_entrada, m.hora_salida) : '',
      m.monto_cobrado ?? '',
      m.pagado ? 'Sí' : 'No',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    descargarCSV(csv, `historial-el-palo-parking-${new Date().toISOString().slice(0,10)}.csv`)
  }

  const totalPaginas = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historial</h1>
          <p className="text-sm text-slate-500 mt-0.5">Todos los registros de entrada/salida</p>
        </div>
        {buscado && motos.length > 0 && (
          <button
            onClick={exportarCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            <Download size={16} />
            Exportar CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Filtros</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Buscar placa…"
            value={placa}
            onChange={e => setPlaca(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscar(0)}
            className="px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-orange-400 focus:outline-none text-sm"
          />
          <select
            value={tipo}
            onChange={e => setTipo(e.target.value)}
            className="px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-orange-400 focus:outline-none text-sm bg-white"
          >
            {TIPOS_FILTRO.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={fechaDesde}
            onChange={e => setFechaDesde(e.target.value)}
            className="px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-orange-400 focus:outline-none text-sm"
          />
          <input
            type="date"
            value={fechaHasta}
            onChange={e => setFechaHasta(e.target.value)}
            className="px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-orange-400 focus:outline-none text-sm"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => buscar(0)}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            <Search size={16} />
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
          <button
            onClick={() => { setPlaca(''); setTipo(''); setFechaDesde(''); setFechaHasta(''); setMotos([]); setBuscado(false) }}
            className="px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Results */}
      {buscado && (
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              {loading ? 'Cargando…' : `${total.toLocaleString('es-CO')} resultado${total !== 1 ? 's' : ''}`}
            </span>
            {totalPaginas > 1 && (
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => buscar(page - 1)}
                  disabled={page === 0 || loading}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-slate-600">
                  Página {page + 1} / {totalPaginas}
                </span>
                <button
                  onClick={() => buscar(page + 1)}
                  disabled={page >= totalPaginas - 1 || loading}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Cargando…</div>
          ) : motos.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Sin resultados para los filtros seleccionados</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <Th>Placa</Th>
                    <Th>Propietario</Th>
                    <Th>Tipo</Th>
                    <Th>Esp.</Th>
                    <Th>Entrada</Th>
                    <Th>Salida</Th>
                    <Th>Duración</Th>
                    <Th right>Monto</Th>
                    <Th>Estado</Th>
                  </tr>
                </thead>
                <tbody>
                  {motos.map(m => (
                    <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-900">{m.placa}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate">{m.propietario || '—'}</td>
                      <td className="px-4 py-3"><TipoBadge tipo={m.tipo} /></td>
                      <td className="px-4 py-3 text-slate-600 text-center">{m.espacio ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600 tabular-nums whitespace-nowrap">{formatFecha(m.hora_entrada)}</td>
                      <td className="px-4 py-3 text-slate-600 tabular-nums whitespace-nowrap">
                        {m.hora_salida ? formatFecha(m.hora_salida) : (
                          <span className="text-green-600 font-semibold">En parqueadero</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {m.hora_salida ? formatDuracion(m.hora_entrada, m.hora_salida) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {m.monto_cobrado != null ? formatCOP(m.monto_cobrado) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {m.hora_salida
                          ? <span className="text-xs font-semibold text-slate-400">Salió</span>
                          : <span className="text-xs font-semibold text-green-600">Activo</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!buscado && (
        <div className="text-center py-16 text-slate-400">
          <Search size={40} className="mx-auto mb-3 opacity-30" />
          <p>Usa los filtros arriba y presiona <strong>Buscar</strong> para ver registros</p>
        </div>
      )}
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
