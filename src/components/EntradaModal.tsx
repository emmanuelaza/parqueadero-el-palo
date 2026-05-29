import { useState, useEffect } from 'react'
import { X, Bike, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import {
  normalizarPlaca, TIPO_LABELS, formatCOP, addDias,
  generarTiqueteEntrada, formatNumeroTiquete,
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

interface MensActiva {
  fecha_vencimiento: string | null
}

export default function EntradaModal({ espacio, tarifasMap, tipoForzado, onClose, onConfirm }: Props) {
  const { nombreParqueadero, direccion } = useConfig()

  const [placa,       setPlaca]       = useState('')
  const [tipo,        setTipo]        = useState<TarifaTipo>(tipoForzado ?? 'hora')
  const [propietario, setPropietario] = useState('')
  const [telefono,    setTelefono]    = useState('')
  const [notas,       setNotas]       = useState('')
  const [loading,     setLoading]     = useState(false)

  const [mensActiva,  setMensActiva]  = useState<MensActiva | null>(null)
  const [checkingMens, setCheckingMens] = useState(false)

  // Verifica si hay mensualidad activa cuando tipo = mensualidad y placa tiene chars
  useEffect(() => {
    if (tipo !== 'mensualidad' || placa.length < 3) {
      setMensActiva(null)
      return
    }
    setCheckingMens(true)
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('motos')
        .select('fecha_vencimiento')
        .eq('placa', normalizarPlaca(placa))
        .eq('tipo', 'mensualidad')
        .is('hora_salida', null)
        .maybeSingle()
      setMensActiva(data ?? null)
      setCheckingMens(false)
    }, 400)
    return () => { clearTimeout(timer); setCheckingMens(false) }
  }, [placa, tipo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!placa.trim()) return

    const esMensualidad = tipo === 'mensualidad'

    // Confirm if active mensualidad already exists
    if (esMensualidad && mensActiva) {
      const vence = mensActiva.fecha_vencimiento
        ? new Date(mensActiva.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-CO')
        : 'fecha desconocida'
      const ok = window.confirm(
        `${normalizarPlaca(placa)} ya tiene mensualidad activa (vence ${vence}).\n\n¿Registrar nueva mensualidad de todas formas?`
      )
      if (!ok) return
    }

    const monto      = esMensualidad ? tarifasMap.mensualidad : undefined
    const vencimiento = esMensualidad
      ? addDias(new Date(), 30).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
      : undefined

    setLoading(true)

    // Obtener número de tiquete
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
      // Auto-print entry ticket
      const html = generarTiqueteEntrada({
        numeroTiquete,
        placa:             normalizarPlaca(placa),
        espacio,
        tipo,
        horaEntrada:       new Date(),
        nombreParqueadero,
        direccion,
      })
      const win = window.open('', '_blank', 'width=380,height=600,menubar=no,toolbar=no')
      if (win) { win.document.write(html); win.document.close() }
      onClose()
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Bike size={20} className="text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Registrar Entrada</h2>
              <p className="text-sm text-slate-500">
                Espacio <span className="font-bold text-orange-600">#{espacio}</span>
              </p>
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
              style={{ textTransform: 'uppercase' }}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-orange-400 focus:outline-none text-lg font-bold uppercase tracking-widest"
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
                  disabled={!!tipoForzado && tipoForzado !== t}
                  onClick={() => setTipo(t)}
                  className={`py-3 px-2 rounded-xl border-2 text-sm font-semibold transition-all disabled:opacity-30 ${
                    tipo === t
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div>{TIPO_LABELS[t]}</div>
                  <div className={`text-xs font-normal mt-0.5 ${tipo === t ? 'text-orange-500' : 'text-slate-400'}`}>
                    {formatCOP(tarifasMap[t])}
                  </div>
                </button>
              ))}
            </div>

            {/* Mensualidad info/warning */}
            {tipo === 'mensualidad' && (
              <div className="mt-2 space-y-1.5">
                <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl text-sm text-purple-700">
                  <span className="font-semibold">{formatCOP(tarifasMap.mensualidad)}</span>
                  {' '}se cobra ahora · vence en 30 días
                </div>
                {checkingMens && (
                  <div className="px-3 py-1.5 text-xs text-slate-400">Verificando mensualidad…</div>
                )}
                {!checkingMens && mensActiva && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-300 rounded-xl text-sm text-green-800">
                    <CheckCircle size={14} className="shrink-0 text-green-600" />
                    <span>
                      <strong>MENS. ACTIVO</strong>
                      {mensActiva.fecha_vencimiento && (
                        <> · Vence {new Date(mensActiva.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-CO')}</>
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Propietario */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Nombre <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={propietario}
              onChange={e => setPropietario(e.target.value)}
              placeholder="Nombre del cliente"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-orange-400 focus:outline-none"
            />
          </div>

          {/* Teléfono */}
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

          {/* Notas */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Notas <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Sin placa, cliente frecuente, pago pendiente…"
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-orange-400 focus:outline-none resize-none text-sm"
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
              {loading
                ? 'Registrando…'
                : tipo === 'mensualidad'
                  ? `Cobrar ${formatCOP(tarifasMap.mensualidad)}`
                  : 'Registrar entrada'
              }
            </button>
          </div>

          <p className="text-center text-xs text-slate-400">
            Tiquete #{formatNumeroTiquete(null)} · se imprime al confirmar
          </p>
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
