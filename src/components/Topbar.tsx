import { useState, useEffect } from 'react'

interface Props {
  title: string
  right?: React.ReactNode
}

export default function Topbar({ title, right }: Props) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const fecha = now.toLocaleDateString('es-CO', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
  })
  const fechaCap = fecha.charAt(0).toUpperCase() + fecha.slice(1)
  const hora     = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <header
      className="h-16 px-6 grid items-center bg-white"
      style={{
        borderBottom: '1px solid var(--gray-100)',
        gridTemplateColumns: '1fr auto 1fr',
      }}
    >
      {/* Title (left) */}
      <h1
        className="text-lg font-bold tracking-tight"
        style={{ color: 'var(--blue-900)' }}
      >
        {title}
      </h1>

      {/* Date & time (center) */}
      <div
        className="hidden md:block text-sm font-medium tabular-nums whitespace-nowrap"
        style={{ color: 'var(--gray-600)' }}
      >
        <span>{fechaCap}</span>
        <span className="mx-2" style={{ color: 'var(--gray-400)' }}>·</span>
        <span className="font-semibold" style={{ color: 'var(--blue-900)' }}>{hora}</span>
      </div>

      {/* Right slot */}
      <div className="flex items-center gap-3 justify-end">{right}</div>
    </header>
  )
}
