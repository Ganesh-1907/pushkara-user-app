import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useUser } from '../api/auth'
import { useInspections } from '../api/queries'
import type { Inspection } from '../api/types'
import { Badge, Button, Card, Empty, Gate, Page, type Tone } from '../components/ui'
import { isOfficerRole } from '../lib/constants'
import { fmtDateTime } from '../lib/utils'

const statusBadge = (i: Inspection): { tone: Tone; text: string } => {
  const fails = i.items.filter(x => x.result === 'Fail').length
  if (i.status === 'Draft') return { tone: 'amber', text: 'Draft' }
  if (i.status === 'Rejected') return { tone: 'red', text: 'Rejected' }
  if (i.status === 'Approved') return { tone: 'green', text: 'Approved' }
  return fails > 0 ? { tone: 'red', text: `Pending · ${fails} failed` } : { tone: 'indigo', text: 'Pending review' }
}

export default function InspectionsPage() {
  const nav = useNavigate(); const user = useUser()!
  const q = useInspections()
  return (
    <Page title="Field inspections" refresh={[q]}>
      {!isOfficerRole(user.role) && <Button full onClick={() => nav('/inspections/new')}><Plus size={18} />New inspection</Button>}
      <Gate qs={[q]}>{() => {
        const list = q.data!.slice().sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        return list.length === 0 ? <Empty title="No inspections yet" hint="Start a new ghat inspection." /> : (
          <div className="space-y-2">
            {list.map(i => {
              const answered = i.items.filter(x => x.result).length
              const b = statusBadge(i)
              return (
                <Card key={i.id} onClick={() => nav(`/inspections/${i.id}`)}>
                  <div className="flex items-center gap-2">
                    <p className="flex-1 font-semibold">{i.ghat_name}</p>
                    <Badge tone={b.tone}>{b.text}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{i.id} · {fmtDateTime(i.created_at)} · {answered}/{i.items.length} answered · {i.inspector_name}</p>
                </Card>
              )
            })}
          </div>
        )
      }}</Gate>
    </Page>
  )
}
