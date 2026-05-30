import { useState, useEffect, useCallback } from 'react'
import { Save, AlertTriangle, SlidersHorizontal, DollarSign, Clock } from 'lucide-react'
import Topbar from '../components/Topbar'
import PageHeader from '../components/PageHeader'
import Tarifas from '../components/Tarifas'
import Horarios from '../components/Horarios'
import { useTarifas } from '../hooks/useTarifas'
import { useConfig } from '../context/ConfiguracionContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import type { Horario, Moto } from '../types'

type Tab = 'general' | 'tarifas' | 'horarios'

export default function Configuracion() {
  const [tab, setTab] = useState<Tab>('general')
  const { tarifas, loading: tarifasLoading, actualizar } = useTarifas()

  const [horarios,        setHorarios]        = useState<Horario[]>([])
  const [horariosLoading, setHorariosLoading] = useState(true)

  const cargarHorarios = useCallback(async () => {
    const { data } = await supabase.from('horarios').select('*').order('dia_semana')
    setHorarios((data ?? []) as Horario[])
    setHorariosLoading(false)
  }, [])

  useEffect(() => { cargarHorarios() }, [cargarHorarios])

  return (
    <>
      <Topbar title="Configuración" />

      <div className="p-3 md:p-6 max-w-3xl">
        <PageHeader title="Configuración" subtitle="Ajustes generales, tarifas y horarios" />

        {/* Tabs */}
        <div className="flex gap-4 md:gap-6 mb-6 md:mb-8 overflow-x-auto" style={{ borderBottom: '1px solid var(--gray-100)' }}>
          {([
            { key: 'general',  icon: SlidersHorizontal, label: 'General'  },
            { key: 'tarifas',  icon: DollarSign,        label: 'Tarifas'  },
            { key: 'horarios', icon: Clock,             label: 'Horarios' },
          ] as { key: Tab; icon: React.ElementType; label: string }[]).map(t => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex items-center gap-2 pb-3 text-sm transition-colors"
                style={{
                  color: active ? 'var(--blue-700)' : 'var(--gray-400)',
                  fontWeight: active ? 600 : 500,
                  borderBottom: active ? '2px solid var(--blue-700)' : '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                <t.icon size={14} />
                {t.label}
              </button>
            )
          })}
        </div>

        {tab === 'general' && <TabGeneral />}

        {tab === 'tarifas' && (
          <Section title="Tarifas vigentes" desc="Los cambios aplican inmediatamente a nuevos cobros.">
            {tarifasLoading
              ? <div className="text-sm" style={{ color: 'var(--gray-400)' }}>Cargando tarifas…</div>
              : <Tarifas tarifas={tarifas} onActualizar={actualizar} />}
          </Section>
        )}

        {tab === 'horarios' && (
          <Section title="Horario de atención" desc="Define apertura y cierre por día de la semana.">
            {horariosLoading
              ? <div className="text-sm" style={{ color: 'var(--gray-400)' }}>Cargando horarios…</div>
              : <Horarios horarios={horarios} onRecargar={cargarHorarios} />}
          </Section>
        )}
      </div>
    </>
  )
}

// ─── Tab General ─────────────────────────────────────────────────────────────

