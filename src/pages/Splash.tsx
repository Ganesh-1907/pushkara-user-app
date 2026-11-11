import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../components/ui'
import { getUser } from '../api/auth'

export default function Splash() {
  const nav = useNavigate()
  useEffect(() => {
    const t = setTimeout(() => nav(getUser() ? '/home' : '/login', { replace: true }), 1600)
    return () => clearTimeout(t)
  }, [nav])
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-brand-600 to-brand-800 text-white fade-in px-8 text-center">
      <div className="bg-white rounded-3xl p-4 mb-5"><Logo size={64} /></div>
      <h1 className="text-4xl font-bold tracking-tight">Sutrana</h1>
      <p className="mt-2 text-brand-100">One Platform. Every Operation.</p>
      <p className="absolute bottom-8 pb-safe text-xs text-brand-100/80">Godavari Pushkaralu · Field App</p>
    </div>
  )
}
