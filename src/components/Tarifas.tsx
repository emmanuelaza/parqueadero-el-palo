import { useState } from 'react'
import { Save, Edit2 } from 'lucide-react'
import { formatCOP, TIPO_LABELS } from '../lib/helpers'
import type { Tarifa, TarifaTipo } from '../types'

interface Props {
  tarifas: Tarifa[]
  onActualizar: (id: string, monto: number) => Promise<boolean>
}

const TIPO_DESC: Record<TarifaTipo, string> = {
  hora:        'Fracción de hora = hora completa. Mínimo 1 hora.',
  dia:         'Tarifa plana por día, sin importar cuánto tiempo.',
  mensualidad: 'Acceso ilimitado por un mes calendario.',
}

const TIPO_BADGE: Record<TarifaTipo, { bg: string; color: string }> = {
  hora:        { bg: '#DBEAFE', color: '#1B2FBE' },
  dia:         { bg: '#DCFCE7', color: '#15803D' },
  mensualidad: { bg: '#FEF3C7', color: '#854D0E' },
}

export default function Tarifas({ tarifas, onActualizar }: Props) {
  return (
    <div className="space-y-3">
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

  const badge = TIPO_BADGE[tarifa.tipo]

  const handleSave = async () => {
    const val = Number(monto)
    if (isNaN(val) || val < 0) return
    setLoading(true)
    const ok = await onActualizar(tarifa.id, val)
    setLoading(false)
    if (ok) setEditando(false)
  }

  const handleCancel = () => { setMonto(String(tarifa.monto)); setEditando(false) }

  return (
    <div
      className="p-5 flex items-center justify-between gap-4"
      style={{
        backgroundColor: 'var(--white)',
        border: '1px solid var(--gray-100)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div className="flex-1">
        <span
          className="inline-block px-2.5 py-0.5 text-[11px] font-bold uppercase"
          style={{
            backgroundColor: badge.bg,
            color: badge.color,
            borderRadius: 999,
            letterSpacing: '0.04em',
          }}
        >
          {TIPO_LABELS[tarifa.tipo]}
        </span>
        <p className="text-[13px] mt-2" style={{ color: 'var(--gray-600)' }}>
          {TIPO_DESC[tarifa.tipo]}
        </p>
      </div>

      <div className="shrink-0">
        {editando ? (
          <div className="flex items-center gap-2">
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold"
                style={{ color: 'var(--gray-400)' }}
              >$</span>
              <input
                type="number"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                min="0"
                step="500"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
                style={{
                  width: 130,
                  paddingLeft: 26,
                  paddingRight: 12,
                  paddingTop: 8,
                  paddingBottom: 8,
                  border: '1.5px solid var(--gray-100)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14,
                  fontWeight: 700,
                  textAlign: 'right',
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
            </div>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-1.5 font-bold transition-colors disabled:opacity-50 text-[13px]"
              style={{
                padding: '8px 14px',
                backgroundColor: 'var(--yellow-400)',
                color: 'var(--blue-900)',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
              }}
            >
              <Save size={13} />
              {loading ? '…' : 'Guardar'}
            </button>
            <button
              onClick={handleCancel}
              className="font-semibold transition-colors text-[13px]"
              style={{
                padding: '8px 12px',
                border: '1.5px solid var(--gray-100)',
                color: 'var(--gray-400)',
                backgroundColor: 'transparent',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-2xl font-extrabold tabular-nums" style={{ color: 'var(--blue-900)' }}>
              {formatCOP(tarifa.monto)}
            </span>
            <button
              onClick={() => setEditando(true)}
              className="flex items-center gap-1.5 font-medium transition-colors text-[13px]"
              style={{
                padding: '8px 12px',
                border: '1.5px solid var(--gray-100)',
                color: 'var(--blue-700)',
                backgroundColor: 'transparent',
                borderRadius: 'var(--radius-sm)',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--gray-50)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Edit2 size={13} />
              Editar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