function TabGeneral() {
  const {
    nombreParqueadero, totalEspacios, alertaHoras,
    direccion, horarioTexto, operarioPorDefecto, actualizarConfig,
  } = useConfig()

  const [nombre,   setNombre]   = useState(nombreParqueadero)
  const [espacios, setEspacios] = useState(String(totalEspacios))
  const [alerta,   setAlerta]   = useState(String(alertaHoras))
  const [dir,      setDir]      = useState(direccion)
  const [horario,  setHorario]  = useState(horarioTexto)
  const [operario, setOperario] = useState(operarioPorDefecto)

  useEffect(() => { setNombre(nombreParqueadero) },        [nombreParqueadero])
  useEffect(() => { setEspacios(String(totalEspacios)) },  [totalEspacios])
  useEffect(() => { setAlerta(String(alertaHoras)) },      [alertaHoras])
  useEffect(() => { setDir(direccion) },                   [direccion])
  useEffect(() => { setHorario(horarioTexto) },            [horarioTexto])
  useEffect(() => { setOperario(operarioPorDefecto) },     [operarioPorDefecto])

  const [loadingN, setLoadingN] = useState(false)
  const [loadingE, setLoadingE] = useState(false)
  const [loadingA, setLoadingA] = useState(false)
  const [loadingD, setLoadingD] = useState(false)
  const [loadingH, setLoadingH] = useState(false)
  const [loadingO, setLoadingO] = useState(false)

  const guardarNombre = async () => {
    if (!nombre.trim()) return
    setLoadingN(true)
    const ok = await actualizarConfig('nombre_parqueadero', nombre.trim())
    if (ok) toast.success('Nombre actualizado')
    setLoadingN(false)
  }

  const guardarEspacios = async () => {
    const n = parseInt(espacios)
    if (isNaN(n) || n < 1 || n > 100) {
      toast.error('Debe ser entre 1 y 100')
      return
    }
    if (n < totalEspacios) {
      const { data } = await supabase
        .from('motos')
        .select('espacio')
        .is('hora_salida', null)
        .gt('espacio', n)
      const afectadas = (data ?? []) as Pick<Moto, 'espacio'>[]
      if (afectadas.length > 0) {
        const espaciosOcupados = afectadas.map(m => `#${m.espacio}`).join(', ')
        if (!window.confirm(
          `Hay ${afectadas.length} moto(s) en espacios que quedarían fuera del nuevo rango (${espaciosOcupados}).\n\n¿Continuar?`,
        )) return
      }
    }
    setLoadingE(true)
    const ok = await actualizarConfig('total_espacios', String(n))
    if (ok) toast.success(`Grid actualizado a ${n} espacios`)
    setLoadingE(false)
  }

  const guardarAlerta = async () => {
    const n = parseInt(alerta)
    if (isNaN(n) || n < 1) { toast.error('Debe ser un número mayor a 0'); return }
    setLoadingA(true)
    const ok = await actualizarConfig('alerta_horas', String(n))
    if (ok) toast.success('Alerta de abandono actualizada')
    setLoadingA(false)
  }

  const guardarDireccion = async () => {
    setLoadingD(true)
    const ok = await actualizarConfig('direccion', dir.trim())
    if (ok) toast.success('Dirección actualizada')
    setLoadingD(false)
  }

  const guardarHorario = async () => {
    setLoadingH(true)
    const ok = await actualizarConfig('horario_texto', horario.trim())
    if (ok) toast.success('Horario actualizado')
    setLoadingH(false)
  }

  const guardarOperario = async () => {
    setLoadingO(true)
    const ok = await actualizarConfig('operario_defecto', operario.trim())
    if (ok) toast.success('Operario por defecto actualizado')
    setLoadingO(false)
  }

  return (
    <div className="space-y-5">
      <ConfigCard title="Nombre del parqueadero" desc="Aparece en encabezado, login y tiquetes.">
        <div className="flex gap-3">
          <ConfigInput value={nombre} onChange={setNombre} onEnter={guardarNombre} />
          <SaveBtn onClick={guardarNombre} loading={loadingN} />
        </div>
      </ConfigCard>

      <ConfigCard title="Número de espacios" desc="El grid se actualiza inmediatamente. Mínimo 1, máximo 100.">
        <div className="flex gap-3 items-center">
          <ConfigInput
            type="number"
            value={espacios}
            onChange={setEspacios}
            onEnter={guardarEspacios}
            width={120}
            center
          />
          <span className="text-sm" style={{ color: 'var(--gray-400)' }}>espacios</span>
          <SaveBtn onClick={guardarEspacios} loading={loadingE} />
        </div>
        {parseInt(espacios) < totalEspacios && (
          <div className="flex items-center gap-2 mt-2 text-sm" style={{ color: 'var(--warning)' }}>
            <AlertTriangle size={14} />
            <span>Reducir espacios puede dejar motos activas sin espacio asignado</span>
          </div>
        )}
      </ConfigCard>

      <ConfigCard title="Horas para alerta de abandono" desc="Motos que superen este tiempo mostrarán alerta visual en el grid.">
        <div className="flex gap-3 items-center">
          <ConfigInput
            type="number"
            value={alerta}
            onChange={setAlerta}
            onEnter={guardarAlerta}
            width={120}
            center
          />
          <span className="text-sm" style={{ color: 'var(--gray-400)' }}>horas</span>
          <SaveBtn onClick={guardarAlerta} loading={loadingA} />
        </div>
      </ConfigCard>

      <ConfigCard title="Dirección" desc="Se muestra en los tiquetes de entrada y salida.">
        <div className="flex gap-3">
          <ConfigInput value={dir} onChange={setDir} onEnter={guardarDireccion} placeholder="Calle 123 #45-67, Medellín" />
          <SaveBtn onClick={guardarDireccion} loading={loadingD} />
        </div>
      </ConfigCard>

      <ConfigCard title="Horario de atención" desc="Texto libre para mostrar en comunicaciones.">
        <div className="flex gap-3">
          <ConfigInput value={horario} onChange={setHorario} onEnter={guardarHorario} placeholder="Lun–Sáb 6am – 10pm" />
          <SaveBtn onClick={guardarHorario} loading={loadingH} />
        </div>
      </ConfigCard>

      <ConfigCard title="Operario por defecto" desc='Pre-rellena el campo "Atendido por" en el modal de salida.'>
        <div className="flex gap-3">
          <ConfigInput value={operario} onChange={setOperario} onEnter={guardarOperario} placeholder="Nombre del operario" />
          <SaveBtn onClick={guardarOperario} loading={loadingO} />
        </div>
      </ConfigCard>
    </div>
  )
}

