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
    return <div className="text-slate-400 text-sm py-4">Cargando horarios…</div>
  }

  // Sort by dia_semana
  const sorted = [...horarios].sort((a, b) => a.dia_semana - b.dia_semana)

  return (
    <div className="space-y-3">
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

    if (error) {
      toast.error('Error guardando horario')
    } else {
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
    <div className={`border-2 rounded-2xl p-4 transition-colors ${
      activo
        ? 'bg-white border-slate-200'
        : 'bg-slate-50 border-slate-100 opacity-60'
    }`}>
      <div className="flex items-center gap-4">
        {/* Day label */}
        <div className="w-28 shrink-0">
          <span className={`font-bold ${isWeekend ? 'text-orange-600' : 'text-slate-800'}`}>
            {DIAS_SEMANA[horario.dia_semana]}
          </span>
        </div>

        {/* Toggle active */}
        <button
          onClick={() => { setActivo(!activo); setEditando(true) }}
          className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
          title={activo ? 'Desactivar' : 'Activar'}
        >
          {activo
            ? <ToggleRight size={24} className="text-green-500" />
            : <ToggleLeft  size={24} className="text-slate-300" />
          }
        </button>

        {/* Times */}
        {activo ? (
          <>
            <div className="flex items-center gap-2 flex-1">
              <label className="text-sm text-slate-500 shrink-0">Apertura</label>
              <input
                type="time"
                value={apertura}
                onChange={e => { setApertura(e.target.value); setEditando(true) }}
                className="px-3 py-1.5 rounded-lg border-2 border-slate-200 focus:border-orange-400 focus:outline-none text-sm font-mono"
              />
              <span className="text-slate-300 text-sm">–</span>
              <label className="text-sm text-slate-500 shrink-0">Cierre</label>
              <input
                type="time"
                value={cierre}
                onChange={e => { setCierre(e.target.value); setEditando(true) }}
                className="px-3 py-1.5 rounded-lg border-2 border-slate-200 focus:border-orange-400 focus:outline-none text-sm font-mono"
              />
            </div>
          </>
        ) : (
          <span className="text-sm text-slate-400 flex-1">Cerrado</span>
        )}

        {/* Save / Cancel */}
        {(editando || dirty) && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Save size={14} />
              {loading ? '…' : 'Guardar'}
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
