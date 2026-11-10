import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useDb, useUser } from '../data/store'
import { Badge, Card, Chips, Empty, Page, ProgressBar, workTone } from '../components/ui'
import { myProjects } from '../lib/selectors'
import { fmtDate, workStatus } from '../lib/utils'

export default function WorksPage() {
  const db = useDb(); const user = useUser()!; const nav = useNavigate()
  const [f, setF] = useState('All')
  const list = myProjects(db, user).map(p => ({ p, ...workStatus(p) })).filter(w => f === 'All' || w.status === f)
    .sort((a, b) => b.gap - a.gap)
  const sub = user.role === 'vendor' ? db.vendors.find(v => v.id === user.vendorId)?.name : user.role === 'staff' ? db.departments.find(d => d.id === user.departmentId)?.name : 'All departments'
  return (
    <Page title="My works">
      <p className="text-sm text-gray-500">{sub} · sample data</p>
      <Chips value={f} options={['All', 'On track', 'Delayed', 'Critical']} onChange={setF} />
      {list.length === 0 ? <Empty title="No works found" hint="No projects match this filter." /> : (
        <div className="space-y-3">
          {list.map(w => (
            <Card key={w.p.id} onClick={() => nav(`/works/${w.p.id}`)}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0"><p className="font-semibold">{w.p.name}</p><p className="text-xs text-gray-500">{w.p.id} · {db.ghats.find(g => g.id === w.p.ghatId)?.name}</p></div>
                <Badge tone={workTone(w.status)}>{w.status}</Badge>
              </div>
              <div className="mt-3"><ProgressBar value={w.p.progress} planned={w.planned} /></div>
              <div className="flex justify-between text-xs text-gray-500 mt-1.5">
                <span>{w.p.progress}% done · {w.planned}% planned</span><span>Ends {fmtDate(w.p.endDate)}</span>
              </div>
              <ChevronRight size={18} className="hidden" />
            </Card>
          ))}
        </div>
      )}
    </Page>
  )
}
