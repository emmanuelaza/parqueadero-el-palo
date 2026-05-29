import { useState } from 'react'
import { Save, Edit2 } from 'lucide-react'
import { formatCOP, TIPO_LABELS } from '../lib/helpers'
import type { Tarifa, TarifaTipo } from '../types'

interface Props {
  tarifas: Tarifa[]
  onActualizar: (id: string, monto: number) => Promise<boolean>
}

type ColorKey = 'blue' | 'green' | 'purple'

const TIPO_INFO: Record<TarifaTipo, { desc: string; color: ColorKey }> = {
  hora:        { desc: 'Fracción de hora = hora completa. Mínimo 1 hora.',     color: 'blue'   },
  dia:         { desc: 'Tarifa plana por día, sin importar cuánto tiempo.', color: 'green'  },
  mensualidad: { desc: 'Acceso ilimitado por un mes calendario.',             color: 'purple' },
}

const COLOR_MAP: Record<ColorKey, { bg: string; border: string; badge: string }> = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700'   },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  badge: 'bg-green-100 text-green-700'  },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
}

export default function Tarifas({ tarifas, onActualizar }: Props) {
  return (
    <div className="space-y-4">
      {tarifas.map(tarifa => (
        <TarifaCard key={tarifa.id} tarifa={tarifa} onActualizar={onActualizar} />
      ))}
    </div>
  )
}

function TarifaCard({ tarifa, onActualizar }: { tarifa: Tarifa; onActualizar: (id: string, monto: number) => Promise<boolean> }) {
  const [editando, setEditando] = useState(false)
  const [monto,    setMonto]    = useState(String(tarifa.monto))
  const [loading,  setLoading]  = useState(false)

  const info     = TIPO_INFO[tarifa.tipo]
  const colorMap = COLOR_MAP[info.color]

  const handleSave = async () => {
    const val = Number(monto)
    if (isNaN(val) || val < 0) return
    setLoading(true)
    const ok = await onActualizar(tarifa.id, val)
    setLoading(false)
    if (ok) setEditando(false)
  }

  const handleCancel = () => {
    setMonto(String(tarifa.monto))
    setEditando(false)
  }

  return (
    <div className={`${colorMap.bg} ${colorMap.border} border-2 rounded-2xl p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-sm font-bold ${colorMap.badge}`}>
              {TIPO_LABELS[tarifa.tipo]}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">{info.desc}</p>
        </div>

        <div className="text-right shrink-0">
          {editando ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">$</span>
                <input
                  type="number"
                  value={monto}
                  onChange={e => setMonto(e.target.value)}
                  min="0"
                  step="500"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
                  className="w-32 pl-7 pr-3 py-2 rounded-xl border-2 border-slate-300 focus:border-orange-400 focus:outline-none text-sm font-bold text-right"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <Save size={15} />
                {loading ? '…' : 'Guardar'}
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-2 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-medium hover:bg-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-slate-900">{formatCOP(tarifa.monto)}</span>
              <button
                onClick={() => setEditando(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-slate-300 text-slate-600 text-sm font-medium hover:bg-white transition-colors"
              >
                <Edit2 size={14} />
                Editar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
