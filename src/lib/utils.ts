import type { Ticket, Role } from '../api/types'

export const VERIFY_THRESHOLD_M = 50

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
export const fmtDistance = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`)

export const roleLabel = (r: Role) => ({ staff: 'Municipal Staff', vendor: 'Vendor', officer: 'Government Officer', admin: 'Admin' }[r])

export function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
export function fmtDateTime(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
export function timeAgo(iso?: string | null) {
  if (!iso) return 'Never'
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}

export function slaState(t: Pick<Ticket, 'status' | 'due_at' | 'overdue'>): { overdue: boolean; label: string } {
  if (t.status === 'Resolved') return { overdue: false, label: 'Resolved - awaiting verification' }
  if (t.status === 'Closed') return { overdue: false, label: 'Closed' }

  const diff = new Date(t.due_at).getTime() - Date.now()
  const h = Math.floor(Math.abs(diff) / 3600000), m = Math.floor((Math.abs(diff) % 3600000) / 60000)
  const txt = h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
  return t.overdue || diff < 0 ? { overdue: true, label: `SLA overdue by ${txt}` } : { overdue: false, label: `Due in ${txt}` }
}

export const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString()

/** Maps a backend notification link (/tickets/X, /projects/X, /deployment, /assets/X) to a mobile route. */
export function notifRoute(link: string): string {
  const m = /^\/(tickets|projects|assets)\/(.+)$/.exec(link)
  if (m) return `/${m[1] === 'tickets' ? 'issues' : m[1] === 'projects' ? 'works' : 'assets'}/${m[2]}`
  if (link.startsWith('/deployment')) return '/checkin'
  return '/home'
}