// ─── Shared ────────────────────────────────────────────────────────────────────

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div
      className="bg-white p-6"
      style={{
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        borderLeft: '4px solid var(--yellow-400)',
      }}
    >
      <h2 className="text-base font-bold mb-1" style={{ color: 'var(--blue-900)' }}>{title}</h2>
      <p className="text-sm mb-5" style={{ color: 'var(--gray-600)', borderBottom: '1px solid var(--gray-100)', paddingBottom: 12 }}>
        {desc}
      </p>
      {children}
    </div>
  )
}

function ConfigCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div
      className="bg-white p-5"
      style={{
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        borderLeft: '4px solid var(--yellow-400)',
      }}
    >
      <h3 className="font-bold text-[15px]" style={{ color: 'var(--blue-900)' }}>{title}</h3>
      <p className="text-[13px] mb-3 mt-0.5" style={{ color: 'var(--gray-600)' }}>{desc}</p>
      {children}
    </div>
  )
}

function ConfigInput({
  type = 'text',
  value,
  onChange,
  onEnter,
  placeholder,
  width,
  center,
}: {
  type?: string
  value: string
  onChange: (v: string) => void
  onEnter?: () => void
  placeholder?: string
  width?: number
  center?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter' && onEnter) onEnter() }}
      placeholder={placeholder}
      className={width ? '' : 'flex-1'}
      style={{
        width,
        border: '1.5px solid var(--gray-100)',
        borderRadius: 'var(--radius-sm)',
        padding: '11px 14px',
        fontSize: 15,
        outline: 'none',
        textAlign: center ? ('center' as const) : ('left' as const),
        fontWeight: center ? 700 : 500,
        color: 'var(--blue-900)',
        minHeight: 44,
        minWidth: 0,
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
  )
}

function SaveBtn({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center justify-center gap-1.5 font-semibold transition-all disabled:opacity-50 text-sm shrink-0"
      style={{
        padding: '11px 16px',
        backgroundColor: 'var(--blue-700)',
        color: 'var(--white)',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        minHeight: 44,
      }}
    >
      <Save size={14} />
      {loading ? '…' : 'Guardar'}
    </button>
  )
}
