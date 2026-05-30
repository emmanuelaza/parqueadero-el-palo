import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { supabase } from './lib/supabase'
import { ConfiguracionProvider } from './context/ConfiguracionContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Configuracion from './pages/Configuracion'
import Mensualistas from './pages/Mensualistas'
import CajaDelDia from './components/CajaDelDia'
import Historial from './components/Historial'
import type { Session } from '@supabase/supabase-js'

function ProtectedRoute() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--blue-900)' }}
      >
        <div
          className="w-8 h-8 border-4 rounded-full animate-spin"
          style={{
            borderColor: 'var(--yellow-400)',
            borderTopColor: 'transparent',
          }}
        />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  return (
    <ConfiguracionProvider>
      <Outlet />
    </ConfiguracionProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: 'inherit',
            fontSize: '14px',
            fontWeight: 500,
            background: 'var(--blue-900)',
            color: '#ffffff',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
          },
          success: {
            iconTheme: { primary: 'var(--yellow-400)', secondary: 'var(--blue-900)' },
          },
          error: {
            style: { background: 'var(--danger)', color: '#ffffff' },
            iconTheme: { primary: '#ffffff', secondary: 'var(--danger)' },
          },
        }}
      />

      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index                  element={<Dashboard />}     />
            <Route path="caja"            element={<CajaDelDia />}    />
            <Route path="mensualistas"    element={<Mensualistas />}  />
            <Route path="historial"       element={<Historial />}     />
            <Route path="configuracion"   element={<Configuracion />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
