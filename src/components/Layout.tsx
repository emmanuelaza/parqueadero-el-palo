import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutGrid, DollarSign, Clock, Settings, LogOut, Bike } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { to: '/',              icon: LayoutGrid, label: 'Parqueadero' },
  { to: '/caja',          icon: DollarSign, label: 'Caja del día' },
  { to: '/historial',     icon: Clock,      label: 'Historial'    },
  { to: '/configuracion', icon: Settings,   label: 'Configuración' },
]

export default function Layout() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
              <Bike size={20} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">El Palo</div>
              <div className="text-orange-400 font-bold text-sm leading-tight">Parking</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-orange-500 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
