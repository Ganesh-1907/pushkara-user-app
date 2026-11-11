import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../api/auth'
import { useProjects } from '../api/queries'
import { Badge, Card, Chips, Empty, Gate, Page, ProgressBar, workTone } from '../components/ui'
import { fmtDate } from '../lib/utils'

export default function WorksPage() {
  const user = useUser()!; const nav = useNavigate()
  const q = useProjects()
  const [f, setF] = useState('All')
  return (
    <Page title="My works" refresh={[q]}>
      <Gate qs={[q]}>{() => {
        const list = q.data!.filter(p => f === 'All' || p.status === f).sort((a, b) => b.gap - a.gap)
        const sub = user.role === 'vendor' ? q.data![0]?.vendor_name : user.role === 'staff' ? q.data![0]?.department_name : 'All departments'
        return (<>
          <p className="text-sm text-gray-500">{sub ? `${sub} · ` : ''}{q.data!.length} works</p>
          <Chips value={f} options={['All', 'On track', 'Delayed', 'Critical']} onChange={setF} />
          {list.length === 0 ? <Empty title="No works found" hint="No projects match this filter." /> : (
            <div className="space-y-3">
              {list.map(p => (
                <Card key={p.id} onClick={() => nav(`/works/${p.id}`)}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0"><p className="font-semibold">{p.name}</p><p className="text-xs text-gray-500">{p.id} · {p.ghat_name}</p></div>
                    <Badge tone={workTone(p.status)}>{p.status}</Badge>
                  </div>
                  <div className="mt-3"><ProgressBar value={p.actual_pct} planned={p.planned_pct} /></div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1.5">
                    <span>{p.actual_pct}% done · {p.planned_pct}% planned</span><span>Ends {fmtDate(p.end_date)}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>)
      }}</Gate>
    </Page>
  )
}
