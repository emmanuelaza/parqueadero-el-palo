import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { supabase, supabaseConfigOk } from './lib/supabase'
import { ConfiguracionProvider } from './context/ConfiguracionContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Configuracion from './pages/Configuracion'
import Mensualistas from './pages/Mensualistas'
import CajaDelDia from './components/CajaDelDia'
import Historial from './components/Historial'
import type { Session } from '@supabase/supabase-js'

/** Splash mientras se resuelve la sesión inicial */
function Splash() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--blue-900)' }}
    >
      <div
        className="w-8 h-8 border-4 rounded-full animate-spin"
        style={{ borderColor: 'var(--yellow-400)', borderTopColor: 'transparent' }}
      />
    </div>
  )
}

/** Pantalla cuando faltan variables de entorno */
function ConfigError() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--blue-900)' }}
    >
      <div
        className="bg-white max-w-md w-full p-6"
        style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}
      >
        <h1 className="text-lg font-bold mb-2" style={{ color: 'var(--danger)' }}>
          Configuración faltante
        </h1>
        <p className="text-sm mb-4" style={{ color: 'var(--gray-600)' }}>
          La aplicación no encuentra las credenciales de Supabase. Para uso local:
        </p>
        <ol className="text-sm space-y-1 list-decimal pl-5 mb-4" style={{ color: 'var(--gray-600)' }}>
          <li>Copia <code className="px-1 py-0.5 bg-[var(--gray-50)] rounded">.env.example</code> a <code className="px-1 py-0.5 bg-[var(--gray-50)] rounded">.env.local</code></li>
          <li>Reinicia el servidor de desarrollo</li>
        </ol>
        <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
          Para deploy en Vercel: configura las variables en Project Settings → Environment Variables.
        </p>
      </div>
    </div>
  )
}

/** Hook compartido — sigue la sesión de Supabase reactivamente */
function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      if (mounted) setSession(s)
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  return session
}

/** Bloquea acceso a rutas privadas si no hay sesión */
function ProtectedRoute() {
  const session = useSession()
  if (session === undefined) return <Splash />
  if (!session) return <Navigate to="/login" replace />
  return (
    <ConfiguracionProvider>
      <Outlet />
    </ConfiguracionProvider>
  )
}

/** Bloquea login si ya hay sesión (evita ver login estando logueado) */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const session = useSession()
  if (session === undefined) return <Splash />
  if (session) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  if (!supabaseConfigOk) return <ConfigError />

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
          success: { iconTheme: { primary: 'var(--yellow-400)', secondary: 'var(--blue-900)' } },
          error: {
            style: { background: 'var(--danger)', color: '#ffffff' },
            iconTheme: { primary: '#ffffff', secondary: 'var(--danger)' },
          },
        }}
      />

      <Routes>
        <Route path="/login" element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        } />

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
