import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, RefreshCw, RotateCcw, WifiOff } from 'lucide-react'
import { auth, repo, useDb, useUser } from '../data/store'
import { Badge, Button, Card, Page, SampleTag, Sheet } from '../components/ui'
import { roleLabel, fmtDateTime } from '../lib/utils'
import { enablePush } from '../native/notifications'
import { toast } from '../lib/toast'

export default function ProfilePage() {
  const db = useDb(); const user = useUser()!; const nav = useNavigate()
  const [confirm, setConfirm] = useState(false)
  const pending = db.syncQueue.filter(q => q.status === 'pending')
  const rows: [string, string | undefined][] = [
    ['Mobile', `+91 ${user.mobile}`], ['Role', roleLabel(user.role)],
    ['Ghat', db.ghats.find(g => g.id === user.ghatId)?.name], ['Department', db.departments.find(d => d.id === user.departmentId)?.name],
    ['Vendor', db.vendors.find(v => v.id === user.vendorId)?.name],
  ]
  return (
    <Page title="Profile">
      <Card className="text-center">
        <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 text-2xl font-bold flex items-center justify-center mx-auto">{user.name[0]}</div>
        <h2 className="font-bold text-lg mt-2">{user.name}</h2>
        <div className="mt-1 flex justify-center gap-2"><Badge tone="indigo">{roleLabel(user.role)}</Badge><SampleTag /></div>
        <dl className="text-sm text-left mt-4 divide-y divide-gray-100">
          {rows.filter(r => r[1]).map(([k, v]) => <div key={k} className="flex justify-between py-2"><dt className="text-gray-500">{k}</dt><dd className="font-medium text-right">{v}</dd></div>)}
        </dl>
      </Card>

      <Card className="space-y-3">
        <h3 className="font-semibold">Offline & sync</h3>
        <button onClick={() => repo.sync.setSimOffline(!db.simOffline)} aria-pressed={db.simOffline} className="w-full min-h-[44px] flex items-center gap-3 text-left">
          <WifiOff size={20} className="text-gray-500" /><span className="flex-1 text-sm">Simulate offline mode (demo)</span>
          <span className={`w-12 h-7 rounded-full p-0.5 transition-colors ${db.simOffline ? 'bg-brand-600' : 'bg-gray-300'}`}><span className={`block w-6 h-6 rounded-full bg-white transition-transform ${db.simOffline ? 'translate-x-5' : ''}`} /></span>
        </button>
        {db.syncQueue.length === 0 ? <p className="text-sm text-gray-500">No queued submissions.</p> : (
          <ul className="text-sm space-y-1">{db.syncQueue.slice(0, 6).map(q => <li key={q.id} className="flex justify-between gap-2"><span className="truncate">{q.label}</span><Badge tone={q.status === 'pending' ? 'amber' : 'green'}>{q.status === 'pending' ? 'pending sync' : 'synced'}</Badge></li>)}</ul>
        )}
        <Button full variant="secondary" disabled={pending.length === 0} onClick={() => { repo.sync.syncNow(); toast('Synced (simulated)') }}><RefreshCw size={18} />Sync now{pending.length ? ` (${pending.length})` : ''}</Button>
        {db.syncQueue.length > 0 && <p className="text-[11px] text-gray-400">Last queued {fmtDateTime(db.syncQueue[0].at)}</p>}
      </Card>

      <Button full variant="secondary" onClick={async () => { const r = await enablePush(); toast(r === 'granted' ? 'Notifications enabled' : r === 'denied' ? 'Notification permission denied' : 'Notifications not supported here') }}><Bell size={18} />Enable device notifications</Button>
      <Button full variant="secondary" onClick={() => setConfirm(true)}><RotateCcw size={18} />Reset demo data</Button>
      <Button full variant="danger" onClick={() => { auth.logout(); nav('/login', { replace: true }) }}><LogOut size={18} />Log out</Button>
      <p className="text-center text-xs text-gray-400">Sutrana Mobile v0.1 · prototype · All data is sample data</p>

      <Sheet open={confirm} title="Reset demo data?" onClose={() => setConfirm(false)}>
        <p className="text-sm text-gray-600">This restores all sample data and removes anything you created in this prototype (issues, inspections, updates, queued items).</p>
        <div className="grid grid-cols-2 gap-2"><Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="danger" onClick={() => { repo.resetDemo(); setConfirm(false); toast('Demo data reset') }}>Reset</Button></div>
      </Sheet>
    </Page>
  )
}
