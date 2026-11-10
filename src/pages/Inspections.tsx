import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useDb } from '../data/store'
import { Badge, Button, Card, Empty, Page } from '../components/ui'
import { fmtDateTime } from '../lib/utils'

export default function InspectionsPage() {
  const db = useDb(); const nav = useNavigate()
  const list = db.inspections.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  return (
    <Page title="Field inspections">
      <Button full onClick={() => nav('/inspections/new')}><Plus size={18} />New inspection</Button>
      {list.length === 0 ? <Empty title="No inspections yet" hint="Start a new ghat inspection." /> : (
        <div className="space-y-2">
          {list.map(i => {
            const fails = i.items.filter(x => x.result === 'Fail').length
            const answered = i.items.filter(x => x.result).length
            return (
              <Card key={i.id} onClick={() => nav(`/inspections/${i.id}`)}>
                <div className="flex items-center gap-2">
                  <p className="flex-1 font-semibold">{db.ghats.find(g => g.id === i.ghatId)?.name}</p>
                  {i.status === 'draft' ? <Badge tone="amber">Draft</Badge> : fails > 0 ? <Badge tone="red">{fails} failed</Badge> : <Badge tone="green">All clear</Badge>}
                </div>
                <p className="text-xs text-gray-500 mt-1">{i.id} · {fmtDateTime(i.createdAt)} · {answered}/{i.items.length} answered · {db.users.find(u => u.id === i.by)?.name}</p>
              </Card>
            )
          })}
        </div>
      )}
      <p className="text-[11px] text-gray-400 text-center">Sample data</p>
    </Page>
  )
}
