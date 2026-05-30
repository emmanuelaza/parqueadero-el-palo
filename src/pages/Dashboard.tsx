import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Search, X, LayoutGrid, Bike, CheckCircle2 } from 'lucide-react'
import ParkingGrid from '../components/ParkingGrid'
import Topbar from '../components/Topbar'
import PageHeader from '../components/PageHeader'
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

  const [modal,             setModal]             = useState<ModalState>({ tipo: 'none' })
  const [hoyCobrado,        setHoyCobrado]        = useState<number | null>(null)
  const [searchInput,       setSearchInput]       = useState('')
  const [search,            setSearch]            = useState('')
  const [mobileSearchOpen,  setMobileSearchOpen]  = useState(false)

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
      .from('caja_diaria').select('total_ingresos').eq('fecha', hoy).maybeSingle()
    setHoyCobrado(data?.total_ingresos ?? 0)
  }, [])

  useEffect(() => { cargarHoyCobrado() }, [cargarHoyCobrado])

  const closeModal = () => setModal({ tipo: 'none' })

  const ocupados = espacios.filter(e => e.ocupado).length
  const libres   = espacios.length - ocupados

  // ── Desktop search (in Topbar right slot) ───────────────────────────────
  const desktopRight = (
    <>
      <DesktopSearchInput
        value={searchInput}
        onChange={setSearchInput}
        onClear={() => setSearchInput('')}
      />
      <button
        onClick={recargar}
        disabled={loading}
        title="Recargar"
        className="p-2.5 transition-colors"
        style={{
          border: '1.5px solid var(--gray-100)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--blue-700)',
          minWidth: 40, minHeight: 40,
        }}
      >
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
      </button>
    </>
  )

  // ── Mobile compact controls (icon buttons) ───────────────────────────────
  const mobileControls = (
    <>
      <IconBtn ariaLabel="Buscar" onClick={() => setMobileSearchOpen(true)}>
        <Search size={18} />
      </IconBtn>
      <IconBtn ariaLabel="Recargar" onClick={recargar}>
        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
      </IconBtn>
    </>
  )

  return (
    <>
      <Topbar title="Parqueadero" right={desktopRight} />

      {/* Mobile expandable search overlay */}
      {mobileSearchOpen && (
        <div
          className="lg:hidden sticky top-14 z-30 bg-white px-3 py-2 flex items-center gap-2 pm-animate-fade-in"
          style={{ borderBottom: '1px solid var(--gray-100)' }}
        >
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--blue-700)' }}
            />
            <input
              autoFocus
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Buscar placa..."
              className="w-full"
              style={{
                paddingLeft: 36, paddingRight: 14,
                paddingTop: 10, paddingBottom: 10,
                border: '1.5px solid var(--blue-700)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 15, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.04em',
                outline: 'none', color: 'var(--blue-900)',
              }}
            />
          </div>
          <button
            onClick={() => { setMobileSearchOpen(false); setSearchInput('') }}
            className="p-2"
            style={{ color: 'var(--gray-600)', minWidth: 44, minHeight: 44 }}
            aria-label="Cerrar búsqueda"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="p-3 lg:p-6">
        <PageHeader title="Parqueadero" right={mobileControls} />

        {/* Stats row — 3 cols always */}
        <div className="grid grid-cols-3 gap-2 lg:gap-4 mb-4 lg:mb-6">
          <StatCard
            icon={<LayoutGrid className="w-4 h-4 lg:w-5 lg:h-5" style={{ color: 'var(--blue-900)' }} />}
            label="TOTAL"
            value={espacios.length}
            accent="yellow"
          />
          <StatCard
            icon={<Bike className="w-4 h-4 lg:w-5 lg:h-5" style={{ color: 'var(--blue-700)' }} />}
            label="OCUPADOS"
            value={ocupados}
            accent="blue"
          />
          <StatCard
            icon={<CheckCircle2 className="w-4 h-4 lg:w-5 lg:h-5" style={{ color: 'var(--success)' }} />}
            label="LIBRES"
            value={libres}
            accent="green"
          />
        </div>

        {hoyCobrado !== null && (
          <div
            className="mb-4 lg:mb-5 px-4 py-2.5 lg:px-5 lg:py-3 flex items-center justify-between"
            style={{
              backgroundColor: 'var(--white)',
              border: '1px solid var(--gray-100)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span
              className="text-[10px] lg:text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--gray-400)' }}
            >
              Cobrado hoy
            </span>
            <span className="text-base lg:text-xl font-extrabold" style={{ color: 'var(--blue-900)' }}>
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

function DesktopSearchInput({
  value, onChange, onClear,
}: { value: string; onChange: (v: string) => void; onClear: () => void }) {
  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--blue-700)' }} />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && onClear()}
        placeholder="Buscar placa..."
        style={{
          width: 240,
          paddingLeft: 36, paddingRight: value ? 32 : 14,
          paddingTop: 8, paddingBottom: 8,
          border: '1.5px solid var(--gray-100)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 14, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.04em',
          outline: 'none', color: 'var(--blue-900)',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'var(--blue-700)'
          e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(27,47,190,0.1)'
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'var(--gray-100)'
          e.currentTarget.style.boxShadow   = 'none'
        }}
      />
      {value && (
        <button
          onClick={onClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--gray-400)' }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

function IconBtn({ onClick, ariaLabel, children }: {
  onClick: () => void; ariaLabel: string; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex items-center justify-center transition-colors"
      style={{
        width: 40, height: 40,
        border: '1.5px solid var(--gray-100)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--blue-700)',
        backgroundColor: 'var(--white)',
      }}
    >
      {children}
    </button>
  )
}

function StatCard({
  icon, label, value, accent,
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
      className="bg-white flex flex-col lg:flex-row lg:items-center gap-1.5 lg:gap-4 p-3 lg:p-5"
      style={{
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        borderLeft: `4px solid ${accentColor}`,
      }}
    >
      <div className="flex items-center gap-1.5 lg:gap-0">
        <div
          className="hidden lg:flex shrink-0 items-center justify-center"
          style={{
            width: 44, height: 44,
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--gray-50)',
          }}
        >
          {icon}
        </div>
        <div className="lg:hidden">{icon}</div>
        <div
          className="lg:hidden text-[10px] font-semibold uppercase truncate"
          style={{ color: 'var(--gray-400)', letterSpacing: '0.05em' }}
        >
          {label}
        </div>
      </div>
      <div className="min-w-0">
        <div
          className="hidden lg:block text-[11px] font-semibold uppercase mb-1"
          style={{ color: 'var(--gray-400)', letterSpacing: '0.06em' }}
        >
          {label}
        </div>
        <div
          className="text-2xl lg:text-3xl font-extrabold leading-none tabular-nums"
          style={{ color: valueColor }}
        >
          {value}
        </div>
      </div>
    </div>
  )
}
