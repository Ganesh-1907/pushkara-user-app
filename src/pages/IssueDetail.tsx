import { Link, useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useDb } from '../data/store'
import { Badge, Card, Empty, Page, prioTone, statusTone } from '../components/ui'
import TicketActions from '../components/TicketActions'
import { fmtDateTime, slaState } from '../lib/utils'
import type { TicketStatus } from '../data/types'

const STEPS: TicketStatus[] = ['Open', 'Assigned', 'In progress', 'Resolved']

export default function IssueDetail() {
  const { id } = useParams()
  const db = useDb()
  const t = db.tickets.find(x => x.id === id)
  if (!t) return <Page title="Issue" back><Empty title="Issue not found" /></Page>
  const sla = slaState(t)
  const idx = STEPS.indexOf(t.status)
  const assignee = t.assignedUserId ? db.users.find(u => u.id === t.assignedUserId)?.name : t.vendorId ? db.vendors.find(v => v.id === t.vendorId)?.name : 'Not yet assigned'
  return (
    <Page title={t.id} back="/issues">
      <Card>
        <h2 className="font-bold text-lg leading-snug">{t.title}</h2>
        <div className="flex flex-wrap gap-2 mt-2"><Badge tone={statusTone(t.status)}>{t.status}</Badge><Badge tone={prioTone(t.priority)}>{t.priority}</Badge><Badge tone="gray">{t.category}</Badge>{sla.overdue && <Badge tone="red">SLA overdue</Badge>}</div>
        <p className="text-sm text-gray-700 mt-3">{t.description}</p>
        <dl className="text-sm mt-3 space-y-1 text-gray-600">
          <div>Location: {t.assetId ? <Link className="text-brand-700 underline" to={`/assets/${t.assetId}`}>{t.assetId}</Link> : 'Free location'} · {db.ghats.find(g => g.id === t.ghatId)?.name}</div>
          <div>Reported by: {db.users.find(u => u.id === t.reportedBy)?.name || 'Field user'} · {fmtDateTime(t.createdAt)}</div>
          <div>Assigned to: {assignee}</div>
          <div className={sla.overdue ? 'text-red-600 font-medium' : ''}>SLA: {sla.label}</div>
        </dl>
        {t.photo && <img src={t.photo} alt="Issue" className="mt-3 rounded-xl w-full max-h-56 object-cover" />}
      </Card>

      <Card>
        <h3 className="font-semibold mb-3">Status tracking</h3>
        <ol className="flex items-center">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1 flex flex-col items-center relative">
              {i > 0 && <span className={`absolute top-3 right-1/2 w-full h-0.5 ${i <= idx ? 'bg-brand-600' : 'bg-gray-200'}`} />}
              <span className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs ${i <= idx ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{i < idx || t.status === 'Resolved' ? <Check size={14} /> : i + 1}</span>
              <span className={`text-[11px] mt-1 text-center ${i === idx ? 'font-semibold text-brand-700' : 'text-gray-500'}`}>{s}</span>
            </li>
          ))}
        </ol>
      </Card>

      <TicketActions t={t} />

      {t.status === 'Resolved' && (
        <Card className="!bg-green-50 !border-green-200"><p className="font-semibold text-green-800">Resolved {fmtDateTime(t.resolvedAt)}</p><p className="text-sm text-green-900 mt-1">{t.proofNote}</p>{t.proofPhoto && <img src={t.proofPhoto} alt="Proof" className="mt-2 rounded-xl max-h-48 w-full object-cover" />}</Card>
      )}

      <section>
        <h3 className="font-semibold mb-2">History</h3>
        <div className="space-y-2">{t.history.map(h => <Card key={h.id} className="!p-3"><p className="text-sm">{h.note}</p><p className="text-xs text-gray-500 mt-1">{fmtDateTime(h.at)} · {h.by}</p></Card>)}</div>
      </section>
    </Page>
  )
}
