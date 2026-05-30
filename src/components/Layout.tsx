import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutGrid, DollarSign, Clock, Settings, LogOut, Users, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import LogoIcon from './LogoIcon'
import { SidebarProvider, useSidebar } from '../context/SidebarContext'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { to: '/',              icon: LayoutGrid, label: 'Parqueadero'   },
  { to: '/caja',          icon: DollarSign, label: 'Caja'          },
  { to: '/mensualistas',  icon: Users,      label: 'Mensualistas'  },
  { to: '/historial',     icon: Clock,      label: 'Historial'     },
  { to: '/configuracion', icon: Settings,   label: 'Configuración' },
]

export default function Layout() {
  return (
    <SidebarProvider>
      <LayoutInner />
    </SidebarProvider>
  )
}

function LayoutInner() {
  const navigate = useNavigate()
  const { open, setOpen } = useSidebar()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--gray-50)' }}>
      {/* ───────── Mobile drawer overlay ───────── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 lg:hidden bg-black/50 pm-animate-fade-in"
        />
      )}

      {/* ───────── Sidebar ───────── */}
      <aside
        className={`
          fixed lg:relative z-50 lg:z-auto top-0 left-0 h-full
          w-[280px] lg:w-60 shrink-0 flex flex-col text-white
          transition-transform duration-200 ease-out
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ backgroundColor: 'var(--blue-900)' }}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-1.5"
          style={{ color: 'rgba(255,255,255,0.7)' }}
          aria-label="Cerrar menú"
        >
          <X size={20} />
        </button>

        {/* Logo area */}
        <div
          className="px-6 py-6 flex items-center gap-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <LogoIcon size={44} />
          <div className="leading-tight">
            <div className="font-extrabold text-[15px] tracking-tight">
              PUNTO MOTO<span style={{ color: 'var(--yellow-400)' }}>.</span>
            </div>
            <div
              className="text-[10.5px] font-medium uppercase mt-0.5"
              style={{ color: 'var(--yellow-400)', letterSpacing: '0.06em' }}
            >
              El Palo · Parqueadero
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 mt-2 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => isActive ? 'pm-nav-active' : ''}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                minHeight: 48,
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                transition: 'var(--transition)',
                color: isActive ? 'var(--blue-900)' : 'rgba(255,255,255,0.65)',
                backgroundColor: isActive ? 'var(--yellow-400)' : 'transparent',
              })}
              onMouseEnter={e => {
                const el = e.currentTarget
                if (!el.classList.contains('pm-nav-active')) {
                  el.style.backgroundColor = 'rgba(255,255,255,0.08)'
                  el.style.color = 'var(--white)'
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                if (!el.classList.contains('pm-nav-active')) {
                  el.style.backgroundColor = 'transparent'
                  el.style.color = 'rgba(255,255,255,0.65)'
                }
              }}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] text-sm font-medium transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)', minHeight: 48 }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--white)'
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ───────── Main ───────── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  )
}
