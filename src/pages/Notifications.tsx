import { useNavigate } from 'react-router-dom'
import { Bell, AlertOctagon, Clock, UserPlus, Ticket } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { post } from '../api/client'
import { useNotifications } from '../api/queries'
import { Button, Empty, Gate, Page } from '../components/ui'
import { notifRoute, timeAgo } from '../lib/utils'
import { toast } from '../lib/toast'

export default function NotificationsPage() {
  const nav = useNavigate(); const qc = useQueryClient()
  const q = useNotifications()
  const [busy, setBusy] = useState(false)
  const unread = q.data?.unread ?? 0

  const markAll = async () => {
    setBusy(true)
    try { await post('/notifications/read-all'); await qc.invalidateQueries({ queryKey: ['notifications'] }); toast('All marked as read') }
    catch (e) { toast((e as Error).message) } finally { setBusy(false) }
  }
  const open = async (id: string, link: string) => {
    try { await post(`/notifications/${encodeURIComponent(id)}/read`); qc.invalidateQueries({ queryKey: ['notifications'] }) } catch { /* navigate anyway */ }
    nav(notifRoute(link))
  }
  return (
    <Page title="Notifications" back="/home" refresh={[q]} right={unread > 0 ? <Button variant="ghost" disabled={busy} onClick={markAll}>Mark all read</Button> : undefined}>
      <Gate qs={[q]}>{() => q.data!.items.length === 0 ? <Empty title="No notifications" hint="Delays, SLA breaches, assignments and updates on your issues will appear here." /> : (
        <ul className="space-y-2">
          {q.data!.items.map(n => {
            const Icon = n.kind === 'assignment' ? UserPlus : n.kind === 'ticket' ? Ticket : n.kind === 'sla' ? Clock : n.level === 'red' ? AlertOctagon : Bell
            const col = n.level === 'red' ? 'text-red-600 bg-red-50' : n.level === 'amber' ? 'text-amber-600 bg-amber-50' : n.level === 'green' ? 'text-green-600 bg-green-50' : 'text-brand-600 bg-brand-50'
            return (
              <li key={n.id}>
                <button onClick={() => open(n.id, n.link)} className={`w-full text-left rounded-2xl border p-3 flex gap-3 items-start min-h-[64px] ${n.read ? 'bg-white border-gray-200' : 'bg-brand-50/60 border-brand-100'}`}>
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${col}`}><Icon size={20} /></span>
                  <span className="flex-1 min-w-0"><span className={`block text-sm ${n.read ? '' : 'font-semibold'}`}>{n.title}</span><span className="block text-xs text-gray-500">{n.body} · {timeAgo(n.at)}</span></span>
                  {!n.read && <span className="w-2.5 h-2.5 rounded-full bg-brand-600 mt-1.5" aria-label="Unread" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}</Gate>
    </Page>
  )
}
