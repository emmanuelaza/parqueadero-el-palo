import { useState, useEffect } from 'react'
import { X, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import {
  normalizarPlaca, TIPO_LABELS, formatCOP, addDias, fechaHoyBogota,
  generarTiqueteEntrada,
} from '../lib/helpers'
import { useConfig } from '../context/ConfiguracionContext'
import type { TarifaTipo, TarifasMap } from '../types'

interface Props {
  espacio: number
  tarifasMap: TarifasMap
  tipoForzado?: TarifaTipo
  onClose: () => void
  onConfirm: (datos: {
    placa: string
    propietario?: string
    telefono?: string
    tipo: TarifaTipo
    espacio: number
    notas?: string
    monto_cobrado?: number
    pagado?: boolean
    fecha_vencimiento?: string
    numero_tiquete?: number
  }) => Promise<boolean>
}

const TIPOS: TarifaTipo[] = ['hora', 'dia', 'mensualidad']

interface MensActiva { fecha_vencimiento: string }

export default function EntradaModal({ espacio, tarifasMap, tipoForzado, onClose, onConfirm }: Props) {
  const { nombreParqueadero, direccion } = useConfig()

  const [placa,        setPlaca]       = useState('')
  const [tipo,         setTipo]        = useState<TarifaTipo>(tipoForzado ?? 'hora')
  const [propietario,  setPropietario] = useState('')
  const [telefono,     setTelefono]    = useState('')
  const [notas,        setNotas]       = useState('')
  const [loading,      setLoading]     = useState(false)
  const [mensActiva,   setMensActiva]  = useState<MensActiva | null | undefined>(null)
  const [checkingMens, setCheckingMens] = useState(false)

  useEffect(() => {
    if (tipo !== 'mensualidad' || placa.trim().length < 3) {
      setMensActiva(null)
      return
    }
    setCheckingMens(true)
    const timer = setTimeout(async () => {
      const hoy = fechaHoyBogota()
      const { data } = await supabase
        .from('motos')
        .select('fecha_vencimiento')
        .ilike('placa', normalizarPlaca(placa))
        .eq('tipo', 'mensualidad')
        .gt('fecha_vencimiento', hoy)
        .order('fecha_vencimiento', { ascending: false })
        .limit(1)
        .maybeSingle()
      setMensActiva(data ? { fecha_vencimiento: data.fecha_vencimiento as string } : undefined)
      setCheckingMens(false)
    }, 400)
    return () => { clearTimeout(timer); setCheckingMens(false) }
  }, [placa, tipo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!placa.trim()) return

    const esMensualidad = tipo === 'mensualidad'
    const tieneActiva   = esMensualidad && !!mensActiva

    const monto = esMensualidad ? (tieneActiva ? 0 : tarifasMap.mensualidad) : undefined
    const vencimiento = esMensualidad && !tieneActiva
      ? addDias(new Date(), 30).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
      : undefined

    setLoading(true)
    const { data: numData, error: numError } = await supabase.rpc('siguiente_tiquete')
    if (numError) {
      toast.error('Error generando número de tiquete')
      setLoading(false)
      return
    }
    const numeroTiquete = numData as number

    const ok = await onConfirm({
      placa:             normalizarPlaca(placa),
      propietario:       propietario.trim() || undefined,
      telefono:          telefono.trim()    || undefined,
      tipo,
      espacio,
      notas:             notas.trim()       || undefined,
      monto_cobrado:     monto,
      pagado:            esMensualidad      ? true : undefined,
      fecha_vencimiento: vencimiento,
      numero_tiquete:    numeroTiquete,
    })
    setLoading(false)

    if (ok) {
      const html = generarTiqueteEntrada({
        numeroTiquete,
        placa:        normalizarPlaca(placa),
        espacio,
        tipo,
        horaEntrada:  new Date(),
        nombreParqueadero,
        direccion,
      })
      const win = window.open('', '_blank', 'width=380,height=600,menubar=no,toolbar=no')
      if (win) { win.document.write(html); win.document.close() }
      onClose()
    }
  }

  const botonLabel = (() => {
    if (loading) return 'Registrando…'
    if (tipo !== 'mensualidad') return 'Registrar entrada'
    if (mensActiva) return 'Registrar entrada (sin cobro)'
    return `Cobrar ${formatCOP(tarifasMap.mensualidad)}`
  })()

  return (
    <Overlay onClose={onClose}>
      <div className="pm-modal-shell" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{
            backgroundColor: 'var(--blue-700)',
            color: 'var(--white)',
          }}
        >
          <div>
            <h2 className="text-base font-bold leading-none">Registrar entrada</h2>
            <p className="text-[12px] mt-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Espacio <span className="font-bold" style={{ color: 'var(--yellow-400)' }}>#{espacio}</span>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Placa */}
          <Field label="Placa" required>
            <input
              type="text"
              value={placa}
              onChange={e => setPlaca(e.target.value)}
              placeholder="ABC123"
              required
              autoFocus
              maxLength={10}
              className="pm-input pm-input-placa w-full"
              style={inputStyle({ big: true })}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </Field>

          {/* Tipo */}
          <div>
            <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--blue-900)' }}>
              Tipo de tarifa
            </label>
            <div className="flex gap-2 w-full">
              {TIPOS.map(t => {
                const active = tipo === t
                const disabled = !!tipoForzado && tipoForzado !== t
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={disabled}
                    onClick={() => setTipo(t)}
                    className="flex-1 transition-all disabled:opacity-30 text-center"
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
                    <div>{TIPO_LABELS[t]}</div>
                    <div
                      className="text-[11px] font-normal mt-1"
                      style={{ color: active ? 'rgba(255,255,255,0.75)' : 'var(--gray-400)' }}
                    >
                      {formatCOP(tarifasMap[t])}
                    </div>
                  </button>
                )
              })}
            </div>

            {tipo === 'mensualidad' && (
              <div className="mt-2.5">
                {checkingMens && (
                  <div className="text-[12px]" style={{ color: 'var(--gray-400)' }}>
                    Verificando mensualidad…
                  </div>
                )}

                {!checkingMens && mensActiva && (
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 text-[13px]"
                    style={{
                      backgroundColor: '#DCFCE7',
                      color: '#15803D',
                      border: '1px solid #86EFAC',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <CheckCircle size={15} className="shrink-0" />
                    <span>
                      <strong>Mensualista activo</strong>{' '}hasta{' '}
                      {new Date(mensActiva.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-CO')}
                    </span>
                  </div>
                )}

                {!checkingMens && mensActiva === undefined && placa.trim().length >= 3 && (
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 text-[13px]"
                    style={{
                      backgroundColor: '#FEF9C3',
                      color: '#854D0E',
                      border: '1px solid #FDE68A',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <AlertCircle size={15} className="shrink-0" />
                    <span>
                      <strong>Nueva mensualidad:</strong>{' '}
                      {formatCOP(tarifasMap.mensualidad)} · vence en 30 días
                    </span>
                  </div>
                )}

                {!checkingMens && mensActiva === null && (
                  <div
                    className="px-3 py-2 text-[12px]"
                    style={{
                      color: 'var(--gray-400)',
                      backgroundColor: 'var(--gray-50)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    Escribe la placa para verificar mensualidad
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nombre */}
          <Field label="Nombre" optional>
            <input
              type="text"
              value={propietario}
              onChange={e => setPropietario(e.target.value)}
              placeholder="Nombre del cliente"
              className="w-full"
              style={inputStyle()}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </Field>

          {/* Teléfono */}
          <Field label="Teléfono" optional>
            <input
              type="tel"
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              placeholder="300 000 0000"
              className="w-full"
              style={inputStyle()}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </Field>

          {/* Notas */}
          <Field label="Notas" optional>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Observaciones…"
              rows={2}
              className="w-full resize-none"
              style={inputStyle()}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </Field>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="font-semibold transition-colors sm:flex-1"
              style={{
                padding: '13px 24px',
                border: '1.5px solid var(--gray-100)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--gray-400)',
                backgroundColor: 'transparent',
                fontSize: 14,
                minHeight: 48,
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !placa.trim() || (tipo === 'mensualidad' && checkingMens)}
              className="font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed sm:flex-1"
              style={{
                padding: '13px 24px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: tipo === 'mensualidad' && mensActiva ? 'var(--success)' : 'var(--yellow-400)',
                color: tipo === 'mensualidad' && mensActiva ? 'var(--white)' : 'var(--blue-900)',
                fontSize: 15,
                border: 'none',
                minHeight: 48,
              }}
            >
              {botonLabel}
            </button>
          </div>

          <p className="text-center text-[11px]" style={{ color: 'var(--gray-400)' }}>
            El tiquete se imprime automáticamente al confirmar
          </p>
        </form>
      </div>
    </Overlay>
  )
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  optional,
  children,
}: {
  label: string
  required?: boolean
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--blue-900)' }}>
        {label}
        {required && <span style={{ color: 'var(--danger)' }}> *</span>}
        {optional && (
          <span className="font-normal ml-1" style={{ color: 'var(--gray-400)' }}>
            (opcional)
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

function inputStyle({ big }: { big?: boolean } = {}): React.CSSProperties {
  return {
    border: '1.5px solid var(--gray-100)',
    borderRadius: 'var(--radius-sm)',
    padding: big ? '14px 16px' : '10px 14px',
    fontSize: big ? 19 : 15,
    fontWeight: big ? 700 : 400,
    letterSpacing: big ? '0.08em' : 'normal',
    textTransform: big ? ('uppercase' as const) : ('none' as const),
    outline: 'none',
    transition: 'var(--transition)',
    color: 'var(--blue-900)',
    fontFamily: big ? '"JetBrains Mono", "Courier New", monospace' : 'inherit',
  }
}

function inputFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = 'var(--blue-700)'
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(27,47,190,0.1)'
}
function inputBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = 'var(--gray-100)'
  e.currentTarget.style.boxShadow = 'none'
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
