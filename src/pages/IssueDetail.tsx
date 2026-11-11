import { Link, useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useTicket } from '../api/queries'
import { assetUrl } from '../api/client'
import type { TicketStatus } from '../api/types'
import { Badge, Card, Gate, Page, prioTone, statusTone } from '../components/ui'
import TicketActions from '../components/TicketActions'
import { fmtDateTime, slaState } from '../lib/utils'

const STEPS: TicketStatus[] = ['Open', 'Assigned', 'In progress', 'Resolved', 'Closed']

export default function IssueDetail() {
  const { id } = useParams()
  const q = useTicket(id)
  return (
    <Page title={id || 'Issue'} back="/issues" refresh={[q]}>
      <Gate qs={[q]}>{() => {
        const t = q.data!
        const sla = slaState(t)
        const idx = t.status === 'Reopened' ? 1 : STEPS.indexOf(t.status)  // Reopened goes back to the work stage
        const assignee = [t.assignee_name, t.vendor_name].filter(Boolean).join(' + ') || 'Not yet assigned'
        return (<>
      <Card>
        <h2 className="font-bold text-lg leading-snug">{t.title}</h2>
        <div className="flex flex-wrap gap-2 mt-2"><Badge tone={statusTone(t.status)}>{t.status}</Badge><Badge tone={prioTone(t.priority)}>{t.priority}</Badge><Badge tone="gray">{t.category}</Badge>{sla.overdue && <Badge tone="red">SLA overdue</Badge>}</div>
        <p className="text-sm text-gray-700 mt-3">{t.description}</p>
        <dl className="text-sm mt-3 space-y-1 text-gray-600">
          <div>Location: {t.asset_id ? <Link className="text-brand-700 underline" to={`/assets/${t.asset_id}`}>{t.asset_id}</Link> : 'Free location'}{t.ghat_name ? ` · ${t.ghat_name}` : ''}</div>
          <div>Reported by: {t.reported_by_name || 'Field user'}{t.reported_by_role ? ` (${t.reported_by_role})` : ''} · {fmtDateTime(t.created_at)}</div>
          <div>Assigned to: {assignee}</div>
          <div className={sla.overdue ? 'text-red-600 font-medium' : ''}>SLA: {sla.label}</div>
        </dl>
        {t.photo_url && <img src={assetUrl(t.photo_url)} alt="Issue" className="mt-3 rounded-xl w-full max-h-56 object-cover" />}
      </Card>

      <Card>
        <h3 className="font-semibold mb-3">Status tracking</h3>
        <ol className="flex items-center">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1 flex flex-col items-center relative">
              {i > 0 && <span className={`absolute top-3 right-1/2 w-full h-0.5 ${i <= idx ? 'bg-brand-600' : 'bg-gray-200'}`} />}
              <span className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs ${i <= idx ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{i < idx || t.status === 'Closed' ? <Check size={14} /> : i + 1}</span>
              <span className={`text-[11px] mt-1 text-center ${i === idx ? 'font-semibold text-brand-700' : 'text-gray-500'}`}>{s}</span>
            </li>
          ))}
        </ol>
      </Card>

      <TicketActions t={t} />

      {t.status === 'Reopened' && (
        <Card className="!bg-red-50 !border-red-200"><p className="font-semibold text-red-800">Reopened</p><p className="text-sm text-red-900 mt-1">{t.reopen_reason}</p></Card>
      )}
      {(t.status === 'Resolved' || t.status === 'Closed') && (
        <Card className="!bg-green-50 !border-green-200"><p className="font-semibold text-green-800">{t.status === 'Closed' ? `Closed ${fmtDateTime(t.closed_at)}` : `Resolved ${fmtDateTime(t.resolved_at)}`}</p><p className="text-sm text-green-900 mt-1">{t.proof_note}</p>{t.proof_photo_url && <img src={assetUrl(t.proof_photo_url)} alt="Proof" className="mt-2 rounded-xl max-h-48 w-full object-cover" />}</Card>
      )}

      <section>
        <h3 className="font-semibold mb-2">History</h3>
        <div className="space-y-2">{t.history.map(h => <Card key={h.id} className="!p-3"><p className="text-sm">{h.note}</p><p className="text-xs text-gray-500 mt-1">{fmtDateTime(h.at)} · {h.by}</p></Card>)}</div>
      </section>
        </>)
      }}</Gate>
    </Page>
  )
}
