import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import { useNavigate } from 'react-router-dom'
import { Navigation, ExternalLink } from 'lucide-react'
import { useAssets, useGhats, useProjects } from '../api/queries'
import { get } from '../api/client'
import type { Project } from '../api/types'
import { Badge, Button, Page, Sheet, condTone, workTone } from '../components/ui'
import { timeAgo } from '../lib/utils'

type Layer = 'Ghats' | 'Assets' | 'Works'
type Sel = { kind: Layer; id: string; title: string; sub: string; lat: number; lng: number; badge?: { tone: Parameters<typeof Badge>[0]['tone']; text: string }; to?: string }

const icon = (color: string, size: number, label = '') => L.divIcon({
  className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
  html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);color:#fff;font:700 11px system-ui;display:flex;align-items:center;justify-content:center">${label}</div>`,
})
const COND = { Good: '#16a34a', Fair: '#d97706', Poor: '#dc2626', Damaged: '#991b1b' } as const
const WORK = { 'On track': '#16a34a', Completed: '#4f46e5', Delayed: '#d97706', Critical: '#dc2626' } as const

export default function MapPage() {
  const nav = useNavigate()
  const gq = useGhats(); const aq = useAssets(); const pq = useProjects()
  // project coordinates are only on the detail endpoint
  const details = useQueries({ queries: (pq.data ?? []).map(p => ({ queryKey: ['project', p.id], queryFn: () => get<Project>(`/projects/${p.id}`) })) })
  const works = details.map(d => d.data).filter((p): p is Project => !!p && p.lat != null && p.lng != null)
  const ghats = gq.data ?? []; const assets = aq.data ?? []
  const [on, setOn] = useState<Record<Layer, boolean>>({ Ghats: true, Assets: true, Works: true })
  const [sel, setSel] = useState<Sel | null>(null)

  const select = (s: Sel) => setSel(s)
  const navUrl = (s: Sel) => `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`

  return (
    <Page title="Map" noPad refresh={[gq, aq, pq]}>
      <div className="absolute inset-0 flex flex-col">
        <div className="shrink-0 bg-white border-b border-gray-200 px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
          {(['Ghats', 'Assets', 'Works'] as Layer[]).map(l => (
            <button key={l} aria-pressed={on[l]} onClick={() => setOn({ ...on, [l]: !on[l] })}
              className={`shrink-0 min-h-[40px] px-4 rounded-full text-sm font-medium border ${on[l] ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-700 border-gray-300'}`}>{l}</button>
          ))}
        </div>
        <div className="flex-1 min-h-0">
          <MapContainer center={[17.0, 81.78]} zoom={12} className="h-full w-full" zoomControl={false}>
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {on.Ghats && ghats.map(g => (
              <Marker key={g.id} position={[g.lat, g.lng]} icon={icon('#4f46e5', 30, 'G')}
                eventHandlers={{ click: () => select({ kind: 'Ghats', id: g.id, title: g.name, sub: `${assets.filter(a => a.ghat_id === g.id).length} assets · ${(pq.data ?? []).filter(p => p.ghat_id === g.id).length} works`, lat: g.lat, lng: g.lng }) }} />
            ))}
            {on.Assets && assets.map(a => (
              <Marker key={a.id} position={[a.lat, a.lng]} icon={icon(COND[a.condition], 18)}
                eventHandlers={{ click: () => select({ kind: 'Assets', id: a.id, title: `${a.type} (${a.id})`, sub: `${a.ghat_name} · verified ${timeAgo(a.last_verified)}`, lat: a.lat, lng: a.lng, badge: { tone: condTone(a.condition), text: a.condition }, to: `/assets/${a.id}` }) }} />
            ))}
            {on.Works && works.map(p => {
              const st = p.status as keyof typeof WORK
              return <Marker key={p.id} position={[p.lat!, p.lng!]} icon={icon(WORK[st] ?? '#6b7280', 22, 'W')}
                eventHandlers={{ click: () => select({ kind: 'Works', id: p.id, title: p.name, sub: `${p.ghat_name} · ${p.actual_pct}% done vs ${p.planned_pct}% planned`, lat: p.lat!, lng: p.lng!, badge: { tone: workTone(p.status), text: p.status }, to: `/works/${p.id}` }) }} />
            })}
          </MapContainer>
        </div>
        <div className="absolute left-3 bottom-3 z-[500] bg-white/95 rounded-xl px-3 py-2 text-[11px] text-gray-700 shadow">G ghat · W work · dots = assets (green good, amber fair, red poor)</div>
      </div>

      <Sheet open={!!sel} title={sel?.title || ''} onClose={() => setSel(null)}>
        {sel && (<>
          <div className="flex items-center gap-2"><Badge tone="gray">{sel.kind.replace(/s$/, '')}</Badge>{sel.badge && <Badge tone={sel.badge.tone}>{sel.badge.text}</Badge>}</div>
          <p className="text-sm text-gray-600">{sel.sub}</p>
          <p className="text-xs text-gray-400">{sel.lat.toFixed(5)}, {sel.lng.toFixed(5)}</p>
          <div className="grid grid-cols-1 gap-2">
            <a href={navUrl(sel)} target="_blank" rel="noreferrer" className="min-h-[44px] rounded-xl bg-brand-600 text-white font-semibold inline-flex items-center justify-center gap-2"><Navigation size={18} />Navigate (Google Maps)</a>
            <a href={`geo:${sel.lat},${sel.lng}?q=${sel.lat},${sel.lng}(${encodeURIComponent(sel.title)})`} className="min-h-[44px] rounded-xl border border-gray-300 bg-white text-gray-800 font-semibold inline-flex items-center justify-center gap-2"><ExternalLink size={18} />Open in maps app (geo:)</a>
            {sel.to && <Button variant="secondary" onClick={() => nav(sel.to!)}>View details</Button>}
          </div>
        </>)}
      </Sheet>
    </Page>
  )
}
