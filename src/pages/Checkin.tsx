import { useState } from 'react'
import { LogIn, LogOut, Minus, Plus, MapPin } from 'lucide-react'
import { repo, useDb, useUser } from '../data/store'
import { Badge, Button, Card, Empty, Field, GpsField, Page, inputCls } from '../components/ui'
import { useGps } from '../lib/useGps'
import { distanceMeters, fmtDateTime, fmtDistance, isToday } from '../lib/utils'
import { toast } from '../lib/toast'

const ZONE_M = 500

export default function CheckinPage() {
  const db = useDb(); const user = useUser()!
  const readOnly = user.role === 'officer' || user.role === 'admin'
  const [ghatId, setGhatId] = useState(user.ghatId || db.ghats[0].id)
  const [err, setErr] = useState('')
  const gps = useGps()
  const ghat = db.ghats.find(g => g.id === ghatId)!
  const mine = db.checkins.filter(c => c.userId === user.id)
  const last = mine[0]
  const checkedIn = last?.type === 'in'
  const rows = db.deployments.filter(d => d.ghatId === ghatId)
  const totalGap = rows.reduce((s, r) => s + Math.max(0, r.planned - r.actual), 0)

  const act = async (type: 'in' | 'out') => {
    setErr('')
    const f = gps.fix || (await gps.locate())
    if (!f) return setErr('Capture your GPS location first (or use the demo location below).')
    const d = distanceMeters(f.lat, f.lng, ghat.lat, ghat.lng)
    repo.checkins.add({ ghatId: type === 'out' && last ? last.ghatId : ghatId, type, lat: f.lat, lng: f.lng, distance: Math.round(d) })
    toast(`Checked ${type} at ${ghat.name}${d > ZONE_M ? ` (${fmtDistance(d)} away, flagged)` : ''}`)
  }

  return (
    <Page title="Deployment check-in">
      {!readOnly && (
        <Card className="space-y-4">
          {checkedIn && <div className="rounded-xl bg-green-50 text-green-800 text-sm p-3">Checked in at <b>{db.ghats.find(g => g.id === last.ghatId)?.name}</b> since {fmtDateTime(last.at)}</div>}
          <Field label="Ghat"><select className={inputCls} value={ghatId} onChange={e => setGhatId(e.target.value)} disabled={checkedIn}>{db.ghats.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          <GpsField gps={gps} />
          {!gps.fix && <button className="min-h-[44px] text-sm text-brand-700 font-medium flex items-center gap-1.5" onClick={() => gps.setFix({ lat: ghat.lat, lng: ghat.lng, accuracy: 10 })}><MapPin size={16} />Demo: simulate being at {ghat.name}</button>}
          {gps.fix && <p className="text-xs text-gray-500">{fmtDistance(distanceMeters(gps.fix.lat, gps.fix.lng, ghat.lat, ghat.lng))} from {ghat.name} centre{distanceMeters(gps.fix.lat, gps.fix.lng, ghat.lat, ghat.lng) > ZONE_M ? ' (outside ghat zone, will be flagged)' : ''}</p>}
          {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
          {checkedIn ? <Button full variant="danger" onClick={() => act('out')}><LogOut size={18} />Check out</Button> : <Button full onClick={() => act('in')}><LogIn size={18} />Check in</Button>}
        </Card>
      )}

      <section>
        <div className="flex items-center mb-2"><h3 className="font-semibold flex-1">Headcount: {ghat.name}</h3>{totalGap > 0 ? <Badge tone="red">{totalGap} short</Badge> : <Badge tone="green">Fully staffed</Badge>}</div>
        {readOnly && <Field label="Ghat"><select className={inputCls} value={ghatId} onChange={e => setGhatId(e.target.value)}>{db.ghats.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>}
        <div className="space-y-2 mt-2">
          {rows.map(r => {
            const gap = r.planned - r.actual
            return (
              <Card key={r.id} className="!p-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1"><p className="font-medium text-sm">{r.category}</p><p className="text-xs text-gray-500">Planned {r.planned}</p></div>
                  {gap > 0 ? <Badge tone="red">Gap {gap}</Badge> : gap < 0 ? <Badge tone="amber">+{-gap} extra</Badge> : <Badge tone="green">OK</Badge>}
                  {!readOnly && (
                    <div className="flex items-center gap-1">
                      <button aria-label={`Decrease ${r.category}`} onClick={() => repo.deployments.setActual(r.id, r.actual - 1)} className="w-11 h-11 rounded-xl border border-gray-300 flex items-center justify-center active:bg-gray-100"><Minus size={18} /></button>
                      <span className="w-8 text-center font-bold">{r.actual}</span>
                      <button aria-label={`Increase ${r.category}`} onClick={() => repo.deployments.setActual(r.id, r.actual + 1)} className="w-11 h-11 rounded-xl border border-gray-300 flex items-center justify-center active:bg-gray-100"><Plus size={18} /></button>
                    </div>
                  )}
                  {readOnly && <span className="font-bold w-8 text-center">{r.actual}</span>}
                </div>
              </Card>
            )
          })}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">Sample data. Actual = currently deployed.</p>
      </section>

      {!readOnly && (
        <section>
          <h3 className="font-semibold mb-2">My check-in log</h3>
          {mine.filter(c => isToday(c.at)).length === 0 ? <Empty title="No check-ins today" /> : (
            <div className="space-y-2">{mine.filter(c => isToday(c.at)).map(c => (
              <Card key={c.id} className="!p-3 flex items-center gap-3">{c.type === 'in' ? <LogIn className="text-green-600" /> : <LogOut className="text-red-600" />}<div className="text-sm flex-1"><p className="font-medium">Check-{c.type} · {db.ghats.find(g => g.id === c.ghatId)?.name}</p><p className="text-xs text-gray-500">{fmtDateTime(c.at)}{c.distance !== undefined ? ` · ${fmtDistance(c.distance)} from centre` : ''}</p></div></Card>
            ))}</div>
          )}
        </section>
      )}
    </Page>
  )
}
