import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Search, X, LayoutGrid, Bike, CheckCircle2 } from 'lucide-react'
import ParkingGrid from '../components/ParkingGrid'
import Topbar from '../components/Topbar'
import EntradaModal from '../components/EntradaModal'
import SalidaModal from '../components/SalidaModal'
import { useParking } from '../hooks/useParking'
import { useTarifas } from '../hooks/useTarifas'
import { useConfig } from '../context/ConfiguracionContext'
import { supabase } from '../lib/supabase'
import { formatCOP, fechaHoyBogota, normalizarPlaca } from '../lib/helpers'
import type { EspacioParqueadero } from '../types'

type ModalState =
  | { tipo: 'none' }
  | { tipo: 'entrada'; espacio: number }
  | { tipo: 'salida'; espacio: EspacioParqueadero }

export default function Dashboard() {
  const { totalEspacios, alertaHoras } = useConfig()
  const { espacios, loading, registrarEntrada, registrarSalida, recargar } = useParking(totalEspacios)
  const { tarifasMap } = useTarifas()

  const [modal,       setModal]       = useState<ModalState>({ tipo: 'none' })
  const [hoyCobrado,  setHoyCobrado]  = useState<number | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search,      setSearch]      = useState('')

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const highlightedNumero = search
    ? espacios.find(e => e.ocupado && e.moto?.placa === normalizarPlaca(search))?.numero
    : undefined

  const cargarHoyCobrado = useCallback(async () => {
    const hoy = fechaHoyBogota()
    const { data } = await supabase
      .from('caja_diaria')
      .select('total_ingresos')
      .eq('fecha', hoy)
      .maybeSingle()
    setHoyCobrado(data?.total_ingresos ?? 0)
  }, [])

  useEffect(() => { cargarHoyCobrado() }, [cargarHoyCobrado])

  const closeModal = () => setModal({ tipo: 'none' })

  const ocupados = espacios.filter(e => e.ocupado).length
  const libres   = espacios.length - ocupados

  // Topbar right slot: search + cobrado + recargar
  const topbarRight = (
    <>
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--blue-700)' }}
        />
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Escape' && setSearchInput('')}
          placeholder="Buscar placa..."
          style={{
            width: 240,
            paddingLeft: 36,
            paddingRight: searchInput ? 32 : 14,
            paddingTop: 8,
            paddingBottom: 8,
            border: '1.5px solid var(--gray-100)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 14,
            textTransform: 'uppercase',
            outline: 'none',
            letterSpacing: '0.04em',
            fontWeight: 600,
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
        {searchInput && (
          <button
            onClick={() => setSearchInput('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--gray-400)' }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      <button
        onClick={recargar}
        disabled={loading}
        title="Recargar"
        className="p-2.5 transition-colors"
        style={{
          border: '1.5px solid var(--gray-100)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--blue-700)',
        }}
      >
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
      </button>
    </>
  )

  return (
    <>
      <Topbar title="Parqueadero" right={topbarRight} />

      <div className="p-6">
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={<LayoutGrid size={22} style={{ color: 'var(--blue-900)' }} />}
            label="ESPACIOS TOTALES"
            value={espacios.length}
            accent="yellow"
          />
          <StatCard
            icon={<Bike size={22} style={{ color: 'var(--blue-700)' }} />}
            label="OCUPADOS"
            value={ocupados}
            accent="blue"
          />
          <StatCard
            icon={<CheckCircle2 size={22} style={{ color: 'var(--success)' }} />}
            label="LIBRES"
            value={libres}
            accent="green"
          />
        </div>

        {hoyCobrado !== null && (
          <div
            className="mb-5 px-5 py-3 flex items-center justify-between"
            style={{
              backgroundColor: 'var(--white)',
              border: '1px solid var(--gray-100)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--gray-400)' }}
            >
              Cobrado hoy
            </span>
            <span className="text-xl font-extrabold" style={{ color: 'var(--blue-900)' }}>
              {formatCOP(hoyCobrado)}
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--gray-100)' }} />
          </div>
        ) : (
          <ParkingGrid
            espacios={espacios}
            alertaHoras={alertaHoras}
            highlightedNumero={highlightedNumero}
            onEspacioVacio={numero => setModal({ tipo: 'entrada', espacio: numero })}
            onEspacioOcupado={espacio => setModal({ tipo: 'salida', espacio })}
          />
        )}

        {modal.tipo === 'entrada' && (
          <EntradaModal
            espacio={modal.espacio}
            tarifasMap={tarifasMap}
            onClose={closeModal}
            onConfirm={async datos => {
              const ok = await registrarEntrada(datos)
              if (ok) cargarHoyCobrado()
              return ok
            }}
          />
        )}

        {modal.tipo === 'salida' && modal.espacio.moto && (
          <SalidaModal
            moto={modal.espacio.moto}
            tarifasMap={tarifasMap}
            onClose={closeModal}
            onConfirm={async (id, placa, monto, metodoPago, atendidoPor) => {
              const ok = await registrarSalida(id, placa, monto, metodoPago, atendidoPor)
              if (ok) cargarHoyCobrado()
              return ok
            }}
          />
        )}
      </div>
    </>
  )
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: number
  accent: 'yellow' | 'blue' | 'green'
}) {
  const accentColor =
    accent === 'yellow' ? 'var(--yellow-400)' :
    accent === 'blue'   ? 'var(--blue-700)'   :
                          'var(--success)'

  const valueColor =
    accent === 'yellow' ? 'var(--blue-900)' :
    accent === 'blue'   ? 'var(--blue-700)' :
                          'var(--success)'

  return (
    <div
      className="bg-white flex items-center gap-4"
      style={{
        padding: '20px 24px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        borderLeft: `4px solid ${accentColor}`,
      }}
    >
      <div
        className="shrink-0 flex items-center justify-center"
        style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--gray-50)',
        }}
      >
        {icon}
      </div>
      <div>
        <div
          className="text-[11px] font-semibold uppercase mb-1"
          style={{ color: 'var(--gray-400)', letterSpacing: '0.06em' }}
        >
          {label}
        </div>
        <div className="text-3xl font-extrabold leading-none tabular-nums" style={{ color: valueColor }}>
          {value}
        </div>
      </div>
    </div>
  )
}
