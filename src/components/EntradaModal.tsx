import { useState } from 'react'
import { X, Bike } from 'lucide-react'
import { normalizarPlaca, TIPO_LABELS } from '../lib/helpers'
import type { TarifaTipo, TarifasMap } from '../types'

interface Props {
  espacio: number
  tarifasMap: TarifasMap
  onClose: () => void
  onConfirm: (datos: {
    placa: string
    propietario?: string
    telefono?: string
    tipo: TarifaTipo
    espacio: number
  }) => Promise<boolean>
}

const TIPOS: TarifaTipo[] = ['hora', 'dia', 'mensualidad']

export default function EntradaModal({ espacio, tarifasMap, onClose, onConfirm }: Props) {
  const [placa,       setPlaca]       = useState('')
  const [propietario, setPropietario] = useState('')
  const [telefono,    setTelefono]    = useState('')
  const [tipo,        setTipo]        = useState<TarifaTipo>('hora')
  const [loading,     setLoading]     = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!placa.trim()) return

    setLoading(true)
    const ok = await onConfirm({
      placa:        normalizarPlaca(placa),
      propietario:  propietario.trim() || undefined,
      telefono:     telefono.trim()    || undefined,
      tipo,
      espacio,
    })
    setLoading(false)
    if (ok) onClose()
  }

  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Bike size={20} className="text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Registrar Entrada</h2>
              <p className="text-sm text-slate-500">Espacio <span className="font-bold text-orange-600">#{espacio}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Placa */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Placa <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={placa}
              onChange={e => setPlaca(e.target.value)}
              placeholder="ABC123"
              required
              autoFocus
              maxLength={10}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-orange-400 focus:outline-none text-lg font-bold uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal placeholder:font-normal"
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          {/* Tipo de tarifa */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de tarifa</label>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`py-3 px-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                    tipo === t
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div>{TIPO_LABELS[t]}</div>
                  <div className={`text-xs font-normal mt-0.5 ${tipo === t ? 'text-orange-500' : 'text-slate-400'}`}>
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(tarifasMap[t])}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Propietario (opcional) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Propietario <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={propietario}
              onChange={e => setPropietario(e.target.value)}
              placeholder="Nombre del cliente"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-orange-400 focus:outline-none"
            />
          </div>

          {/* Teléfono (opcional) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Teléfono <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              placeholder="300 000 0000"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-orange-400 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !placa.trim()}
              className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Registrando…' : 'Registrar entrada'}
            </button>
          </div>
        </form>
      </div>
    </Overlay>
  )
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {children}
    </div>
  )
}
