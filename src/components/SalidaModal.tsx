import { useState, useEffect } from 'react'
import { X, Printer, CheckCircle, Clock, FileText, Banknote, Smartphone } from 'lucide-react'
import {
  calcularMonto,
  formatDuracion,
  formatFecha,
  formatCOP,
  TIPO_LABELS,
  formatNumeroTiquete,
  generarTiqueteSalida,
} from '../lib/helpers'
import { useConfig } from '../context/ConfiguracionContext'
import type { Moto, TarifasMap } from '../types'

const STORAGE_KEY = 'parking_operario'

interface Props {
  moto: Moto
  tarifasMap: TarifasMap
  onClose: () => void
  onConfirm: (
    motoId: string,
    placa: string,
    monto: number,
    metodoPago: 'efectivo' | 'transferencia',
    atendidoPor: string,
  ) => Promise<boolean>
}

export default function SalidaModal({ moto, tarifasMap, onClose, onConfirm }: Props) {
  const { nombreParqueadero, direccion, operarioPorDefecto } = useConfig()
  const [ahora,       setAhora]       = useState(new Date())
  const [loading,     setLoading]     = useState(false)
  const [metodoPago,  setMetodoPago]  = useState<'efectivo' | 'transferencia'>('efectivo')
  const [atendidoPor, setAtendidoPor] = useState(
    () => localStorage.getItem(STORAGE_KEY) ?? ''
  )

  // Pre-fill operario from config if localStorage is empty
  useEffect(() => {
    if (!atendidoPor && operarioPorDefecto) {
      setAtendidoPor(operarioPorDefecto)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operarioPorDefecto])

  // Persist operario to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, atendidoPor)
  }, [atendidoPor])

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const esMensualidad = moto.tipo === 'mensualidad'
  const monto         = esMensualidad ? 0 : calcularMonto(moto.hora_entrada, ahora, moto.tipo, tarifasMap)
  const duracion      = formatDuracion(moto.hora_entrada, ahora)

  const abrirTiquete = (horaSalidaFinal: Date) => {
    const html = generarTiqueteSalida({
      numeroTiquete:    moto.numero_tiquete,
      placa:            moto.placa,
      espacio:          moto.espacio,
      tipo:             moto.tipo,
      horaEntrada:      moto.hora_entrada,
      horaSalida:       horaSalidaFinal,
      monto,
      metodoPago:       esMensualidad ? null : metodoPago,
      atendidoPor,
      nombreParqueadero,
      direccion,
    })
    const win = window.open('', '_blank', 'width=380,height=600,menubar=no,toolbar=no')
    if (win) { win.document.write(html); win.document.close() }
  }

  const handleCobrar = async (imprimir: boolean) => {
    setLoading(true)
    const horaSalidaFinal = new Date()
    const ok = await onConfirm(
      moto.id,
      moto.placa,
      monto,
      metodoPago,
      atendidoPor,
    )
    setLoading(false)
    if (ok) {
      if (imprimir) abrirTiquete(horaSalidaFinal)
      onClose()
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <Clock size={20} className="text-slate-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Registrar Salida</h2>
              <p className="text-sm text-slate-500">
                Espacio <span className="font-bold">#{moto.espacio}</span>
                {moto.numero_tiquete && (
                  <span className="ml-2 text-slate-400">· Tiquete #{formatNumeroTiquete(moto.numero_tiquete)}</span>
                )}
              </p>
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

        {/* Notas */}
        {moto.notas && (
          <div className="mb-4 flex gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <FileText size={15} className="shrink-0 mt-0.5 text-amber-600" />
            <span>{moto.notas}</span>
          </div>
        )}

        {/* Detail rows */}
        <div className="space-y-2 mb-4">
          <DetailRow label="Entrada"  value={formatFecha(moto.hora_entrada)} />
          <DetailRow label="Salida"   value={ahora.toLocaleString('es-CO', { hour12: false })} />
          <DetailRow label="Duración" value={<span className="font-mono font-bold text-slate-800">{duracion}</span>} />
          <DetailRow label="Tarifa"   value={TIPO_LABELS[moto.tipo]} />
          {esMensualidad && moto.fecha_vencimiento && (
            <DetailRow label="Vence" value={new Date(moto.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-CO')} />
          )}
        </div>

        {/* Monto */}
        {esMensualidad ? (
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 text-center mb-4">
            <div className="text-sm text-purple-700 font-semibold mb-1">MENSUALIDAD</div>
            <div className="text-xl font-bold text-purple-700">Sin cobro adicional</div>
            <div className="text-xs text-purple-500 mt-1">El pago fue registrado al entrar</div>
          </div>
        ) : (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 text-center mb-4">
            <div className="text-sm text-orange-700 font-semibold mb-1">TOTAL A COBRAR</div>
            <div className="text-4xl font-bold text-orange-600">{formatCOP(monto)}</div>
          </div>
        )}

        {/* Método de pago (solo para no-mensualidad) */}
        {!esMensualidad && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Método de pago
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMetodoPago('efectivo')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                  metodoPago === 'efectivo'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Banknote size={16} />
                Efectivo
              </button>
              <button
                type="button"
                onClick={() => setMetodoPago('transferencia')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                  metodoPago === 'transferencia'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Smartphone size={16} />
                Transferencia
              </button>
            </div>
          </div>
        )}

        {/* Atendido por */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Atendido por
          </label>
          <input
            type="text"
            value={atendidoPor}
            onChange={e => setAtendidoPor(e.target.value)}
            placeholder="Nombre del operario"
            className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-orange-400 focus:outline-none text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={() => handleCobrar(false)}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
              esMensualidad ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <CheckCircle size={16} />
            {loading ? 'Procesando…' : 'Cobrar'}
          </button>
          <button
            onClick={() => handleCobrar(true)}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
              esMensualidad ? 'bg-purple-500 hover:bg-purple-600' : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            <Printer size={16} />
            {loading ? '…' : 'Cobrar e imprimir'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
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
