import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../api/auth'
import { useTickets } from '../api/queries'
import { Badge, Card, Chips, Empty, Gate, Page, prioTone, statusTone } from '../components/ui'
import TicketActions from '../components/TicketActions'
import { isOfficerRole } from '../lib/constants'
import { slaState } from '../lib/utils'

export default function MaintenancePage() {
  const user = useUser()!; const nav = useNavigate()
  const [tab, setTab] = useState('Assigned to me')
  const officer = isOfficerRole(user.role)
  const assignedQ = useTickets(officer ? undefined : 'assigned')
  const openQ = useTickets('open')
  return (
    <Page title="Maintenance tasks" refresh={[assignedQ, openQ]}>
      {officer && <Card className="text-sm text-gray-600 !bg-brand-50 !border-brand-100">Officers see all tickets read-only.</Card>}
      <Chips value={tab} options={['Assigned to me', 'Open (unassigned)', 'Resolved / Closed']} onChange={setTab} />
      <Gate qs={[assignedQ, openQ]}>{() => {
        const assigned = assignedQ.data!
        const list = (tab === 'Assigned to me' ? assigned.filter(t => t.status !== 'Resolved' && t.status !== 'Closed') : tab === 'Open (unassigned)' ? openQ.data! : assigned.filter(t => t.status === 'Resolved' || t.status === 'Closed'))
          .slice().sort((a, b) => +new Date(a.due_at) - +new Date(b.due_at))
        return list.length === 0 ? <Empty title="No tasks" hint={tab === 'Assigned to me' ? 'You have no assigned tickets right now.' : 'Nothing in this list.'} /> : (
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
                      <span className="text-xs text-gray-500">{t.id} · {t.ghat_name}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Reported by {t.reported_by_name || 'Field user'}{t.reported_by_role ? ` (${t.reported_by_role})` : ''}</p>
                    {t.status === 'Reopened' && t.reopen_reason && <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2 mt-2">Reopened: {t.reopen_reason}</p>}
                  </button>
                  <TicketActions t={t} />
                </Card>
              )
            })}
          </div>
        )
      }}</Gate>
    </Page>
  )
}
