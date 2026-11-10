import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, ShieldCheck, Edit3, AlertTriangle, Crosshair } from 'lucide-react'
import { repo, useDb } from '../data/store'
import { Badge, Button, Card, Empty, Field, GpsField, Page, PhotoField, Sheet, condTone, inputCls } from '../components/ui'
import { useGps } from '../lib/useGps'
import { VERIFY_THRESHOLD_M, distanceMeters, fmtDate, fmtDateTime, timeAgo } from '../lib/utils'
import { toast } from '../lib/toast'
import type { Condition } from '../data/types'

export default function AssetDetail() {
  const { id } = useParams()
  const db = useDb(); const nav = useNavigate()
  const asset = db.assets.find(a => a.id === id)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [condOpen, setCondOpen] = useState(false)
  const gps = useGps()
  const [photo, setPhoto] = useState<string | undefined>()
  const [cond, setCond] = useState<Condition>('Good')
  const [note, setNote] = useState('')
  if (!asset) return <Page title="Asset" back><Empty title="Asset not found" hint={`No asset with ID ${id}.`} /></Page>

  const ghat = db.ghats.find(g => g.id === asset.ghatId)
  const dist = gps.fix ? distanceMeters(gps.fix.lat, gps.fix.lng, asset.lat, asset.lng) : null
  const passed = dist !== null && dist <= VERIFY_THRESHOLD_M

  const openVerify = () => { gps.setFix(null); setPhoto(undefined); setVerifyOpen(true) }
  const simulate = () => gps.setFix({ lat: asset.lat + 0.00001, lng: asset.lng + 0.00001, accuracy: 5 })
  const submitVerify = () => {
    if (dist === null) return
    repo.assets.verify(asset.id, { distance: Math.round(dist), passed, photo })
    toast(passed ? 'Asset verified. Last-verified date updated.' : 'Failed attempt recorded (too far from asset).')
    setVerifyOpen(false)
  }
  const submitCond = () => {
    repo.assets.updateCondition(asset.id, cond, note.trim())
    toast('Condition updated'); setCondOpen(false); setNote('')
  }

  return (
    <Page title={asset.id} back>
      <Card>
        <div className="flex items-start justify-between gap-2">
          <div><h2 className="text-xl font-bold">{asset.type}</h2><p className="text-sm text-gray-500">{ghat?.name}</p></div>
          <Badge tone={condTone(asset.condition)}>{asset.condition}</Badge>
        </div>
        <dl className="grid grid-cols-2 gap-3 mt-4 text-sm">
          <div><dt className="text-gray-500">Last verified</dt><dd className="font-medium">{timeAgo(asset.lastVerified)}</dd><dd className="text-xs text-gray-500">{fmtDate(asset.lastVerified)}</dd></div>
          <div><dt className="text-gray-500">Registered location</dt><dd className="font-medium text-xs">{asset.lat.toFixed(5)}, {asset.lng.toFixed(5)}</dd></div>
        </dl>
        <p className="text-[11px] text-gray-400 mt-3">Sample data</p>
      </Card>

      <div className="grid grid-cols-1 gap-2">
        <Button onClick={openVerify}><ShieldCheck size={18} />Verify asset</Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => { setCond(asset.condition); setCondOpen(true) }}><Edit3 size={18} />Update condition</Button>
          <Button variant="secondary" onClick={() => nav(`/report?asset=${asset.id}`)}><AlertTriangle size={18} />Report issue</Button>
        </div>
      </div>

      <section>
        <h3 className="font-semibold mb-2">Maintenance history</h3>
        {asset.maintenance.length === 0 ? <Empty title="No maintenance records" /> : (
          <div className="space-y-2">{asset.maintenance.map(m => (
            <Card key={m.id} className="!p-3"><p className="text-sm">{m.note}</p><p className="text-xs text-gray-500 mt-1">{fmtDate(m.date)} · {m.by}</p></Card>
          ))}</div>
        )}
      </section>

      <section>
        <h3 className="font-semibold mb-2">Verification log</h3>
        {asset.verifications.length === 0 ? <Card className="text-sm text-gray-500 text-center !p-3">No verifications recorded in this session.</Card> : (
          <div className="space-y-2">{asset.verifications.map(v => (
            <Card key={v.id} className="!p-3 flex gap-3 items-center">
              {v.passed ? <CheckCircle2 className="text-green-600 shrink-0" /> : <XCircle className="text-red-600 shrink-0" />}
              <div className="flex-1 text-sm"><p className="font-medium">{v.passed ? 'Verified' : 'Failed (out of range)'} · {v.distance} m</p><p className="text-xs text-gray-500">{fmtDateTime(v.at)} · {v.by}</p></div>
              {v.photo && <img src={v.photo} alt="Verification" className="w-12 h-12 rounded-lg object-cover" />}
            </Card>
          ))}</div>
        )}
      </section>

      <Sheet open={verifyOpen} title="Verify asset" onClose={() => setVerifyOpen(false)}>
        <p className="text-sm text-gray-600">Stand next to the asset. Verification passes within {VERIFY_THRESHOLD_M} m of its registered location.</p>
        <GpsField gps={gps} label="Your location" />
        {!gps.fix && <button onClick={simulate} className="min-h-[44px] text-sm text-brand-700 font-medium flex items-center gap-1.5"><Crosshair size={16} />Demo: simulate being at the asset</button>}
        {dist !== null && (
          <div className={`rounded-xl p-3 flex items-center gap-3 ${passed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`} role="status">
            {passed ? <CheckCircle2 /> : <XCircle />}
            <div className="text-sm"><p className="font-semibold">{passed ? 'PASS' : 'FAIL'}: {Math.round(dist)} m from registered location</p><p className="text-xs">Threshold {VERIFY_THRESHOLD_M} m</p></div>
          </div>
        )}
        <PhotoField value={photo} onChange={setPhoto} />
        <Button full disabled={dist === null} onClick={submitVerify} variant={passed ? 'success' : 'primary'}>{dist === null ? 'Capture location first' : passed ? 'Confirm verification' : 'Record failed attempt'}</Button>
      </Sheet>

      <Sheet open={condOpen} title="Update condition" onClose={() => setCondOpen(false)}>
        <Field label="Condition">
          <select className={inputCls} value={cond} onChange={e => setCond(e.target.value as Condition)}>
            {(['Good', 'Fair', 'Poor', 'Damaged'] as Condition[]).map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Note (optional)"><textarea className={inputCls} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="What did you observe?" /></Field>
        <Button full onClick={submitCond} disabled={cond === asset.condition && !note.trim()}>Save condition</Button>
      </Sheet>
    </Page>
  )
}
