interface Props {
  size?: number
  className?: string
}

export default function LogoIcon({ size = 44, className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: 4, display: 'block' }}
    >
      <defs>
        <pattern
          id={`pm-hazard-${size}`}
          patternUnits="userSpaceOnUse"
          width="10"
          height="10"
          patternTransform="rotate(-30)"
        >
          <rect width="10" height="10" fill="#FFD700" />
          <rect width="5"  height="10" fill="#0F1A6E" />
        </pattern>
      </defs>
      <rect width="64" height="64" rx="3" fill="#FFD700" />
      <rect width="64" height="12" fill={`url(#pm-hazard-${size})`} />
      <rect y="52" width="64" height="12" fill={`url(#pm-hazard-${size})`} />
      <path
        d="M 22 17 L 22 47 L 28.5 47 L 28.5 35.5 L 35.5 35.5 C 42.5 35.5 47.5 31.5 47.5 26.25 C 47.5 21 42.5 17 35.5 17 Z M 28.5 22 L 35 22 C 39 22 41.5 23.7 41.5 26.25 C 41.5 28.8 39 30.5 35 30.5 L 28.5 30.5 Z"
        fill="#0F1A6E"
      />
    </svg>
  )
}
