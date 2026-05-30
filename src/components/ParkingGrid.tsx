import { useEffect, useState, useRef } from 'react'
import { Plus, AlertTriangle, FileText, Clock } from 'lucide-react'
import { formatDuracion, diffHoras } from '../lib/helpers'
import type { EspacioParqueadero, TarifaTipo } from '../types'

// Pill (badge tipo) colors
const TIPO_BADGE: Record<TarifaTipo, React.CSSProperties> = {
  hora:        { backgroundColor: 'var(--yellow-400)', color: 'var(--blue-900)' },
  dia:         { backgroundColor: 'var(--white)',      color: 'var(--blue-900)' },
  mensualidad: { backgroundColor: '#DCFCE7',           color: '#15803D' },
}

const TIPO_LABELS: Record<TarifaTipo, string> = {
  hora:        'HORA',
  dia:         'DÍA',
  mensualidad: 'MENS.',
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

  // Refresh elapsed times every 60s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // Scroll to highlighted space
  useEffect(() => {
    if (!highlightedNumero) return
    const el = spaceRefs.current.get(highlightedNumero)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightedNumero])

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: 10,
      }}
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
  )
}

// ─── Espacio LIBRE ─────────────────────────────────────────────────────────────

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
      className="relative bg-white flex flex-col items-center justify-center"
      style={{
        height: 130,
        border: highlighted
          ? '2px dashed var(--blue-700)'
          : '2px dashed var(--gray-100)',
        borderRadius: 'var(--radius-md)',
        transition: 'var(--transition)',
        boxShadow: highlighted ? 'var(--shadow-sm)' : 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--blue-700)'
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        e.currentTarget.style.transform = 'scale(1.02)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = highlighted ? 'var(--blue-700)' : 'var(--gray-100)'
        e.currentTarget.style.boxShadow = highlighted ? 'var(--shadow-sm)' : 'none'
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      {/* Número arriba-izq */}
      <span
        className="absolute top-2 left-2 text-[11px] font-semibold tabular-nums"
        style={{ color: 'var(--gray-400)' }}
      >
        #{numero}
      </span>

      {/* Círculo amarillo con + */}
      <div
        className="flex items-center justify-center"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          backgroundColor: 'var(--yellow-400)',
        }}
      >
        <Plus size={18} style={{ color: 'var(--blue-900)' }} strokeWidth={2.5} />
      </div>

      <span
        className="text-[11px] font-semibold mt-2 uppercase tracking-wide"
        style={{ color: 'var(--gray-400)' }}
      >
        Libre
      </span>
    </button>
  )
}

// ─── Espacio OCUPADO ───────────────────────────────────────────────────────────

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

  const horas        = diffHoras(moto.hora_entrada)
  const esAbandonado = horas > alertaHoras

  const vencida = moto.tipo === 'mensualidad' && moto.fecha_vencimiento
    ? moto.fecha_vencimiento < new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
    : false

  const background = esAbandonado
    ? 'linear-gradient(135deg, #DC2626, #991B1B)'
    : 'linear-gradient(135deg, var(--blue-700), var(--blue-900))'

  return (
    <button
      ref={setRef as (el: HTMLButtonElement | null) => void}
      onClick={onClick}
      title={esAbandonado ? `Lleva ${formatDuracion(moto.hora_entrada)} — posible abandono` : undefined}
      className={`relative text-left ${esAbandonado ? 'pm-animate-pulse-border' : ''}`}
      style={{
        height: 130,
        background,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        padding: 12,
        border: highlighted ? '2px solid var(--yellow-400)' : 'none',
        transition: 'var(--transition)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.filter = 'brightness(1.08)'
        e.currentTarget.style.transform = 'scale(1.02)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.filter = 'brightness(1)'
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      {/* Top row: número + badge */}
      <div className="flex items-start justify-between">
        <span
          className="text-[11px] font-bold tabular-nums"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          #{numero}
        </span>
        <span
          className="px-1.5 py-0.5 text-[10px] font-bold"
          style={{
            ...(vencida
              ? { backgroundColor: 'var(--danger)', color: 'var(--white)' }
              : TIPO_BADGE[moto.tipo]),
            borderRadius: 4,
            letterSpacing: '0.04em',
          }}
        >
          {vencida ? 'VENCIÓ' : TIPO_LABELS[moto.tipo]}
        </span>
      </div>

      {/* Center: placa + nombre */}
      <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2">
        <div
          className="font-mono-brand text-white text-[17px] leading-none tracking-wider truncate"
          style={{ fontFamily: '"JetBrains Mono", "Courier New", monospace' }}
        >
          {moto.placa}
        </div>
        {moto.propietario && (
          <div
            className="text-[10.5px] truncate mt-1 font-medium"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            {moto.propietario}
          </div>
        )}
      </div>

      {/* Bottom row: tiempo + notas */}
      <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between">
        <div
          className="flex items-center gap-1 text-[11px] font-semibold tabular-nums"
          style={{ color: esAbandonado ? '#FECACA' : 'rgba(255,255,255,0.6)' }}
        >
          <Clock size={10} />
          {formatDuracion(moto.hora_entrada)}
        </div>

        {esAbandonado ? (
          <AlertTriangle size={13} style={{ color: '#FCA5A5' }} />
        ) : moto.notas ? (
          <FileText size={11} style={{ color: 'rgba(255,255,255,0.55)' }} />
        ) : null}
      </div>
    </button>
  )
}
