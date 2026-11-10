import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDb, useUser } from '../data/store'
import { Badge, Card, Chips, Empty, Page, prioTone, statusTone } from '../components/ui'
import TicketActions from '../components/TicketActions'
import { assignedTickets, openTicketsForUser } from '../lib/selectors'
import { slaState } from '../lib/utils'
import type { Ticket } from '../data/types'

export default function MaintenancePage() {
  const db = useDb(); const user = useUser()!; const nav = useNavigate()
  const [tab, setTab] = useState('Assigned to me')
  const officer = user.role === 'officer' || user.role === 'admin'
  const mine = assignedTickets(db, user).filter(t => t.status !== 'Resolved')
  const open = openTicketsForUser(db, user)
  const done = assignedTickets(db, user).filter(t => t.status === 'Resolved')
  const list: Ticket[] = (tab === 'Assigned to me' ? mine : tab === 'Open (unassigned)' ? open : done)
    .slice().sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt))
  return (
    <Page title="Maintenance tasks">
      {officer && <Card className="text-sm text-gray-600 !bg-brand-50 !border-brand-100">Officers see all tickets read-only.</Card>}
      <Chips value={tab} options={['Assigned to me', 'Open (unassigned)', 'Resolved']} onChange={setTab} />
      {list.length === 0 ? <Empty title="No tasks" hint={tab === 'Assigned to me' ? 'You have no assigned tickets right now.' : 'Nothing in this list.'} /> : (
        <div className="space-y-3">
          {list.map(t => {
            const sla = slaState(t)
            return (
              <Card key={t.id} className="space-y-3">
                <button className="block w-full text-left" onClick={() => nav(`/issues/${t.id}`)}>
                  <div className="flex items-start gap-2"><p className="flex-1 font-semibold leading-snug">{t.title}</p><Badge tone={statusTone(t.status)}>{t.status}</Badge></div>
                  <div className="flex flex-wrap gap-2 mt-2 items-center">
                    <Badge tone={prioTone(t.priority)}>{t.priority}</Badge>
                    <Badge tone={sla.overdue ? 'red' : 'gray'}>{sla.label}</Badge>
                    <span className="text-xs text-gray-500">{t.id} · {db.ghats.find(g => g.id === t.ghatId)?.name}</span>
                  </div>
                </button>
                <TicketActions t={t} />
              </Card>
            )
          })}
        </div>
      )}
    </Page>
  )
}
