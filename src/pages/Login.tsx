import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import LogoIcon from '../components/LogoIcon'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate  = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/', { replace: true })
    })
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos'
        : error.message)
      setLoading(false)
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen pm-parking-pattern flex items-center justify-center p-4">
      <div className="w-full max-w-sm pm-animate-slide-up">
        {/* Card */}
        <div
          className="bg-white p-10"
          style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}
        >
          {/* Logo area */}
          <div className="text-center mb-7">
            <div className="flex justify-center mb-4">
              <LogoIcon size={64} />
            </div>
            <h1
              className="text-[26px] font-extrabold leading-none tracking-tight"
              style={{ color: 'var(--blue-900)' }}
            >
              PUNTO MOTO<span style={{ color: 'var(--yellow-400)' }}>.</span>
            </h1>
            <p
              className="text-[12px] font-medium uppercase mt-2"
              style={{ color: 'var(--gray-400)', letterSpacing: '0.08em' }}
            >
              El Palo · Parqueadero
            </p>
          </div>

          <h2 className="text-base font-bold mb-1" style={{ color: 'var(--blue-900)' }}>
            Iniciar sesión
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--gray-600)' }}>
            Acceso al sistema de gestión
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--blue-900)' }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@puntomoto.com"
                required
                autoFocus
                className="pm-input w-full"
                style={{
                  border: '1.5px solid var(--gray-100)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  fontSize: 15,
                  outline: 'none',
                  transition: 'var(--transition)',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--blue-700)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(27,47,190,0.1)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--gray-100)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--blue-900)' }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full"
                  style={{
                    border: '1.5px solid var(--gray-100)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 44px 10px 14px',
                    fontSize: 15,
                    outline: 'none',
                    transition: 'var(--transition)',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--blue-700)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(27,47,190,0.1)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'var(--gray-100)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--gray-400)' }}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full font-bold mt-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                height: 48,
                backgroundColor: 'var(--yellow-400)',
                color: 'var(--blue-900)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 15,
                border: 'none',
              }}
              onMouseEnter={e => {
                if (e.currentTarget.disabled) return
                e.currentTarget.style.backgroundColor = 'var(--yellow-300)'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'var(--yellow-400)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Sistema de gestión — uso interno
        </p>
      </div>
    </div>
  )
}
