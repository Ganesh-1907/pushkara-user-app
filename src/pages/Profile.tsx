import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, RefreshCw, WifiOff, X } from 'lucide-react'
import { logout, useUser } from '../api/auth'
import { useDepartments, useGhats } from '../api/queries'
import { Badge, Button, Card, Page } from '../components/ui'
import { runSync } from '../components/Shell'
import { clearSynced, discardItem, setSimOffline, useOutbox } from '../offline/outbox'
import { roleLabel, fmtDateTime } from '../lib/utils'
import { enablePush } from '../native/notifications'
import { toast } from '../lib/toast'

export default function ProfilePage() {
  const user = useUser()!; const nav = useNavigate()
  const gq = useGhats(); const dq = useDepartments()
  const o = useOutbox()
  const [busy, setBusy] = useState(false)
  const rows: [string, string | undefined][] = [
    ['Mobile', `+91 ${user.phone}`], ['Role', roleLabel(user.role)], ['Designation', user.designation || undefined],
    ['Ghat', gq.data?.find(g => g.id === user.ghat_id)?.name], ['Department', dq.data?.find(d => d.id === user.department_id)?.name],
    ['Vendor ID', user.vendor_id || undefined],
  ]
  const tone = (s: string) => (s === 'pending' ? 'amber' : s === 'failed' ? 'red' : 'green') as 'amber' | 'red' | 'green'
  return (
    <Page title="Profile">
      <Card className="text-center">
        <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 text-2xl font-bold flex items-center justify-center mx-auto">{user.name[0]}</div>
        <h2 className="font-bold text-lg mt-2">{user.name}</h2>
        <div className="mt-1 flex justify-center gap-2"><Badge tone="indigo">{roleLabel(user.role)}</Badge></div>
        <dl className="text-sm text-left mt-4 divide-y divide-gray-100">
          {rows.filter(r => r[1]).map(([k, v]) => <div key={k} className="flex justify-between py-2"><dt className="text-gray-500">{k}</dt><dd className="font-medium text-right">{v}</dd></div>)}
        </dl>
      </Card>

      <Card className="space-y-3">
        <h3 className="font-semibold">Offline & sync</h3>
        <button onClick={() => setSimOffline(!o.simOffline)} aria-pressed={o.simOffline} className="w-full min-h-[44px] flex items-center gap-3 text-left">
          <WifiOff size={20} className="text-gray-500" /><span className="flex-1 text-sm">Simulate offline mode (demo)</span>
          <span className={`w-12 h-7 rounded-full p-0.5 transition-colors ${o.simOffline ? 'bg-brand-600' : 'bg-gray-300'}`}><span className={`block w-6 h-6 rounded-full bg-white transition-transform ${o.simOffline ? 'translate-x-5' : ''}`} /></span>
        </button>
        {o.items.length === 0 ? <p className="text-sm text-gray-500">No queued submissions.</p> : (
          <ul className="text-sm space-y-2">{o.items.slice().reverse().slice(0, 10).map(q => (
            <li key={q.id}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate flex-1">{q.label}</span>
                <Badge tone={tone(q.status)}>{q.status === 'pending' ? 'pending sync' : q.status}</Badge>
                {q.status !== 'synced' && <button aria-label={`Discard ${q.label}`} onClick={() => discardItem(q.id)} className="w-8 h-8 flex items-center justify-center text-gray-400"><X size={16} /></button>}
              </div>
              <p className="text-[11px] text-gray-400 truncate">{q.type} · {q.method} {q.path}{q.error ? ` · ${q.error}` : ''}</p>
            </li>
          ))}</ul>
        )}
        <Button full variant="secondary" disabled={busy || o.syncing || o.offline || (o.pending + o.failed) === 0} onClick={async () => { setBusy(true); try { await runSync() } finally { setBusy(false) } }}>
          <RefreshCw size={18} className={o.syncing ? 'animate-spin' : ''} />{o.syncing ? 'Syncing…' : `Sync now${o.pending + o.failed ? ` (${o.pending + o.failed})` : ''}`}
        </Button>
        {o.offline && o.pending > 0 && <p className="text-xs text-gray-500">Turn off offline mode to sync.</p>}
        {o.items.some(i => i.status === 'synced') && <Button full variant="ghost" onClick={clearSynced}>Clear synced items</Button>}
        {o.items.length > 0 && <p className="text-[11px] text-gray-400">Last queued {fmtDateTime(o.items[o.items.length - 1].at)}</p>}
      </Card>

      <Button full variant="secondary" onClick={async () => { const r = await enablePush(); toast(r === 'granted' ? 'Notifications enabled' : r === 'denied' ? 'Notification permission denied' : 'Notifications not supported here') }}><Bell size={18} />Enable device notifications</Button>
      <Button full variant="danger" onClick={() => { logout(); nav('/login', { replace: true }) }}><LogOut size={18} />Log out</Button>
      <p className="text-center text-xs text-gray-400">Sutrana Mobile v0.2 · connected to the Sutrana API</p>
    </Page>
  )
}
