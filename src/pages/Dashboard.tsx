import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Search, AlertTriangle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import ParkingGrid from '../components/ParkingGrid'
import EntradaModal from '../components/EntradaModal'
import SalidaModal from '../components/SalidaModal'
import { useParking } from '../hooks/useParking'
import { useTarifas } from '../hooks/useTarifas'
import { useConfig } from '../context/ConfiguracionContext'
import { supabase } from '../lib/supabase'
import { formatCOP, fechaHoyBogota, normalizarPlaca, formatDuracion, diffHoras } from '../lib/helpers'
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
  const [search,      setSearch]      = useState('')   // debounced

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Show "not found" toast when search has chars and no match
  useEffect(() => {
    if (search.length < 2) return
    const found = espacios.some(e =>
      e.ocupado && e.moto?.placa === normalizarPlaca(search)
    )
    if (!found) toast('Moto no encontrada en el parqueadero', { icon: '🔍' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const highlightedNumero = search
    ? espacios.find(e => e.ocupado && e.moto?.placa === normalizarPlaca(search))?.numero
    : undefined

  const abandonadosCount = espacios.filter(e =>
    e.ocupado && e.moto && diffHoras(e.moto.hora_entrada) > alertaHoras
  ).length

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

      {/* Abandoned alert banner */}
      {abandonadosCount > 0 && (
        <div className="flex items-center gap-3 mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <span>
            <strong>{abandonadosCount} moto{abandonadosCount > 1 ? 's' : ''}</strong>
            {' '}llevan más de <strong>{alertaHoras} hora{alertaHoras !== 1 ? 's' : ''}</strong> en el parqueadero
            {espacios
              .filter(e => e.ocupado && e.moto && diffHoras(e.moto.hora_entrada) > alertaHoras)
              .map(e => (
                <span key={e.numero} className="ml-2 font-mono bg-red-100 px-1.5 py-0.5 rounded text-xs">
                  #{e.numero} {e.moto?.placa} · {formatDuracion(e.moto!.hora_entrada)}
                </span>
              ))
            }
          </span>
        </div>
      )}

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
          onConfirm={async (id, placa, monto) => {
            const ok = await registrarSalida(id, placa, monto)
            if (ok) cargarHoyCobrado()
            return ok
          }}
        />
      )}
    </div>
  )
}
