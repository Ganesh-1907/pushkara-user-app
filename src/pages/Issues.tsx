import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useUser } from '../api/auth'
import { useTickets } from '../api/queries'
import { Badge, Button, Card, Chips, Empty, Gate, Page, prioTone, statusTone } from '../components/ui'
import { isOfficerRole } from '../lib/constants'
import { slaState, timeAgo } from '../lib/utils'

export default function IssuesPage() {
  const user = useUser()!; const nav = useNavigate()
  const [f, setF] = useState('All')
  const q = useTickets(isOfficerRole(user.role) ? undefined : 'reported')
  return (
    <Page title={isOfficerRole(user.role) ? 'All issues' : 'My issues'} refresh={[q]}>
      <Chips value={f} options={['All', 'Open', 'Assigned', 'In progress', 'Resolved', 'Closed', 'Reopened']} onChange={setF} />
      <Button full variant="secondary" onClick={() => nav('/report')}><Plus size={18} />Report new issue</Button>
      <Gate qs={[q]}>{() => {
        const list = q.data!.filter(t => f === 'All' || t.status === f).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        return list.length === 0 ? <Empty title="No issues here" hint={f === 'All' ? 'Tap "Report new issue" to log one.' : `Nothing with status ${f}.`} /> : (
          <div className="space-y-2">
            {list.map(t => {
              const sla = slaState(t)
              return (
                <Card key={t.id} onClick={() => nav(`/issues/${t.id}`)}>
                  <div className="flex items-start gap-2"><p className="flex-1 font-semibold leading-snug">{t.title}</p><Badge tone={statusTone(t.status)}>{t.status}</Badge></div>
                  <div className="flex flex-wrap gap-2 mt-2 items-center">
                    <Badge tone={prioTone(t.priority)}>{t.priority}</Badge>
                    {sla.overdue && <Badge tone="red">SLA overdue</Badge>}
                    <span className="text-xs text-gray-500">{t.id} · {timeAgo(t.created_at)}</span>
                  </div>
                </Card>
              )
            })}
          </div>
        )
      }}</Gate>
    </Page>
  )
}
