import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Search, X } from 'lucide-react'
import ParkingGrid from '../components/ParkingGrid'
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
  const { totalEspacios, alertaHoras, nombreParqueadero } = useConfig()
  const { espacios, loading, registrarEntrada, registrarSalida, recargar } = useParking(totalEspacios)
  const { tarifasMap } = useTarifas()

  const [modal,       setModal]       = useState<ModalState>({ tipo: 'none' })
  const [hoyCobrado,  setHoyCobrado]  = useState<number | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search,      setSearch]      = useState('')

  // Debounce search
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

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{nombreParqueadero}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setSearchInput('')}
              placeholder="Buscar placa…"
              style={{ textTransform: 'uppercase' }}
              className="pl-9 pr-8 py-2.5 w-44 rounded-xl border-2 border-slate-200 focus:border-orange-400 focus:outline-none text-sm font-semibold uppercase tracking-wide"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {hoyCobrado !== null && (
            <div className="text-right">
              <div className="text-xs text-slate-500 uppercase tracking-wide">Cobrado hoy</div>
              <div className="text-xl font-bold text-orange-600">{formatCOP(hoyCobrado)}</div>
            </div>
          )}

          <button
            onClick={recargar}
            disabled={loading}
            className="p-2.5 rounded-xl border-2 border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
            title="Recargar"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={32} className="animate-spin text-slate-300" />
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

      {/* Modals */}
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
  )
}
