import { useState, useEffect } from 'react'
import { X, Printer, CheckCircle, FileText, Banknote, Smartphone } from 'lucide-react'
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

  useEffect(() => {
    if (!atendidoPor && operarioPorDefecto) setAtendidoPor(operarioPorDefecto)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operarioPorDefecto])

  useEffect(() => { localStorage.setItem(STORAGE_KEY, atendidoPor) }, [atendidoPor])

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const esMensualidad = moto.tipo === 'mensualidad'
  const monto         = esMensualidad ? 0 : calcularMonto(moto.hora_entrada, ahora, moto.tipo, tarifasMap)
  const duracion      = formatDuracion(moto.hora_entrada, ahora)

  const abrirTiquete = (horaSalidaFinal: Date) => {
    const html = generarTiqueteSalida({
      numeroTiquete: moto.numero_tiquete,
      placa:         moto.placa,
      espacio:       moto.espacio,
      tipo:          moto.tipo,
      horaEntrada:   moto.hora_entrada,
      horaSalida:    horaSalidaFinal,
      monto,
      metodoPago:    esMensualidad ? null : metodoPago,
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
    const ok = await onConfirm(moto.id, moto.placa, monto, metodoPago, atendidoPor)
    setLoading(false)
    if (ok) {
      if (imprimir) abrirTiquete(horaSalidaFinal)
      onClose()
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="pm-modal-shell" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ backgroundColor: 'var(--blue-700)', color: 'var(--white)' }}
        >
          <div>
            <h2 className="text-base font-bold leading-none">Registrar salida</h2>
            <p className="text-[12px] mt-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Espacio <span className="font-bold" style={{ color: 'var(--yellow-400)' }}>#{moto.espacio}</span>
              {moto.numero_tiquete && (
                <span className="ml-2">· Tiquete #{formatNumeroTiquete(moto.numero_tiquete)}</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ color: 'rgba(255,255,255,0.7)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--white)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Placa */}
          <div
            className="text-center py-4 mb-4"
            style={{
              background: 'linear-gradient(135deg, var(--blue-700), var(--blue-900))',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div
              className="text-[26px] font-bold tracking-[0.18em]"
              style={{ color: 'var(--white)', fontFamily: '"JetBrains Mono", "Courier New", monospace' }}
            >
              {moto.placa}
            </div>
            {moto.propietario && (
              <div className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {moto.propietario}
              </div>
            )}
          </div>

          {/* Notas */}
          {moto.notas && (
            <div
              className="mb-4 flex gap-2 px-3 py-2.5 text-[13px]"
              style={{
                backgroundColor: '#FEF9C3',
                color: '#854D0E',
                border: '1px solid #FDE68A',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <FileText size={14} className="shrink-0 mt-0.5" />
              <span>{moto.notas}</span>
            </div>
          )}

          {/* Detail rows */}
          <div className="space-y-1.5 mb-4">
            <DetailRow label="Entrada"  value={formatFecha(moto.hora_entrada)} />
            <DetailRow label="Salida"   value={ahora.toLocaleString('es-CO', { hour12: false })} />
            <DetailRow label="Duración" value={duracion} mono />
            <DetailRow label="Tarifa"   value={TIPO_LABELS[moto.tipo]} />
            {esMensualidad && moto.fecha_vencimiento && (
              <DetailRow
                label="Vence"
                value={new Date(moto.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-CO')}
              />
            )}
          </div>

          {/* Monto box */}
          {esMensualidad ? (
            <div
              className="text-center mb-4"
              style={{
                background: 'linear-gradient(135deg, var(--blue-700), var(--blue-900))',
                borderRadius: 'var(--radius-md)',
                padding: 20,
              }}
            >
              <div
                className="text-[11px] font-semibold uppercase mb-1.5"
                style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em' }}
              >
                Mensualidad
              </div>
              <div className="text-xl font-bold" style={{ color: 'var(--yellow-400)' }}>
                Sin cobro adicional
              </div>
              <div className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                El pago fue registrado al entrar
              </div>
            </div>
          ) : (
            <div
              className="text-center mb-4"
              style={{
                background: 'linear-gradient(135deg, var(--blue-700), var(--blue-900))',
                borderRadius: 'var(--radius-md)',
                padding: 20,
              }}
            >
              <div
                className="text-[11px] font-semibold uppercase mb-1.5"
                style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em' }}
              >
                Total a cobrar
              </div>
              <div
                className="text-[36px] font-extrabold leading-none tabular-nums"
                style={{ color: 'var(--yellow-400)' }}
              >
                {formatCOP(monto)}
              </div>
              <div className="text-[13px] mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {duracion}
              </div>
            </div>
          )}

          {/* Payment method */}
          {!esMensualidad && (
            <div className="mb-4">
              <label
                className="block text-[11px] font-semibold uppercase mb-2"
                style={{ color: 'var(--gray-400)', letterSpacing: '0.06em' }}
              >
                Método de pago
              </label>
              <div className="flex gap-2 w-full">
                <MethodButton
                  active={metodoPago === 'efectivo'}
                  onClick={() => setMetodoPago('efectivo')}
                  icon={<Banknote size={16} />}
                  label="Efectivo"
                />
                <MethodButton
                  active={metodoPago === 'transferencia'}
                  onClick={() => setMetodoPago('transferencia')}
                  icon={<Smartphone size={16} />}
                  label="Transferencia"
                />
              </div>
            </div>
          )}

          {/* Atendido por */}
          <div className="mb-5">
            <label
              className="block text-[11px] font-semibold uppercase mb-2"
              style={{ color: 'var(--gray-400)', letterSpacing: '0.06em' }}
            >
              Atendido por
            </label>
            <input
              type="text"
              value={atendidoPor}
              onChange={e => setAtendidoPor(e.target.value)}
              placeholder="Nombre del operario"
              className="w-full"
              style={{
                border: '1.5px solid var(--gray-100)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                fontSize: 14,
                outline: 'none',
                transition: 'var(--transition)',
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

          {/* Actions: stacked on mobile, row on desktop */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sticky bottom-0 bg-white pt-3 -mx-6 px-6 -mb-6 pb-6 sm:static sm:bg-transparent sm:pt-0 sm:mx-0 sm:px-0 sm:mb-0 sm:pb-0" style={{ borderTop: '1px solid var(--gray-50)' }}>
            <button
              type="button"
              onClick={onClose}
              className="hidden sm:block font-semibold transition-colors text-[13px]"
              style={{
                padding: '13px 18px',
                border: '1.5px solid var(--gray-100)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--gray-400)',
                backgroundColor: 'transparent',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={() => handleCobrar(false)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 font-semibold transition-all disabled:opacity-50 text-[13px]"
              style={{
                padding: '14px 16px',
                border: '1.5px solid var(--blue-700)',
                color: 'var(--blue-700)',
                backgroundColor: 'transparent',
                borderRadius: 'var(--radius-sm)',
                minHeight: 48,
              }}
            >
              <CheckCircle size={15} />
              Cobrar
            </button>
            <button
              onClick={() => handleCobrar(true)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 font-bold transition-all disabled:opacity-50 text-[14px]"
              style={{
                padding: '14px 16px',
                backgroundColor: 'var(--yellow-400)',
                color: 'var(--blue-900)',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                minHeight: 48,
              }}
            >
              <Printer size={15} />
              {loading ? '…' : 'Cobrar e imprimir'}
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div
      className="flex items-center justify-between py-1.5"
      style={{ borderBottom: '1px solid var(--gray-50)' }}
    >
      <span className="text-[12px]" style={{ color: 'var(--gray-400)' }}>{label}</span>
      <span
        className={`text-[13px] font-medium ${mono ? 'font-mono tabular-nums' : ''}`}
        style={{ color: 'var(--blue-900)' }}
      >
        {value}
      </span>
    </div>
  )
}

function MethodButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 transition-all"
      style={{
        padding: 12,
        borderRadius: 'var(--radius-sm)',
        border: active ? '1.5px solid var(--blue-700)' : '1.5px solid var(--gray-100)',
        backgroundColor: active ? 'var(--blue-700)' : 'var(--white)',
        color: active ? 'var(--white)' : 'var(--gray-600)',
        fontWeight: active ? 600 : 500,
        fontSize: 13,
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="pm-modal-wrap"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {children}
    </div>
  )
}
