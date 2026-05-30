interface Props {
  title: string
  subtitle?: React.ReactNode
  right?: React.ReactNode
}

/** Mobile-only page header shown beneath the global topbar.
 * On desktop the title lives in the Topbar; on mobile we re-show it here. */
export default function PageHeader({ title, subtitle, right }: Props) {
  return (
    <div className="lg:hidden flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0 flex-1">
        <h2
          className="text-xl font-extrabold leading-tight tracking-tight truncate"
          style={{ color: 'var(--blue-900)' }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-[13px] mt-0.5 truncate" style={{ color: 'var(--gray-600)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {right && <div className="shrink-0 flex items-center gap-2">{right}</div>}
    </div>
  )
}
