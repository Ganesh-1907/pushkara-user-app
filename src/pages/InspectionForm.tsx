import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useUser } from '../api/auth'
import { useGhats, useInspection } from '../api/queries'
import { assetUrl } from '../api/client'
import type { CheckResult, ChecklistItem, Inspection } from '../api/types'
import { useAction } from '../offline/useAction'
import { Badge, Button, Card, Field, Gate, GpsField, Page, PhotoField, Segmented, inputCls } from '../components/ui'
import { CHECKLIST } from '../lib/constants'
import { useGps } from '../lib/useGps'
import { fmtDateTime } from '../lib/utils'

const OPTS = ['Pass', 'Fail', 'NA'] as const
const TONES = { Pass: 'bg-green-600 text-white border-green-600', Fail: 'bg-red-600 text-white border-red-600', NA: 'bg-gray-600 text-white border-gray-600' }

export default function InspectionForm() {
  const { id } = useParams()
  const q = useInspection(id)
  if (id === 'new') return <Page title="New inspection" back="/inspections"><Form /></Page>
  return (
    <Page title={id || 'Inspection'} back="/inspections" refresh={[q]}>
      <Gate qs={[q]}>{() => (q.data!.status === 'Draft' ? <Form draft={q.data!} /> : <ReadOnly i={q.data!} />)}</Gate>
    </Page>
  )
}

function ReadOnly({ i }: { i: Inspection }) {
  return (<>
    <Card>
      <div className="flex items-start gap-2"><h2 className="flex-1 font-bold text-lg">{i.ghat_name}</h2><Badge tone={i.status === 'Approved' ? 'green' : i.status === 'Rejected' ? 'red' : 'indigo'}>{i.status}</Badge></div>
      <p className="text-xs text-gray-500">{fmtDateTime(i.created_at)} · {i.inspector_name}</p>
      {i.lat != null && <p className="text-xs text-gray-500 mt-1">GPS stamp: {i.lat.toFixed(5)}, {i.lng?.toFixed(5)}</p>}
      {i.reviewed_at && <p className="text-xs text-gray-500 mt-1">Reviewed {fmtDateTime(i.reviewed_at)}{i.review_note ? `: ${i.review_note}` : ''}</p>}
    </Card>
    <div className="space-y-2">{i.items.map(it => (
      <Card key={it.label} className="!p-3 flex items-center gap-2"><span className="flex-1 text-sm">{it.label}</span><Badge tone={it.result === 'Pass' ? 'green' : it.result === 'Fail' ? 'red' : 'gray'}>{it.result || '—'}</Badge></Card>
    ))}</div>
    {i.photo_url && <img src={assetUrl(i.photo_url)} alt="Inspection" className="rounded-xl w-full max-h-56 object-cover" />}
    <Card><p className="text-sm font-medium">Remarks</p><p className="text-sm text-gray-600 mt-1">{i.remarks || '—'}</p></Card>
  </>)
}

function Form({ draft }: { draft?: Inspection }) {
  const gq = useGhats(); const user = useUser()!; const nav = useNavigate()
  const act = useAction()
  const [ghatId, setGhatId] = useState(draft?.ghat_id || user.ghat_id || '')
  const [items, setItems] = useState<ChecklistItem[]>(draft?.items?.length ? draft.items : CHECKLIST.map(label => ({ label, result: null })))
  const [photo, setPhoto] = useState<string | undefined>(draft?.photo_url ? assetUrl(draft.photo_url) : undefined)
  const [remarks, setRemarks] = useState(draft?.remarks || '')
  const [errs, setErrs] = useState<Record<string, string>>({})
  const gps = useGps()
  const stamp = gps.fix || (draft?.lat != null ? { lat: draft.lat, lng: draft.lng!, accuracy: 0 } : null)

  const set = (label: string, r: CheckResult) => setItems(cur => cur.map(i => i.label === label ? { ...i, result: r } : i))
  /** photo is a fresh data URL (uploaded on submit) or an already-stored URL (sent as is) */
  const send = (submit: boolean) => {
    const fresh = photo?.startsWith('data:')
    const stored = !fresh && photo && draft?.photo_url ? draft.photo_url : null
    return act.run({
      type: submit ? 'inspection.submit' : 'inspection.draft', label: `${submit ? 'Submit' : 'Draft'} inspection`,
      method: draft ? 'PUT' : 'POST', path: draft ? `/inspections/${draft.id}` : '/inspections',
      body: { ghat_id: ghatId, items, lat: stamp?.lat ?? null, lng: stamp?.lng ?? null, remarks: remarks.trim(), submit, photo_url: stored },
      photos: fresh ? { photo_url: photo } : undefined,
    }, { ok: submit ? 'Inspection submitted' : 'Draft saved' })
  }
  const saveDraft = async () => {
    if (!ghatId) return setErrs({ ghat: 'Pick a ghat to save a draft.' })
    if (await send(false)) nav('/inspections', { replace: true })
  }
  const submit = async () => {
    const e: Record<string, string> = {}
    if (!ghatId) e.ghat = 'Pick a ghat.'
    if (items.some(i => !i.result)) e.items = 'Answer every checklist item (Pass / Fail / NA).'
    if (!stamp) e.gps = 'Capture the GPS stamp.'
    if (items.some(i => i.result === 'Fail') && remarks.trim().length < 5) e.remarks = 'Add remarks explaining the failed items.'
    setErrs(e)
    if (Object.keys(e).length) return
    if (await send(true)) nav('/inspections', { replace: true })
  }
  const discard = async () => {
    if (draft && await act.run({ type: 'inspection.discard', label: `Discard draft ${draft.id}`, method: 'DELETE', path: `/inspections/${draft.id}` }, { ok: 'Draft discarded' })) nav('/inspections', { replace: true })
  }

  return (<>
    <Field label="Ghat" error={errs.ghat}>
      <select className={inputCls} value={ghatId} onChange={e => setGhatId(e.target.value)}>
        <option value="">Select ghat…</option>{gq.data?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
    </Field>
    <div className="space-y-3">
      {items.map(it => (
        <Card key={it.label} className="!p-3 space-y-2"><p className="text-sm font-medium">{it.label}</p><Segmented value={it.result} options={OPTS} onChange={r => set(it.label, r)} tones={TONES} /></Card>
      ))}
      {errs.items && <p role="alert" className="text-sm text-red-600">{errs.items}</p>}
    </div>
    <PhotoField value={photo} onChange={setPhoto} />
    <div><GpsField gps={gps} label="GPS stamp" />
      {!gps.fix && ghatId && <button className="min-h-[44px] text-sm text-brand-700 font-medium" onClick={() => { const g = gq.data?.find(x => x.id === ghatId); if (g) gps.setFix({ lat: g.lat, lng: g.lng, accuracy: 10 }) }}>Demo: simulate being at the ghat</button>}{stamp && !gps.fix && <p className="text-xs text-gray-500 mt-1">Saved with draft.</p>}{errs.gps && <p className="text-xs text-red-600 mt-1">{errs.gps}</p>}</div>
    <Field label="Remarks" error={errs.remarks}><textarea className={inputCls} rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Observations, follow-ups…" /></Field>
    <div className="grid grid-cols-2 gap-2"><Button variant="secondary" disabled={act.pending} onClick={saveDraft}>Save draft</Button><Button disabled={act.pending} onClick={submit}>{act.pending ? 'Saving…' : 'Submit'}</Button></div>
    {draft && <Button variant="ghost" full disabled={act.pending} onClick={discard}>Discard draft</Button>}
  </>)
}
