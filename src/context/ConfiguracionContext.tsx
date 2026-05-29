import { createContext, useContext } from 'react'
import { useConfiguracion, type ConfiguracionState } from '../hooks/useConfiguracion'

const ConfiguracionContext = createContext<ConfiguracionState | null>(null)

export function ConfiguracionProvider({ children }: { children: React.ReactNode }) {
  const config = useConfiguracion()
  return (
    <ConfiguracionContext.Provider value={config}>
      {children}
    </ConfiguracionContext.Provider>
  )
}

export function useConfig(): ConfiguracionState {
  const ctx = useContext(ConfiguracionContext)
  if (!ctx) throw new Error('useConfig debe usarse dentro de ConfiguracionProvider')
  return ctx
}
