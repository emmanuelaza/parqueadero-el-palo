import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import { useSidebar } from '../context/SidebarContext'

interface Props {
  title: string
  right?: React.ReactNode
}

export default function Topbar({ title, right }: Props) {
  const { toggle } = useSidebar()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const fecha = now.toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const fechaCap = fecha.charAt(0).toUpperCase() + fecha.slice(1)
  const hora     = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <header
      className="h-14 lg:h-16 px-3 lg:px-6 flex items-center bg-white sticky top-0 z-30"
      style={{ borderBottom: '1px solid var(--gray-100)' }}
    >
      {/* Hamburger (mobile/tablet only) */}
      <button
        onClick={toggle}
        className="lg:hidden p-2 -ml-1 mr-1 rounded-lg"
        style={{ color: 'var(--blue-900)', minWidth: 44, minHeight: 44 }}
        aria-label="Abrir menú"
      >
        <Menu size={22} />
      </button>

      {/* Mobile brand OR Desktop title */}
      <h1
        className="font-bold tracking-tight truncate flex-1 lg:flex-none lg:w-auto"
        style={{ color: 'var(--blue-900)', fontSize: 'clamp(15px, 4vw, 18px)' }}
      >
        <span className="lg:hidden">
          PUNTO MOTO<span style={{ color: 'var(--yellow-400)' }}>.</span>
        </span>
        <span className="hidden lg:inline">{title}</span>
      </h1>

      {/* Date+time (desktop centered) */}
      <div
        className="hidden lg:block flex-1 text-center text-sm font-medium tabular-nums whitespace-nowrap"
        style={{ color: 'var(--gray-600)' }}
      >
        <span>{fechaCap}</span>
        <span className="mx-2" style={{ color: 'var(--gray-400)' }}>·</span>
        <span className="font-semibold" style={{ color: 'var(--blue-900)' }}>{hora}</span>
      </div>

      {/* Mobile compact time */}
      <div
        className="lg:hidden text-[13px] font-semibold tabular-nums px-2"
        style={{ color: 'var(--blue-900)' }}
      >
        {hora}
      </div>

      {/* Right slot (desktop only) */}
      <div className="hidden lg:flex items-center gap-3 justify-end">{right}</div>
    </header>
  )
}
