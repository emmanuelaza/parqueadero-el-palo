import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import ParkingGrid from '../components/ParkingGrid'
import EntradaModal from '../components/EntradaModal'
import SalidaModal from '../components/SalidaModal'
import { useParking } from '../hooks/useParking'
import { useTarifas } from '../hooks/useTarifas'
import { supabase } from '../lib/supabase'
import { formatCOP, fechaHoyBogota, PARKING_NAME } from '../lib/helpers'
import type { EspacioParqueadero } from '../types'

type ModalState =
  | { tipo: 'none' }
  | { tipo: 'entrada'; espacio: number }
  | { tipo: 'salida'; espacio: EspacioParqueadero }

export default function Dashboard() {
  const { espacios, loading, registrarEntrada, registrarSalida, recargar } = useParking()
  const { tarifasMap } = useTarifas()

  const [modal, setModal] = useState<ModalState>({ tipo: 'none' })
  const [hoyCobrado, setHoyCobrado] = useState<number | null>(null)

  // Fetch today's total on mount
  useEffect(() => {
    const hoy = fechaHoyBogota()
    supabase
      .from('caja_diaria')
      .select('total_ingresos')
      .eq('fecha', hoy)
      .maybeSingle()
      .then(({ data }) => setHoyCobrado(data?.total_ingresos ?? 0))
  }, [])

  const handleEspacioVacio    = (numero: number)            => setModal({ tipo: 'entrada', espacio: numero })
  const handleEspacioOcupado  = (espacio: EspacioParqueadero) => setModal({ tipo: 'salida',  espacio })
  const closeModal = () => setModal({ tipo: 'none' })

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{PARKING_NAME}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' · '}
            <span className="font-medium text-slate-700">
              {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-4">
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
          onEspacioVacio={handleEspacioVacio}
          onEspacioOcupado={handleEspacioOcupado}
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
            if (ok) setHoyCobrado(null) // Refresh
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
            if (ok) setHoyCobrado(prev => (prev ?? 0) + monto)
            return ok
          }}
        />
      )}
    </div>
  )
}
