import { useState, useEffect, useCallback } from 'react'
import { Settings, DollarSign, Clock } from 'lucide-react'
import Tarifas from '../components/Tarifas'
import Horarios from '../components/Horarios'
import { useTarifas } from '../hooks/useTarifas'
import { supabase } from '../lib/supabase'
import type { Horario } from '../types'

type Tab = 'tarifas' | 'horarios'

export default function Configuracion() {
  const [tab, setTab] = useState<Tab>('tarifas')
  const { tarifas, loading: tarifasLoading, actualizar } = useTarifas()

  const [horarios,         setHorarios]        = useState<Horario[]>([])
  const [horariosLoading,  setHorariosLoading] = useState(true)

  const cargarHorarios = useCallback(async () => {
    const { data } = await supabase.from('horarios').select('*').order('dia_semana')
    setHorarios(data ?? [])
    setHorariosLoading(false)
  }, [])

  useEffect(() => { cargarHorarios() }, [cargarHorarios])

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
          <Settings size={20} className="text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
          <p className="text-sm text-slate-500">Tarifas y horarios del parqueadero</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-8 w-fit">
        <TabButton active={tab === 'tarifas'} onClick={() => setTab('tarifas')}>
          <DollarSign size={16} />
          Tarifas
        </TabButton>
        <TabButton active={tab === 'horarios'} onClick={() => setTab('horarios')}>
          <Clock size={16} />
          Horarios
        </TabButton>
      </div>

      {/* Content */}
      {tab === 'tarifas' && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">Tarifas vigentes</h2>
            <p className="text-sm text-slate-500">Los cambios aplican inmediatamente a nuevos cobros.</p>
          </div>
          {tarifasLoading ? (
            <div className="text-slate-400 py-4">Cargando tarifas…</div>
          ) : (
            <Tarifas tarifas={tarifas} onActualizar={actualizar} />
          )}
        </div>
      )}

      {tab === 'horarios' && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">Horario de atención</h2>
            <p className="text-sm text-slate-500">Define apertura y cierre por día de la semana.</p>
          </div>
          {horariosLoading ? (
            <div className="text-slate-400 py-4">Cargando horarios…</div>
          ) : (
            <Horarios horarios={horarios} onRecargar={cargarHorarios} />
          )}
        </div>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
        active
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}
