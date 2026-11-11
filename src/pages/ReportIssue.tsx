import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAssets, useGhats } from '../api/queries'
import { useAction } from '../offline/useAction'
import type { Priority, Ticket } from '../api/types'
import { Button, Field, GpsField, Page, PhotoField, Segmented, inputCls } from '../components/ui'
import { PRIORITIES, TICKET_CATEGORIES } from '../lib/constants'
import { useGps } from '../lib/useGps'
import { toast } from '../lib/toast'

export default function ReportIssue() {
  const nav = useNavigate(); const [sp] = useSearchParams()
  const aq = useAssets(); const gq = useGhats()
  const act = useAction()
  const preAsset = sp.get('asset') || ''
  const [mode, setMode] = useState<'Asset' | 'Location'>(preAsset ? 'Asset' : 'Location')
  const [assetId, setAssetId] = useState(preAsset)
  const [ghatId, setGhatId] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState<Priority>('Medium')
  const [desc, setDesc] = useState('')
  const [photo, setPhoto] = useState<string | undefined>()
  const [errs, setErrs] = useState<Record<string, string>>({})
  const gps = useGps()
  const assets = aq.data ?? []; const ghats = gq.data ?? []

  // auto-fill GPS for free-location reports
  useEffect(() => { if (mode === 'Location' && !gps.fix) gps.locate() }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    const e: Record<string, string> = {}
    const asset = assets.find(a => a.id === assetId)
    if (mode === 'Asset' && !asset) e.asset = 'Select an asset.'
    if (mode === 'Location' && !ghatId) e.ghat = 'Select the nearest ghat.'
    if (mode === 'Location' && !gps.fix) e.gps = 'Capture GPS location (or retry).'
    if (!category) e.category = 'Choose a category.'
    if (desc.trim().length < 10) e.desc = 'Describe the issue (at least 10 characters).'
    setErrs(e)
    if (Object.keys(e).length) return
    const body = {
      title: `${category}${asset ? ` - ${asset.type}` : ''}: ${desc.trim().slice(0, 40)}`, category, priority, description: desc.trim(),
      asset_id: mode === 'Asset' ? assetId : undefined,
      ghat_id: mode === 'Asset' ? asset?.ghat_id : ghatId,
      lat: mode === 'Asset' ? asset?.lat : gps.fix?.lat, lng: mode === 'Asset' ? asset?.lng : gps.fix?.lng,
    }
    const r = await act.run<Ticket>({ type: 'ticket.create', label: `New issue: ${category}`, method: 'POST', path: '/tickets', body, photos: { photo_url: photo } }, { ok: t => `Issue ${t.id} created` })
    if (!r) return
    nav(r.queued ? '/issues' : `/issues/${r.data!.id}`, { replace: true })
  }

  return (
    <Page title="Report an issue" back refresh={[aq, gq]}>
      <Segmented value={mode} options={['Asset', 'Location'] as const} onChange={m => { setMode(m); setErrs({}) }} />
      {mode === 'Asset' ? (
        <Field label="Asset" error={errs.asset}>
          <select className={inputCls} value={assetId} onChange={e => setAssetId(e.target.value)}>
            <option value="">{aq.isPending ? 'Loading assets…' : 'Select asset…'}</option>
            {assets.map(a => <option key={a.id} value={a.id}>{a.id} · {a.type} · {a.ghat_name}</option>)}
          </select>
        </Field>
      ) : (
        <>
          <Field label="Nearest ghat" error={errs.ghat}>
            <select className={inputCls} value={ghatId} onChange={e => setGhatId(e.target.value)}>
              <option value="">Select ghat…</option>
              {ghats.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <GpsField gps={gps} />
          {errs.gps && <p className="text-xs text-red-600 -mt-2">{errs.gps}</p>}
          {gps.error && !gps.fix && (
            <button className="min-h-[44px] text-sm text-brand-700 font-medium" onClick={() => {
              const g = ghats.find(x => x.id === ghatId); if (g) gps.setFix({ lat: g.lat, lng: g.lng, accuracy: 50 }); else toast('Select a ghat first')
            }}>Demo: use selected ghat location instead</button>
          )}
        </>
      )}
      <Field label="Category" error={errs.category}>
        <select className={inputCls} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">Select category…</option>
          {TICKET_CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <div><span className="block text-sm font-medium text-gray-700 mb-1">Priority</span>
        <div className="grid grid-cols-2 gap-1.5">
          {PRIORITIES.map(p => <button key={p} type="button" onClick={() => setPriority(p)} className={`min-h-[44px] rounded-xl text-sm font-semibold border ${priority === p ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-gray-300 text-gray-700'}`}>{p}</button>)}
        </div>
      </div>
      <Field label="Description" error={errs.desc}><textarea className={inputCls} rows={4} value={desc} onChange={e => setDesc(e.target.value)} placeholder="What is the problem?" /></Field>
      <PhotoField value={photo} onChange={setPhoto} />
      <Button full disabled={act.pending} onClick={submit}>{act.pending ? 'Submitting…' : 'Submit issue'}</Button>
    </Page>
  )
}
