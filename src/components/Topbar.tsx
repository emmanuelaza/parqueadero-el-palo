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
      className="h-14 md:h-16 px-3 md:px-6 flex items-center gap-2 bg-white sticky top-0 z-30"
      style={{ borderBottom: '1px solid var(--gray-100)' }}
    >
      {/* Hamburger (mobile only) */}
      <button
        onClick={toggle}
        className="md:hidden p-2 -ml-1 rounded-lg shrink-0"
        style={{ color: 'var(--blue-900)', minWidth: 44, minHeight: 44 }}
        aria-label="Abrir menú"
      >
        <Menu size={22} />
      </button>

      {/* Title (brand on mobile, page title on tablet+) */}
      <h1
        className="font-bold tracking-tight truncate flex-1 min-w-0"
        style={{ color: 'var(--blue-900)', fontSize: 'clamp(15px, 4vw, 18px)' }}
      >
        <span className="md:hidden">
          PUNTO MOTO<span style={{ color: 'var(--yellow-400)' }}>.</span>
        </span>
        <span className="hidden md:inline">{title}</span>
      </h1>

      {/* Date+time (desktop only — too tight on tablet) */}
      <div
        className="hidden lg:flex flex-1 justify-center text-sm font-medium tabular-nums whitespace-nowrap"
        style={{ color: 'var(--gray-600)' }}
      >
        <span>{fechaCap}</span>
        <span className="mx-2" style={{ color: 'var(--gray-400)' }}>·</span>
        <span className="font-semibold" style={{ color: 'var(--blue-900)' }}>{hora}</span>
      </div>

      {/* Compact time (mobile and tablet) */}
      <div
        className="lg:hidden text-[13px] font-semibold tabular-nums shrink-0"
        style={{ color: 'var(--blue-900)' }}
      >
        {hora}
      </div>

      {/* Right slot (tablet and desktop) */}
      <div className="hidden md:flex items-center gap-2 md:gap-3 justify-end shrink-0 min-w-0">
        {right}
      </div>
    </header>
  )
}
