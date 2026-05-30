import { useState, useCallback } from 'react'
import { Search, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import Topbar from './Topbar'
import { supabase } from '../lib/supabase'
import {
  formatCOP,
  formatFecha,
  formatDuracion,
  normalizarPlaca,
  descargarCSV,
  formatNumeroTiquete,
  TIPO_LABELS,
} from '../lib/helpers'
import type { Moto, TarifaTipo } from '../types'

const PAGE_SIZE = 30

const TIPOS_FILTRO: Array<{ value: string; label: string }> = [
  { value: '',            label: 'Todos los tipos' },
  { value: 'hora',        label: 'Por hora'        },
  { value: 'dia',         label: 'Por día'         },
  { value: 'mensualidad', label: 'Mensualidad'     },
]

export default function Historial() {
  const [motos,   setMotos]   = useState<Moto[]>([])
  const [loading, setLoading] = useState(false)
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(0)
  const [buscado, setBuscado] = useState(false)

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
    let query = supabase.from('motos').select('*').order('created_at', { ascending: false })
    if (placa.trim())    query = query.ilike('placa', `%${normalizarPlaca(placa)}%`)
    if (tipo)            query = query.eq('tipo', tipo as TarifaTipo)
    if (fechaDesde)      query = query.gte('hora_entrada', `${fechaDesde}T00:00:00`)
    if (fechaHasta)      query = query.lte('hora_entrada', `${fechaHasta}T23:59:59`)

    const { data } = await query
    if (!data) return

    const typedData = (data as Moto[])
    const headers = ['Tiquete','Fecha','Placa','Propietario','Teléfono','Espacio','Tipo','Entrada','Salida','Duración (h)','Monto','Método','Atendido por','Pagado']
    const rows = typedData.map(m => {
      const durH = m.hora_salida
        ? ((new Date(m.hora_salida).getTime() - new Date(m.hora_entrada).getTime()) / 3_600_000).toFixed(2)
        : ''
      return [
        m.numero_tiquete ? formatNumeroTiquete(m.numero_tiquete) : '',
        new Date(m.hora_entrada).toLocaleDateString('es-CO'),
        m.placa,
        m.propietario ?? '',
        m.telefono    ?? '',
        m.espacio     ?? '',
        TIPO_LABELS[m.tipo],
        formatFecha(m.hora_entrada),
        m.hora_salida ? formatFecha(m.hora_salida) : '',
        durH,
        m.monto_cobrado ?? '',
        m.metodo_pago ?? '',
        m.atendido_por ?? '',
        m.pagado ? 'Sí' : 'No',
      ]
    })
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    descargarCSV(csv, `historial_${new Date().toISOString().slice(0,10)}.csv`)
  }

  const totalPaginas = Math.ceil(total / PAGE_SIZE)

  const right = buscado && motos.length > 0 ? (
    <button
      onClick={exportarCSV}
      className="flex items-center gap-2 font-semibold transition-colors text-[13px]"
      style={{
        padding: '8px 16px',
        backgroundColor: 'var(--blue-700)',
        color: 'var(--white)',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--blue-900)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--blue-700)')}
    >
      <Download size={14} />
      Exportar CSV
    </button>
  ) : undefined

  return (
    <>
      <Topbar title="Historial" right={right} />

      <div className="p-6 max-w-6xl">
        {/* Filters */}
        <div
          className="bg-white p-5 mb-6"
          style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Filter size={15} style={{ color: 'var(--blue-700)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--blue-900)' }}>Filtros</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <FilterInput
              type="text"
              value={placa}
              placeholder="Buscar placa…"
              onChange={setPlaca}
              onKeyEnter={() => buscar(0)}
            />
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value)}
              style={selectStyle}
            >
              {TIPOS_FILTRO.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <FilterInput type="date" value={fechaDesde} onChange={setFechaDesde} placeholder="" />
            <FilterInput type="date" value={fechaHasta} onChange={setFechaHasta} placeholder="" />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => buscar(0)}
              disabled={loading}
              className="flex items-center gap-2 font-bold transition-all disabled:opacity-50 text-sm"
              style={{
                padding: '10px 20px',
                backgroundColor: 'var(--yellow-400)',
                color: 'var(--blue-900)',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
              }}
            >
              <Search size={15} />
              {loading ? 'Buscando…' : 'Buscar'}
            </button>
            <button
              onClick={() => { setPlaca(''); setTipo(''); setFechaDesde(''); setFechaHasta(''); setMotos([]); setBuscado(false) }}
              className="font-semibold transition-colors text-sm"
              style={{
                padding: '10px 16px',
                border: '1.5px solid var(--gray-100)',
                color: 'var(--gray-400)',
                backgroundColor: 'transparent',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Results */}
        {buscado && (
          <div
            className="bg-white"
            style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div
              className="p-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--gray-50)' }}
            >
              <span className="text-sm" style={{ color: 'var(--gray-600)' }}>
                {loading ? 'Cargando…' : `${total.toLocaleString('es-CO')} resultado${total !== 1 ? 's' : ''}`}
              </span>
              {totalPaginas > 1 && (
                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => buscar(page - 1)}
                    disabled={page === 0 || loading}
                    className="p-1 disabled:opacity-40"
                    style={{ color: 'var(--blue-700)' }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span style={{ color: 'var(--gray-600)' }}>
                    Página {page + 1} / {totalPaginas}
                  </span>
                  <button
                    onClick={() => buscar(page + 1)}
                    disabled={page >= totalPaginas - 1 || loading}
                    className="p-1 disabled:opacity-40"
                    style={{ color: 'var(--blue-700)' }}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm" style={{ color: 'var(--gray-400)' }}>Cargando…</div>
            ) : motos.length === 0 ? (
              <div className="p-8 text-center text-sm" style={{ color: 'var(--gray-400)' }}>
                Sin resultados para los filtros seleccionados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--gray-50)' }}>
                      <Th>Tiquete</Th>
                      <Th>Placa</Th>
                      <Th>Propietario</Th>
                      <Th>Tipo</Th>
                      <Th>Esp.</Th>
                      <Th>Entrada</Th>
                      <Th>Salida</Th>
                      <Th>Duración</Th>
                      <Th right>Monto</Th>
                      <Th>Método</Th>
                      <Th>Atendido</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {motos.map(m => (
                      <tr key={m.id} style={{ borderTop: '1px solid var(--gray-50)' }}>
                        <td className="px-4 py-3 font-mono text-[11px]" style={{ color: 'var(--gray-400)' }}>
                          {m.numero_tiquete ? `#${formatNumeroTiquete(m.numero_tiquete)}` : '—'}
                        </td>
                        <td
                          className="px-4 py-3 font-bold tracking-wider"
                          style={{ fontFamily: '"JetBrains Mono", monospace', color: 'var(--blue-900)' }}
                        >
                          {m.placa}
                        </td>
                        <td className="px-4 py-3 max-w-[120px] truncate" style={{ color: 'var(--gray-600)' }}>
                          {m.propietario || '—'}
                        </td>
                        <td className="px-4 py-3"><TipoBadge tipo={m.tipo} /></td>
                        <td className="px-4 py-3 text-center" style={{ color: 'var(--gray-600)' }}>{m.espacio ?? '—'}</td>
                        <td className="px-4 py-3 tabular-nums text-[12.5px]" style={{ color: 'var(--gray-600)' }}>
                          {formatFecha(m.hora_entrada)}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-[12.5px]" style={{ color: 'var(--gray-600)' }}>
                          {m.hora_salida ? formatFecha(m.hora_salida) : (
                            <span className="font-semibold" style={{ color: 'var(--success)' }}>En parqueadero</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[12.5px]" style={{ color: 'var(--gray-600)' }}>
                          {m.hora_salida ? formatDuracion(m.hora_entrada, m.hora_salida) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: 'var(--blue-900)' }}>
                          {m.monto_cobrado != null ? formatCOP(m.monto_cobrado) : '—'}
                        </td>
                        <td className="px-4 py-3 text-[12px] capitalize" style={{ color: 'var(--gray-600)' }}>
                          {m.metodo_pago ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-[12px] max-w-[80px] truncate" style={{ color: 'var(--gray-600)' }}>
                          {m.atendido_por ?? '—'}
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
          <div className="text-center py-16" style={{ color: 'var(--gray-400)' }}>
            <Search size={36} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Usa los filtros arriba y presiona <strong>Buscar</strong> para ver registros</p>
          </div>
        )}
      </div>
    </>
  )
}

const selectStyle: React.CSSProperties = {
  border: '1.5px solid var(--gray-100)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 14px',
  fontSize: 14,
  backgroundColor: 'var(--white)',
  outline: 'none',
  color: 'var(--blue-900)',
}

function FilterInput({
  type, value, placeholder, onChange, onKeyEnter,
}: {
  type: 'text' | 'date'
  value: string
  placeholder: string
  onChange: (v: string) => void
  onKeyEnter?: () => void
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter' && onKeyEnter) onKeyEnter() }}
      style={{
        border: '1.5px solid var(--gray-100)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 14px',
        fontSize: 14,
        outline: 'none',
        color: 'var(--blue-900)',
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
