import { useNavigate } from 'react-router-dom'
import { Bell, AlertOctagon, Clock, UserPlus } from 'lucide-react'
import { repo, useDb, useUser } from '../data/store'
import { Button, Empty, Page } from '../components/ui'
import { buildNotifications } from '../lib/selectors'
import { timeAgo } from '../lib/utils'
import { toast } from '../lib/toast'

export default function NotificationsPage() {
  const db = useDb(); const user = useUser()!; const nav = useNavigate()
  const list = buildNotifications(db, user)
  const unread = list.filter(n => !n.read)
  return (
    <Page title="Notifications" back="/home" right={unread.length > 0 ? <Button variant="ghost" onClick={() => { repo.notifications.markAllRead(unread.map(n => n.id)); toast('All marked as read') }}>Mark all read</Button> : undefined}>
      {list.length === 0 ? <Empty title="No notifications" hint="Delays, SLA breaches and new assignments will appear here." /> : (
        <ul className="space-y-2">
          {list.map(n => {
            const Icon = n.tone === 'indigo' ? UserPlus : n.id.startsWith('sla') ? Clock : n.tone === 'red' ? AlertOctagon : Bell
            const col = n.tone === 'red' ? 'text-red-600 bg-red-50' : n.tone === 'amber' ? 'text-amber-600 bg-amber-50' : 'text-brand-600 bg-brand-50'
            return (
              <li key={n.id}>
                <button onClick={() => { repo.notifications.markRead(n.id); nav(n.to) }} className={`w-full text-left rounded-2xl border p-3 flex gap-3 items-start min-h-[64px] ${n.read ? 'bg-white border-gray-200' : 'bg-brand-50/60 border-brand-100'}`}>
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${col}`}><Icon size={20} /></span>
                  <span className="flex-1 min-w-0"><span className={`block text-sm ${n.read ? '' : 'font-semibold'}`}>{n.title}</span><span className="block text-xs text-gray-500">{n.body} · {timeAgo(n.at)}</span></span>
                  {!n.read && <span className="w-2.5 h-2.5 rounded-full bg-brand-600 mt-1.5" aria-label="Unread" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Page>
  )
}
