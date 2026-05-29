import { useState, useEffect } from 'react'
import { X, Printer, CheckCircle, Clock, Bike } from 'lucide-react'
import {
  calcularMonto,
  formatDuracion,
  formatFecha,
  formatCOP,
  TIPO_LABELS,
  generarHTMLRecibo,
} from '../lib/helpers'
import type { Moto, TarifasMap } from '../types'

interface Props {
  moto: Moto
  tarifasMap: TarifasMap
  onClose: () => void
  onConfirm: (motoId: string, placa: string, monto: number) => Promise<boolean>
}

export default function SalidaModal({ moto, tarifasMap, onClose, onConfirm }: Props) {
  const [ahora,   setAhora]   = useState(new Date())
  const [loading, setLoading] = useState(false)

  // Tick every second for live amount
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const monto    = calcularMonto(moto.hora_entrada, ahora, moto.tipo, tarifasMap)
  const duracion = formatDuracion(moto.hora_entrada, ahora)

  const handleConfirmar = async () => {
    setLoading(true)
    const ok = await onConfirm(moto.id, moto.placa, monto)
    setLoading(false)
    if (ok) onClose()
  }

  const handleImprimir = () => {
    const html = generarHTMLRecibo({
      placa:       moto.placa,
      propietario: moto.propietario,
      tipo:        moto.tipo,
      horaEntrada: moto.hora_entrada,
      horaSalida:  ahora.toISOString(),
      monto,
      espacio:     moto.espacio,
    })
    const win = window.open('', '_blank', 'width=380,height=600,menubar=no,toolbar=no')
    if (win) {
      win.document.write(html)
      win.document.close()
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <Bike size={20} className="text-slate-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Registrar Salida</h2>
              <p className="text-sm text-slate-500">Espacio <span className="font-bold">#{moto.espacio}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Placa */}
        <div className="text-center py-4 mb-4 bg-slate-900 rounded-xl">
          <div className="text-3xl font-bold tracking-widest text-white">{moto.placa}</div>
          {moto.propietario && (
            <div className="text-slate-400 text-sm mt-1">{moto.propietario}</div>
          )}
        </div>

        {/* Detail rows */}
        <div className="space-y-3 mb-6">
          <DetailRow
            icon={<Clock size={16} />}
            label="Entrada"
            value={formatFecha(moto.hora_entrada)}
          />
          <DetailRow
            icon={<Clock size={16} />}
            label="Salida"
            value={ahora.toLocaleString('es-CO', { hour12: false })}
          />
          <DetailRow
            icon={<span className="text-xs font-bold">⏱</span>}
            label="Duración"
            value={<span className="font-mono font-bold text-slate-800">{duracion}</span>}
          />
          <DetailRow
            label="Tarifa"
            value={TIPO_LABELS[moto.tipo]}
          />
        </div>

        {/* Monto */}
        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 text-center mb-6">
          <div className="text-sm text-orange-700 font-semibold mb-1">TOTAL A COBRAR</div>
          <div className="text-4xl font-bold text-orange-600">{formatCOP(monto)}</div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleImprimir}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
          >
            <Printer size={18} />
            Recibo
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle size={18} />
            {loading ? 'Procesando…' : 'Cobrar y liberar'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="flex items-center gap-2 text-sm text-slate-500">
        {icon}
        {label}
      </span>
      <span className="text-sm text-slate-800">{value}</span>
    </div>
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
