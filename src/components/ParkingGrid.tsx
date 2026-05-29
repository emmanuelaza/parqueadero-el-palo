import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { formatDuracion } from '../lib/helpers'
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
  onEspacioVacio: (numero: number) => void
  onEspacioOcupado: (espacio: EspacioParqueadero) => void
}

export default function ParkingGrid({ espacios, onEspacioVacio, onEspacioOcupado }: Props) {
  // Tick every 30s to refresh elapsed times
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const ocupados = espacios.filter(e => e.ocupado).length
  const libres   = espacios.length - ocupados

  return (
    <div>
      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-6 px-1">
        <StatChip label="Espacios" value={espacios.length} color="text-slate-400" />
        <StatChip label="Ocupados" value={ocupados}        color="text-orange-400" />
        <StatChip label="Libres"   value={libres}          color="text-green-400"  />
        <div className="flex-1" />
        <OccupancyBar pct={ocupados / espacios.length} />
      </div>

      {/* Grid */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
        {espacios.map(espacio => (
          espacio.ocupado
            ? <OcupadoCard
                key={espacio.numero}
                espacio={espacio}
                tick={tick}
                onClick={() => onEspacioOcupado(espacio)}
              />
            : <LibreCard
                key={espacio.numero}
                numero={espacio.numero}
                onClick={() => onEspacioVacio(espacio.numero)}
              />
        ))}
      </div>
    </div>
  )
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
    </div>
  )
}

function OccupancyBar({ pct }: { pct: number }) {
  const pctRounded = Math.round(pct * 100)
  const color = pct > 0.85 ? 'bg-red-500' : pct > 0.6 ? 'bg-orange-500' : 'bg-green-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pctRounded}%` }} />
      </div>
      <span className="text-sm text-slate-500 tabular-nums w-9">{pctRounded}%</span>
    </div>
  )
}

function LibreCard({ numero, onClick }: { numero: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group h-32 rounded-xl border-2 border-dashed border-slate-200 bg-white hover:border-orange-400 hover:bg-orange-50 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
    >
      <div className="text-xs font-bold text-slate-400 group-hover:text-orange-500">#{numero}</div>
      <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 group-hover:border-orange-400 flex items-center justify-center">
        <Plus size={16} className="text-slate-300 group-hover:text-orange-400" />
      </div>
      <div className="text-xs text-slate-400 group-hover:text-orange-500 font-medium">LIBRE</div>
    </button>
  )
}

function OcupadoCard({
  espacio,
  tick,
  onClick,
}: {
  espacio: EspacioParqueadero
  tick: number
  onClick: () => void
}) {
  const { moto, numero } = espacio
  if (!moto) return null

  void tick // used to trigger re-render for time update

  const colors = TIPO_COLORS[moto.tipo]

  return (
    <button
      onClick={onClick}
      className={`h-32 rounded-xl border-2 ${colors.border} ${colors.bg} p-3 flex flex-col justify-between text-left cursor-pointer hover:opacity-90 hover:scale-[1.02] transition-all`}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-bold text-white/60">#{numero}</span>
        <span className={`text-xs font-bold text-white px-1.5 py-0.5 rounded ${colors.badge}`}>
          {TIPO_LABELS[moto.tipo]}
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

      <div className="text-white/80 text-sm font-mono font-semibold">
        {formatDuracion(moto.hora_entrada)}
      </div>
    </button>
  )
}
