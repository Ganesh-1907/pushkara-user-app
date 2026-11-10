import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { repo, useDb, useUser } from '../data/store'
import { Badge, Button, Card, Field, GpsField, Page, PhotoField, Segmented, inputCls } from '../components/ui'
import { CHECKLIST } from '../data/seed'
import { useGps } from '../lib/useGps'
import { fmtDateTime } from '../lib/utils'
import { toast } from '../lib/toast'
import type { CheckResult, ChecklistItem, Inspection } from '../data/types'

const OPTS = ['Pass', 'Fail', 'NA'] as const
const TONES = { Pass: 'bg-green-600 text-white border-green-600', Fail: 'bg-red-600 text-white border-red-600', NA: 'bg-gray-600 text-white border-gray-600' }

export default function InspectionForm() {
  const { id } = useParams()
  const db = useDb()
  const existing = id !== 'new' ? db.inspections.find(i => i.id === id) : undefined
  if (id !== 'new' && !existing) return <Page title="Inspection" back="/inspections"><Card className="text-center text-gray-500">Inspection not found.</Card></Page>
  if (existing && existing.status === 'submitted') return <ReadOnly i={existing} />
  return <Form draft={existing} />
}

function ReadOnly({ i }: { i: Inspection }) {
  const db = useDb()
  return (
    <Page title={i.id} back="/inspections">
      <Card>
        <h2 className="font-bold text-lg">{db.ghats.find(g => g.id === i.ghatId)?.name}</h2>
        <p className="text-xs text-gray-500">{fmtDateTime(i.createdAt)} · {db.users.find(u => u.id === i.by)?.name}</p>
        {i.lat !== undefined && <p className="text-xs text-gray-500 mt-1">GPS stamp: {i.lat.toFixed(5)}, {i.lng?.toFixed(5)}</p>}
      </Card>
      <div className="space-y-2">{i.items.map(it => (
        <Card key={it.label} className="!p-3 flex items-center gap-2"><span className="flex-1 text-sm">{it.label}</span><Badge tone={it.result === 'Pass' ? 'green' : it.result === 'Fail' ? 'red' : 'gray'}>{it.result || '—'}</Badge></Card>
      ))}</div>
      {i.photo && <img src={i.photo} alt="Inspection" className="rounded-xl w-full max-h-56 object-cover" />}
      <Card><p className="text-sm font-medium">Remarks</p><p className="text-sm text-gray-600 mt-1">{i.remarks || '—'}</p></Card>
    </Page>
  )
}

function Form({ draft }: { draft?: Inspection }) {
  const db = useDb(); const user = useUser()!; const nav = useNavigate()
  const [ghatId, setGhatId] = useState(draft?.ghatId || user.ghatId || '')
  const [items, setItems] = useState<ChecklistItem[]>(draft?.items || CHECKLIST.map(label => ({ label, result: null })))
  const [photo, setPhoto] = useState<string | undefined>(draft?.photo)
  const [remarks, setRemarks] = useState(draft?.remarks || '')
  const [errs, setErrs] = useState<Record<string, string>>({})
  const gps = useGps()
  const stamp = gps.fix || (draft?.lat !== undefined ? { lat: draft.lat, lng: draft.lng!, accuracy: 0 } : null)

  const set = (label: string, r: CheckResult) => setItems(items.map(i => i.label === label ? { ...i, result: r } : i))
  const payload = () => ({ id: draft?.id, ghatId, items, photo, lat: stamp?.lat, lng: stamp?.lng, remarks: remarks.trim() })

  const saveDraft = () => {
    if (!ghatId) return setErrs({ ghat: 'Pick a ghat to save a draft.' })
    repo.inspections.save(payload(), false); toast('Draft saved'); nav('/inspections', { replace: true })
  }
  const submit = () => {
    const e: Record<string, string> = {}
    if (!ghatId) e.ghat = 'Pick a ghat.'
    if (items.some(i => !i.result)) e.items = 'Answer every checklist item (Pass / Fail / NA).'
    if (!stamp) e.gps = 'Capture the GPS stamp.'
    if (items.some(i => i.result === 'Fail') && remarks.trim().length < 5) e.remarks = 'Add remarks explaining the failed items.'
    setErrs(e)
    if (Object.keys(e).length) return
    repo.inspections.save(payload(), true); toast('Inspection submitted'); nav('/inspections', { replace: true })
  }
  const discard = () => { if (draft) repo.inspections.remove(draft.id); nav('/inspections', { replace: true }) }

  return (
    <Page title={draft ? `Draft ${draft.id}` : 'New inspection'} back="/inspections">
      <Field label="Ghat" error={errs.ghat}>
        <select className={inputCls} value={ghatId} onChange={e => setGhatId(e.target.value)}>
          <option value="">Select ghat…</option>{db.ghats.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </Field>
      <div className="space-y-3">
        {items.map(it => (
          <Card key={it.label} className="!p-3 space-y-2"><p className="text-sm font-medium">{it.label}</p><Segmented value={it.result} options={OPTS} onChange={r => set(it.label, r)} tones={TONES} /></Card>
        ))}
        {errs.items && <p role="alert" className="text-sm text-red-600">{errs.items}</p>}
      </div>
      <PhotoField value={photo} onChange={setPhoto} />
      <div><GpsField gps={gps} label="GPS stamp" />{stamp && !gps.fix && <p className="text-xs text-gray-500 mt-1">Saved with draft.</p>}{errs.gps && <p className="text-xs text-red-600 mt-1">{errs.gps}</p>}</div>
      <Field label="Remarks" error={errs.remarks}><textarea className={inputCls} rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Observations, follow-ups…" /></Field>
      <div className="grid grid-cols-2 gap-2"><Button variant="secondary" onClick={saveDraft}>Save draft</Button><Button onClick={submit}>Submit</Button></div>
      {draft && <Button variant="ghost" full onClick={discard}>Discard draft</Button>}
    </Page>
  )
}
