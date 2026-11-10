import { useEffect, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Boxes, ScanLine, Map as MapIcon, User as UserIcon, Hammer, AlertTriangle, WifiOff, RefreshCw } from 'lucide-react'
import { useDb, useUser, repo, isOffline } from '../data/store'
import { Toaster } from './ui'
import { toast } from '../lib/toast'

function useOnlineTick() {
  const [, setN] = useState(0)
  useEffect(() => {
    const f = () => setN(n => n + 1)
    window.addEventListener('online', f); window.addEventListener('offline', f)
    return () => { window.removeEventListener('online', f); window.removeEventListener('offline', f) }
  }, [])
}

export function OfflineBanner() {
  const db = useDb()
  useOnlineTick()
  const offline = isOffline(db)
  const pending = db.syncQueue.filter(q => q.status === 'pending').length
  if (offline) return <div className="shrink-0 bg-gray-900 text-white text-sm px-4 py-2 flex items-center gap-2 pt-safe"><WifiOff size={16} />Offline: submissions are saved on this device ({pending} pending sync)</div>
  if (pending > 0) return (
    <div className="shrink-0 bg-amber-100 text-amber-900 text-sm px-4 py-2 flex items-center gap-2 pt-safe">
      <RefreshCw size={16} /><span className="flex-1">{pending} item(s) pending sync</span>
      <button onClick={() => { repo.sync.syncNow(); toast('All items synced (simulated)') }} className="min-h-[36px] px-3 rounded-lg bg-amber-600 text-white font-semibold">Sync now</button>
    </div>
  )
  return null
}

export function TabBar() {
  const user = useUser()
  const tabs = [
    { to: '/home', label: 'Home', icon: Home },
    user?.role === 'staff' ? { to: '/assets', label: 'Assets', icon: Boxes } : user?.role === 'vendor' ? { to: '/works', label: 'Works', icon: Hammer } : { to: '/works', label: 'Works', icon: Hammer },
    { to: '/scan', label: 'Scan', icon: ScanLine },
    user?.role === 'officer' ? { to: '/issues', label: 'Issues', icon: AlertTriangle } : { to: '/map', label: 'Map', icon: MapIcon },
    { to: '/profile', label: 'Profile', icon: UserIcon },
  ]
  return (
    <nav className="shrink-0 bg-white border-t border-gray-200 pb-safe" aria-label="Main">
      <ul className="grid grid-cols-5">
        {tabs.map(t => (
          <li key={t.to}>
            <NavLink to={t.to} className={({ isActive }) => `flex flex-col items-center justify-center min-h-[56px] text-[11px] font-medium gap-0.5 ${isActive ? 'text-brand-700' : 'text-gray-500'}`}>
              <t.icon size={22} />{t.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function Frame({ children, tabs }: { children: ReactNode; tabs?: boolean }) {
  return (
    <div className="h-full w-full flex justify-center bg-gray-200">
      <div className="relative w-full max-w-[420px] h-full bg-gray-50 flex flex-col overflow-hidden sm:shadow-2xl">
        <OfflineBanner />
        <main className="flex-1 min-h-0">{children}</main>
        {tabs && <TabBar />}
        <Toaster />
      </div>
    </div>
  )
}
