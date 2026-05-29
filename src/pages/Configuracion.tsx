import { useState, useEffect, useCallback } from 'react'
import { Settings, DollarSign, Clock, SlidersHorizontal, Save, AlertTriangle } from 'lucide-react'
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

  const [horarios,        setHorarios]       = useState<Horario[]>([])
  const [horariosLoading, setHorariosLoading] = useState(true)

  const cargarHorarios = useCallback(async () => {
    const { data } = await supabase.from('horarios').select('*').order('dia_semana')
    setHorarios((data ?? []) as Horario[])
    setHorariosLoading(false)
  }, [])

  useEffect(() => { cargarHorarios() }, [cargarHorarios])

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
          <Settings size={20} className="text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
          <p className="text-sm text-slate-500">Ajustes generales, tarifas y horarios</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-8 w-fit">
        {([
          { key: 'general',  icon: SlidersHorizontal, label: 'General'       },
          { key: 'tarifas',  icon: DollarSign,        label: 'Tarifas'       },
          { key: 'horarios', icon: Clock,             label: 'Horarios'      },
        ] as { key: Tab; icon: React.ElementType; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && <TabGeneral />}

      {tab === 'tarifas' && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">Tarifas vigentes</h2>
            <p className="text-sm text-slate-500">Los cambios aplican inmediatamente a nuevos cobros.</p>
          </div>
          {tarifasLoading
            ? <div className="text-slate-400 py-4">Cargando tarifas…</div>
            : <Tarifas tarifas={tarifas} onActualizar={actualizar} />
          }
        </div>
      )}

      {tab === 'horarios' && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">Horario de atención</h2>
            <p className="text-sm text-slate-500">Define apertura y cierre por día de la semana.</p>
          </div>
          {horariosLoading
            ? <div className="text-slate-400 py-4">Cargando horarios…</div>
            : <Horarios horarios={horarios} onRecargar={cargarHorarios} />
          }
        </div>
      )}
    </div>
  )
}

// ─── Tab General ─────────────────────────────────────────────────────────────

function TabGeneral() {
  const { nombreParqueadero, totalEspacios, alertaHoras, actualizarConfig } = useConfig()

  const [nombre,   setNombre]   = useState(nombreParqueadero)
  const [espacios, setEspacios] = useState(String(totalEspacios))
  const [alerta,   setAlerta]   = useState(String(alertaHoras))

  // Sync with context when it loads
  useEffect(() => { setNombre(nombreParqueadero) },  [nombreParqueadero])
  useEffect(() => { setEspacios(String(totalEspacios)) }, [totalEspacios])
  useEffect(() => { setAlerta(String(alertaHoras))    }, [alertaHoras])

  const [loadingN, setLoadingN] = useState(false)
  const [loadingE, setLoadingE] = useState(false)
  const [loadingA, setLoadingA] = useState(false)

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
      // Warn if active motos would be outside new range
      const { data } = await supabase
        .from('motos')
        .select('espacio')
        .is('hora_salida', null)
        .gt('espacio', n)

      const afectadas = (data ?? []) as Pick<Moto, 'espacio'>[]
      if (afectadas.length > 0) {
        const espaciosOcupados = afectadas.map(m => `#${m.espacio}`).join(', ')
        if (!window.confirm(
          `Hay ${afectadas.length} moto(s) en espacios que quedarían fuera del nuevo rango (${espaciosOcupados}).\n\n¿Desea continuar de todas formas?`
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
    if (isNaN(n) || n < 1) {
      toast.error('Debe ser un número mayor a 0')
      return
    }
    setLoadingA(true)
    const ok = await actualizarConfig('alerta_horas', String(n))
    if (ok) toast.success('Alerta de abandono actualizada')
    setLoadingA(false)
  }

  return (
    <div className="space-y-6">
      {/* Nombre */}
      <ConfigCard
        title="Nombre del parqueadero"
        desc="Se muestra en el encabezado y en los recibos de impresión."
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && guardarNombre()}
            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-orange-400 focus:outline-none"
          />
          <SaveBtn onClick={guardarNombre} loading={loadingN} />
        </div>
      </ConfigCard>

      {/* Espacios */}
      <ConfigCard
        title="Número de espacios"
        desc="El grid del parqueadero se actualiza inmediatamente. Mínimo 1, máximo 100."
      >
        <div className="flex gap-3 items-center">
          <input
            type="number"
            value={espacios}
            onChange={e => setEspacios(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && guardarEspacios()}
            min={1}
            max={100}
            className="w-28 px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-orange-400 focus:outline-none text-center font-bold"
          />
          <span className="text-sm text-slate-500">espacios</span>
          <SaveBtn onClick={guardarEspacios} loading={loadingE} />
        </div>
        {parseInt(espacios) < totalEspacios && (
          <div className="flex items-center gap-2 mt-2 text-sm text-amber-700">
            <AlertTriangle size={14} />
            <span>Reducir espacios puede dejar motos activas sin espacio asignado</span>
          </div>
        )}
      </ConfigCard>

      {/* Alerta horas */}
      <ConfigCard
        title="Horas para alerta de abandono"
        desc="Motos que superen este tiempo mostrarán alerta visual en el grid y en el panel superior."
      >
        <div className="flex gap-3 items-center">
          <input
            type="number"
            value={alerta}
            onChange={e => setAlerta(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && guardarAlerta()}
            min={1}
            max={72}
            className="w-28 px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-orange-400 focus:outline-none text-center font-bold"
          />
          <span className="text-sm text-slate-500">horas</span>
          <SaveBtn onClick={guardarAlerta} loading={loadingA} />
        </div>
      </ConfigCard>
    </div>
  )
}

function ConfigCard({ title, desc, children }: {
  title: string; desc: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl p-5">
      <h3 className="font-bold text-slate-900 mb-0.5">{title}</h3>
      <p className="text-sm text-slate-500 mb-4">{desc}</p>
      {children}
    </div>
  )
}

function SaveBtn({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors text-sm"
    >
      <Save size={15} />
      {loading ? '…' : 'Guardar'}
    </button>
  )
}
