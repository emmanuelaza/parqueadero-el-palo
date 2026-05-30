import { useState } from 'react'
import { Save, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { DIAS_SEMANA } from '../lib/helpers'
import toast from 'react-hot-toast'
import type { Horario } from '../types'

interface Props {
  horarios: Horario[]
  onRecargar: () => void
}

export default function Horarios({ horarios, onRecargar }: Props) {
  if (horarios.length === 0) {
    return <div className="text-sm" style={{ color: 'var(--gray-400)' }}>Cargando horarios…</div>
  }
  const sorted = [...horarios].sort((a, b) => a.dia_semana - b.dia_semana)

  return (
    <div className="space-y-2">
      {sorted.map(h => (
        <HorarioRow key={h.id} horario={h} onRecargar={onRecargar} />
      ))}
    </div>
  )
}

function HorarioRow({ horario, onRecargar }: { horario: Horario; onRecargar: () => void }) {
  const [apertura, setApertura] = useState(horario.hora_apertura)
  const [cierre,   setCierre]   = useState(horario.hora_cierre)
  const [activo,   setActivo]   = useState(horario.activo)
  const [loading,  setLoading]  = useState(false)
  const [editando, setEditando] = useState(false)

  const dirty =
    apertura !== horario.hora_apertura ||
    cierre   !== horario.hora_cierre   ||
    activo   !== horario.activo

  const handleSave = async () => {
    setLoading(true)
    const { error } = await supabase
      .from('horarios')
      .update({ hora_apertura: apertura, hora_cierre: cierre, activo })
      .eq('id', horario.id)
    if (error) toast.error('Error guardando horario')
    else {
      toast.success(`Horario del ${DIAS_SEMANA[horario.dia_semana]} actualizado`)
      setEditando(false)
      onRecargar()
    }
    setLoading(false)
  }

  const handleCancel = () => {
    setApertura(horario.hora_apertura)
    setCierre(horario.hora_cierre)
    setActivo(horario.activo)
    setEditando(false)
  }

  const isWeekend = horario.dia_semana === 0 || horario.dia_semana === 6

  return (
    <div
      className="p-3 sm:p-4 transition-colors"
      style={{
        backgroundColor: activo ? 'var(--white)' : 'var(--gray-50)',
        border: '1px solid var(--gray-100)',
        borderRadius: 'var(--radius-md)',
        opacity: activo ? 1 : 0.7,
      }}
    >
      {/* Row 1: Day + toggle */}
      <div className="flex items-center justify-between gap-3 mb-2 sm:mb-0 sm:hidden">
        <span
          className="font-bold text-sm"
          style={{ color: isWeekend ? '#854D0E' : 'var(--blue-900)' }}
        >
          {DIAS_SEMANA[horario.dia_semana]}
        </span>
        <button
          onClick={() => { setActivo(!activo); setEditando(true) }}
          title={activo ? 'Desactivar' : 'Activar'}
        >
          {activo
            ? <ToggleRight size={26} style={{ color: 'var(--success)' }} />
            : <ToggleLeft  size={26} style={{ color: 'var(--gray-400)' }} />}
        </button>
      </div>

      {/* Desktop: single row | Mobile: stacked */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        {/* Day label (desktop only) */}
        <div className="hidden sm:block w-24 shrink-0">
          <span className="font-bold text-sm" style={{ color: isWeekend ? '#854D0E' : 'var(--blue-900)' }}>
            {DIAS_SEMANA[horario.dia_semana]}
          </span>
        </div>

        {/* Toggle (desktop only) */}
        <button
          onClick={() => { setActivo(!activo); setEditando(true) }}
          className="hidden sm:block shrink-0"
          title={activo ? 'Desactivar' : 'Activar'}
        >
          {activo
            ? <ToggleRight size={22} style={{ color: 'var(--success)' }} />
            : <ToggleLeft  size={22} style={{ color: 'var(--gray-400)' }} />}
        </button>

        {/* Times */}
        {activo ? (
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <input
              type="time"
              value={apertura}
              onChange={e => { setApertura(e.target.value); setEditando(true) }}
              style={timeInputStyle}
            />
            <span className="text-sm" style={{ color: 'var(--gray-400)' }}>–</span>
            <input
              type="time"
              value={cierre}
              onChange={e => { setCierre(e.target.value); setEditando(true) }}
              style={timeInputStyle}
            />
          </div>
        ) : (
          <span className="text-sm flex-1" style={{ color: 'var(--gray-400)' }}>Cerrado</span>
        )}

        {/* Save/Cancel */}
        {(editando || dirty) && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-1.5 font-bold transition-colors disabled:opacity-50 text-[12px]"
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--yellow-400)',
                color: 'var(--blue-900)',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                minHeight: 36,
              }}
            >
              <Save size={12} />
              {loading ? '…' : 'Guardar'}
            </button>
            <button
              onClick={handleCancel}
              className="font-semibold transition-colors text-[12px]"
              style={{
                padding: '8px 10px',
                border: '1.5px solid var(--gray-100)',
                color: 'var(--gray-400)',
                backgroundColor: 'transparent',
                borderRadius: 'var(--radius-sm)',
                minHeight: 36,
              }}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const timeInputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1.5px solid var(--gray-100)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 14,
  fontFamily: 'monospace',
  outline: 'none',
  color: 'var(--blue-900)',
  minHeight: 40,
}
