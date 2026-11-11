import { useState } from 'react'
import { LogIn, LogOut, Minus, Plus, MapPin } from 'lucide-react'
import { useUser } from '../api/auth'
import { useCheckins, useCheckinStatus, useDeployments, useGhats } from '../api/queries'
import { useAction } from '../offline/useAction'
import { Badge, Button, Card, Empty, Field, Gate, GpsField, Page, inputCls } from '../components/ui'
import { isOfficerRole } from '../lib/constants'
import { useGps } from '../lib/useGps'
import { distanceMeters, fmtDateTime, fmtDistance, isToday } from '../lib/utils'

const ZONE_M = 500

export default function CheckinPage() {
  const user = useUser()!
  const readOnly = user.role !== 'staff'
  const gq = useGhats()
  const [ghatSel, setGhatSel] = useState(user.ghat_id || '')
  const ghats = gq.data ?? []
  const ghatId = ghatSel || ghats[0]?.id || ''
  const dq = useDeployments(ghatId || undefined)
  const sq = useCheckinStatus(!readOnly)
  const cq = useCheckins(!readOnly)
  const act = useAction()
  const [err, setErr] = useState('')
  const gps = useGps()

  return (
    <Page title="Deployment check-in" refresh={readOnly ? [gq, dq] : [gq, dq, sq, cq]}>
      <Gate qs={[gq, ...(readOnly ? [] : [sq])]}>{() => {
        const ghat = ghats.find(g => g.id === ghatId)!
        const last = sq.data?.last ?? null
        const checkedIn = !!sq.data?.checked_in
        const dist = gps.fix && ghat ? distanceMeters(gps.fix.lat, gps.fix.lng, ghat.lat, ghat.lng) : null
        const rows = dq.data ?? []
        const totalGap = rows.reduce((s, r) => s + Math.max(0, r.gap), 0)
        const today = (cq.data ?? []).filter(c => isToday(c.at))

        const doAct = async (type: 'in' | 'out') => {
          setErr('')
          const f = gps.fix || (await gps.locate())
          if (!f) return setErr('Capture your GPS location first (or use the demo location below).')
          await act.run<{ flagged: boolean; distance: number | null }>(
            { type: `checkin.${type}`, label: `Check-${type} at ${ghat.name}`, method: 'POST', path: '/checkins', body: { ghat_id: type === 'out' && last ? last.ghat_id : ghatId, type, lat: f.lat, lng: f.lng } },
            { ok: d => `Checked ${type} at ${ghat.name}${d.flagged && d.distance != null ? ` (${fmtDistance(d.distance)} away, flagged)` : ''}` })
        }
        const setDeployed = (id: string, v: number) =>
          act.run({ type: 'deployment.update', label: `Headcount ${id} → ${v}`, method: 'PATCH', path: `/deployments/${id}`, body: { deployed: Math.max(0, v) } }, { ok: 'Headcount updated' })

        return (<>
          {!readOnly && (
            <Card className="space-y-4">
              {checkedIn && last && <div className="rounded-xl bg-green-50 text-green-800 text-sm p-3">Checked in at <b>{last.ghat_name}</b> since {fmtDateTime(last.at)}</div>}
              <Field label="Ghat"><select className={inputCls} value={ghatId} onChange={e => setGhatSel(e.target.value)} disabled={checkedIn}>{ghats.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
              <GpsField gps={gps} />
              {!gps.fix && <button className="min-h-[44px] text-sm text-brand-700 font-medium flex items-center gap-1.5" onClick={() => gps.setFix({ lat: ghat.lat, lng: ghat.lng, accuracy: 10 })}><MapPin size={16} />Demo: simulate being at {ghat.name}</button>}
              {dist !== null && <p className="text-xs text-gray-500">{fmtDistance(dist)} from {ghat.name} centre{dist > ZONE_M ? ' (outside ghat zone, will be flagged)' : ''}</p>}
              {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
              {checkedIn ? <Button full variant="danger" disabled={act.pending} onClick={() => doAct('out')}><LogOut size={18} />Check out</Button> : <Button full disabled={act.pending} onClick={() => doAct('in')}><LogIn size={18} />Check in</Button>}
            </Card>
          )}

          <section>
            <div className="flex items-center mb-2"><h3 className="font-semibold flex-1">Headcount: {ghat?.name}</h3>{dq.data && (totalGap > 0 ? <Badge tone="red">{totalGap} short</Badge> : <Badge tone="green">Fully staffed</Badge>)}</div>
            {readOnly && <Field label="Ghat"><select className={inputCls} value={ghatId} onChange={e => setGhatSel(e.target.value)}>{ghats.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>}
            <div className="space-y-2 mt-2">
              {dq.isError && !dq.data && <Card className="text-sm text-red-600 !p-3">{(dq.error as Error).message}</Card>}
              {dq.isPending && <Card className="text-sm text-gray-500 text-center !p-3">Loading headcount…</Card>}
              {dq.data && rows.length === 0 && <Empty title="No deployment rows for this ghat" />}
              {rows.map(r => {
                const gap = r.planned - r.deployed
                const canEdit = !readOnly && user.role === 'staff' && r.ghat_id === user.ghat_id
                return (
                  <Card key={r.id} className="!p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1"><p className="font-medium text-sm">{r.resource}</p><p className="text-xs text-gray-500">Planned {r.planned}</p></div>
                      {gap > 0 ? <Badge tone="red">Gap {gap}</Badge> : gap < 0 ? <Badge tone="amber">+{-gap} extra</Badge> : <Badge tone="green">OK</Badge>}
                      {canEdit ? (
                        <div className="flex items-center gap-1">
                          <button aria-label={`Decrease ${r.resource}`} disabled={act.pending || r.deployed <= 0} onClick={() => setDeployed(r.id, r.deployed - 1)} className="w-11 h-11 rounded-xl border border-gray-300 flex items-center justify-center active:bg-gray-100 disabled:opacity-40"><Minus size={18} /></button>
                          <span className="w-8 text-center font-bold">{r.deployed}</span>
                          <button aria-label={`Increase ${r.resource}`} disabled={act.pending} onClick={() => setDeployed(r.id, r.deployed + 1)} className="w-11 h-11 rounded-xl border border-gray-300 flex items-center justify-center active:bg-gray-100 disabled:opacity-40"><Plus size={18} /></button>
                        </div>
                      ) : <span className="font-bold w-8 text-center">{r.deployed}</span>}
                    </div>
                  </Card>
                )
              })}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Deployed = currently on the ground. Staff can edit only their own ghat.</p>
          </section>

          {!readOnly && (
            <section>
              <h3 className="font-semibold mb-2">My check-in log</h3>
              {today.length === 0 ? <Empty title="No check-ins today" /> : (
                <div className="space-y-2">{today.map(c => (
                  <Card key={c.id} className="!p-3 flex items-center gap-3">{c.type === 'in' ? <LogIn className="text-green-600" /> : <LogOut className="text-red-600" />}<div className="text-sm flex-1"><p className="font-medium">Check-{c.type} · {c.ghat_name}{c.flagged ? ' · flagged' : ''}</p><p className="text-xs text-gray-500">{fmtDateTime(c.at)}{c.distance != null ? ` · ${fmtDistance(c.distance)} from centre` : ''}</p></div></Card>
                ))}</div>
              )}
            </section>
          )}
        </>)
      }}</Gate>
    </Page>
  )
}
