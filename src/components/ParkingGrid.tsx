import { useEffect, useState, useRef } from 'react'
import { Plus, AlertTriangle, FileText } from 'lucide-react'
import { formatDuracion, diffHoras } from '../lib/helpers'
import type { EspacioParqueadero, TarifaTipo } from '../types'

const TIPO_COLORS: Record<TarifaTipo, { bg: string; badge: string; border: string }> = {
  hora:        { bg: 'bg-blue-900',   badge: 'bg-blue-500',   border: 'border-blue-700'  },
  dia:         { bg: 'bg-green-900',  badge: 'bg-green-500',  border: 'border-green-700' },
  mensualidad: { bg: 'bg-purple-900', badge: 'bg-purple-500', border: 'border-purple-700' },
}

const TIPO_LABELS: Record<TarifaTipo, string> = {
  hora:        'Hora',
  dia:         'Día',
  mensualidad: 'Mens.',
}

interface Props {
  espacios: EspacioParqueadero[]
  alertaHoras: number
  highlightedNumero?: number
  onEspacioVacio: (numero: number) => void
  onEspacioOcupado: (espacio: EspacioParqueadero) => void
}

export default function ParkingGrid({
  espacios,
  alertaHoras,
  highlightedNumero,
  onEspacioVacio,
  onEspacioOcupado,
}: Props) {
  const [tick, setTick] = useState(0)
  const spaceRefs = useRef<Map<number, HTMLElement>>(new Map())

  // Update elapsed times every 30s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  // Scroll to highlighted space
  useEffect(() => {
    if (!highlightedNumero) return
    const el = spaceRefs.current.get(highlightedNumero)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightedNumero])

  const ocupados      = espacios.filter(e => e.ocupado).length
  const libres        = espacios.length - ocupados
  const abandonados   = espacios.filter(e =>
    e.ocupado && e.moto && diffHoras(e.moto.hora_entrada) > alertaHoras
  ).length

  return (
    <div>
      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-6 px-1 flex-wrap">
        <StatChip label="Total"    value={espacios.length} color="text-slate-400" />
        <StatChip label="Ocupados" value={ocupados}        color="text-orange-400" />
        <StatChip label="Libres"   value={libres}          color="text-green-400"  />
        {abandonados > 0 && (
          <StatChip label="Alerta" value={abandonados} color="text-red-500" />
        )}
        <div className="flex-1" />
        <OccupancyBar pct={ocupados / Math.max(espacios.length, 1)} />
      </div>

      {/* Grid */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
      >
        {espacios.map(espacio =>
          espacio.ocupado ? (
            <OcupadoCard
              key={espacio.numero}
              espacio={espacio}
              tick={tick}
              alertaHoras={alertaHoras}
              highlighted={espacio.numero === highlightedNumero}
              onClick={() => onEspacioOcupado(espacio)}
              setRef={el => {
                if (el) spaceRefs.current.set(espacio.numero, el)
                else    spaceRefs.current.delete(espacio.numero)
              }}
            />
          ) : (
            <LibreCard
              key={espacio.numero}
              numero={espacio.numero}
              highlighted={espacio.numero === highlightedNumero}
              onClick={() => onEspacioVacio(espacio.numero)}
              setRef={el => {
                if (el) spaceRefs.current.set(espacio.numero, el)
                else    spaceRefs.current.delete(espacio.numero)
              }}
            />
          ),
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
    </div>
  )
}

function OccupancyBar({ pct }: { pct: number }) {
  const pctR  = Math.round(pct * 100)
  const color = pct > 0.85 ? 'bg-red-500' : pct > 0.6 ? 'bg-orange-500' : 'bg-green-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pctR}%` }} />
      </div>
      <span className="text-sm text-slate-500 tabular-nums w-9">{pctR}%</span>
    </div>
  )
}

function LibreCard({
  numero,
  highlighted,
  onClick,
  setRef,
}: {
  numero: number
  highlighted: boolean
  onClick: () => void
  setRef: (el: HTMLElement | null) => void
}) {
  return (
    <button
      ref={setRef as (el: HTMLButtonElement | null) => void}
      onClick={onClick}
      className={`group h-32 rounded-xl border-2 border-dashed bg-white hover:border-orange-400 hover:bg-orange-50 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
        highlighted
          ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-400 ring-offset-2'
          : 'border-slate-200'
      }`}
    >
      <div className="text-xs font-bold text-slate-400 group-hover:text-orange-500">#{numero}</div>
      <div className={`w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center ${
        highlighted ? 'border-orange-400' : 'border-slate-300 group-hover:border-orange-400'
      }`}>
        <Plus size={16} className={highlighted ? 'text-orange-400' : 'text-slate-300 group-hover:text-orange-400'} />
      </div>
      <div className={`text-xs font-medium ${highlighted ? 'text-orange-500' : 'text-slate-400 group-hover:text-orange-500'}`}>
        LIBRE
      </div>
    </button>
  )
}

function OcupadoCard({
  espacio,
  tick,
  alertaHoras,
  highlighted,
  onClick,
  setRef,
}: {
  espacio: EspacioParqueadero
  tick: number
  alertaHoras: number
  highlighted: boolean
  onClick: () => void
  setRef: (el: HTMLElement | null) => void
}) {
  const { moto, numero } = espacio
  if (!moto) return null

  void tick

  const colors      = TIPO_COLORS[moto.tipo]
  const horas       = diffHoras(moto.hora_entrada)
  const esAbandonado = horas > alertaHoras

  // Mensualidad vencida
  const vencida = moto.tipo === 'mensualidad' && moto.fecha_vencimiento
    ? moto.fecha_vencimiento < new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
    : false

  return (
    <button
      ref={setRef as (el: HTMLButtonElement | null) => void}
      onClick={onClick}
      title={esAbandonado
        ? `Lleva ${formatDuracion(moto.hora_entrada)} — posible abandono`
        : undefined
      }
      className={`h-32 rounded-xl border-2 p-3 flex flex-col justify-between text-left cursor-pointer hover:opacity-90 hover:scale-[1.02] transition-all relative ${
        colors.bg
      } ${
        highlighted
          ? 'ring-4 ring-orange-400 ring-offset-2 border-orange-400'
          : esAbandonado
          ? 'border-red-400 animate-pulse-border'
          : colors.border
      }`}
    >
      {/* Abandon alert icon */}
      {esAbandonado && (
        <div className="absolute top-2 right-2 z-10">
          <AlertTriangle size={14} className="text-red-400 fill-red-400 opacity-90" />
        </div>
      )}

      {/* Notes icon */}
      {moto.notas && !esAbandonado && (
        <div className="absolute top-2 right-2 z-10">
          <FileText size={13} className="text-white/50" />
        </div>
      )}

      <div className="flex items-start justify-between">
        <span className="text-xs font-bold text-white/60">#{numero}</span>
        <span className={`text-xs font-bold text-white px-1.5 py-0.5 rounded ${
          vencida ? 'bg-red-500' : colors.badge
        }`}>
          {vencida ? 'VENCIÓ' : TIPO_LABELS[moto.tipo]}
        </span>
      </div>

      <div>
        <div className="text-white font-bold text-lg leading-tight tracking-wide">
          {moto.placa}
        </div>
        {moto.propietario && (
          <div className="text-white/60 text-xs truncate mt-0.5">{moto.propietario}</div>
        )}
      </div>

      <div className={`text-sm font-mono font-semibold ${esAbandonado ? 'text-red-300' : 'text-white/80'}`}>
        {formatDuracion(moto.hora_entrada)}
      </div>
    </button>
  )
}
