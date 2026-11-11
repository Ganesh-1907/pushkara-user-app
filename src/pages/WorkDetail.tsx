import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check, Circle } from 'lucide-react'
import { useUser } from '../api/auth'
import { useProject } from '../api/queries'
import { assetUrl } from '../api/client'
import { useAction } from '../offline/useAction'
import { Badge, Button, Card, Field, Gate, Page, PhotoField, ProgressBar, inputCls, workTone } from '../components/ui'
import { isOfficerRole } from '../lib/constants'
import { fmtDate, fmtDateTime } from '../lib/utils'

export default function WorkDetail() {
  const { id } = useParams()
  const user = useUser()!
  const q = useProject(id)
  const act = useAction()
  const p = q.data
  const [progress, setProgress] = useState(p?.actual_pct ?? 0)
  const [remarks, setRemarks] = useState('')
  const [photo, setPhoto] = useState<string | undefined>()
  const [err, setErr] = useState('')
  useEffect(() => { if (p) setProgress(p.actual_pct) }, [p?.actual_pct]) // eslint-disable-line react-hooks/exhaustive-deps

  const readOnly = isOfficerRole(user.role)
  const save = async () => {
    if (!p) return
    if (progress < p.actual_pct) return setErr('Progress cannot go below the last reported value. Add a remark if correcting.')
    if (progress === p.actual_pct && !remarks.trim() && !photo) return setErr('Change progress, or add a remark / photo.')
    const r = await act.run({ type: 'project.progress', label: `Progress ${p.id} → ${progress}%`, method: 'POST', path: `/projects/${p.id}/progress`, body: { progress, remarks: remarks.trim() }, photos: { photo_url: photo } }, { ok: 'Progress update saved' })
    if (r) { setRemarks(''); setPhoto(undefined); setErr('') }
  }
  const toggle = (mid: string, done: boolean, title: string) =>
    act.run({ type: 'project.milestone', label: `Milestone "${title}" ${p!.id}`, method: 'PATCH', path: `/projects/${p!.id}/milestones/${mid}`, body: { done: !done } }, { ok: !done ? 'Milestone completed' : 'Milestone reopened' })

  return (
    <Page title={id || 'Work'} back refresh={[q]}>
      <Gate qs={[q]}>{() => (<>
        <Card>
          <div className="flex items-start gap-2">
            <h2 className="flex-1 text-lg font-bold">{p!.name}</h2><Badge tone={workTone(p!.status)}>{p!.status}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">{p!.ghat_name} · {p!.department_name}</p>
          <p className="text-sm text-gray-500">Vendor: {p!.vendor_name ?? 'Unassigned'}</p>
          <div className="mt-4"><ProgressBar value={p!.actual_pct} planned={p!.planned_pct} /></div>
          <div className="flex justify-between text-xs text-gray-600 mt-1.5"><span>Actual {p!.actual_pct}%</span><span>Planned {p!.planned_pct}% (black marker)</span></div>
          <p className="text-xs text-gray-500 mt-2">{fmtDate(p!.start_date)} → {fmtDate(p!.end_date)}{p!.gap > 0 && p!.status !== 'Completed' ? ` · ${p!.gap}% behind plan` : ''}</p>
        </Card>

        <section>
          <h3 className="font-semibold mb-2">Milestones</h3>
          <div className="space-y-2">
            {p!.milestones.length === 0 && <Card className="text-sm text-gray-500 text-center !p-3">No milestones defined.</Card>}
            {p!.milestones.map(m => (
              <button key={m.id} disabled={readOnly || act.pending} onClick={() => toggle(m.id, m.done, m.title)} aria-pressed={m.done}
                className="w-full min-h-[52px] bg-white border border-gray-200 rounded-2xl px-4 flex items-center gap-3 text-left active:bg-gray-50 disabled:opacity-70">
                {m.done ? <span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center"><Check size={16} /></span> : <Circle className="text-gray-300" size={24} />}
                <span className={m.done ? 'text-gray-500 line-through' : 'font-medium'}>{m.title}</span>
              </button>
            ))}
          </div>
        </section>

        {readOnly ? <Card className="text-sm text-gray-600 !bg-brand-50 !border-brand-100">Officers have read-only access to works. Progress is updated by the department or vendor.</Card> : (
          <Card className="space-y-4">
            <h3 className="font-semibold">Update progress</h3>
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-700 font-medium">Progress</span><span className="font-bold text-brand-700">{progress}%</span></div>
              <input type="range" min={0} max={100} step={5} value={progress} onChange={e => { setProgress(Number(e.target.value)); setErr('') }} className="w-full h-11 accent-indigo-600" aria-label="Progress percent" />
            </div>
            <Field label="Remarks"><textarea className={inputCls} rows={3} value={remarks} onChange={e => { setRemarks(e.target.value); setErr('') }} placeholder="What was done today? Any blockers?" /></Field>
            <PhotoField value={photo} onChange={setPhoto} label="Photo evidence (optional)" />
            {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
            <Button full onClick={save} disabled={act.pending}>{act.pending ? 'Saving…' : 'Save update'}</Button>
          </Card>
        )}

        <section>
          <h3 className="font-semibold mb-2">Photo evidence</h3>
          {p!.evidence.length === 0 ? <Card className="text-sm text-gray-500 text-center !p-3">No photo evidence yet.</Card> : (
            <div className="grid grid-cols-2 gap-2">{p!.evidence.map(e => (
              <div key={e.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {e.photo_url && <img src={assetUrl(e.photo_url)} alt="Evidence" className="w-full h-28 object-cover" />}
                <p className="text-[11px] text-gray-500 p-2">{fmtDateTime(e.at)}{e.note ? ` · ${e.note}` : ''}</p>
              </div>
            ))}</div>
          )}
        </section>

        <section>
          <h3 className="font-semibold mb-2">Status history</h3>
          <div className="space-y-2">{p!.history.map(h => (
            <Card key={h.id} className="!p-3"><p className="text-sm">{h.note}</p><p className="text-xs text-gray-500 mt-1">{fmtDateTime(h.at)} · {h.by}{h.progress != null ? ` · ${h.progress}%` : ''}</p></Card>
          ))}</div>
        </section>
      </>)}</Gate>
    </Page>
  )
}
