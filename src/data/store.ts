/**
 * Single data layer for the Sutrana mobile prototype.
 * Everything is persisted in localStorage. UI code must only talk to `repo` / `auth` / hooks from here,
 * so a real REST API (see README "Backend endpoints") can replace the internals without touching screens.
 * Every `repo.*` mutation is synchronous today; swap to async + react-query/SWR later.
 */
import { useSyncExternalStore } from 'react'
import { buildSeed, SLA_HOURS } from './seed'
import type { DB, Role, User, Asset, Condition, Ticket, Priority, Inspection, CheckResult, Checkin, Project } from './types'

const KEY = 'sutrana.db.v1'
const SESSION_KEY = 'sutrana.session.v1'

// ---------- persistence + subscription ----------
function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as DB
  } catch { /* ignore corrupted storage */ }
  const s = buildSeed()
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ }
  return s
}
let state: DB = load()
let session: { userId: string } | null = (() => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch { return null } })()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())
export const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* quota exceeded: keep in memory */ } }
function mutate(fn: (d: DB) => void, queue?: { kind: string; label: string }) {
  const d: DB = JSON.parse(JSON.stringify(state))
  fn(d)
  if (queue && isOffline(d)) d.syncQueue.unshift({ id: nid('Q'), kind: queue.kind, label: queue.label, at: new Date().toISOString(), status: 'pending' })
  state = d
  persist()
  emit()
}
export const isOffline = (d: DB = state) => d.simOffline || (typeof navigator !== 'undefined' && !navigator.onLine)
export const nid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase()
const now = () => new Date().toISOString()

export function useDb(): DB { return useSyncExternalStore(subscribe, () => state) }
const sessionSnap = () => session
export function useUser(): User | null {
  const db = useDb()
  const s = useSyncExternalStore(subscribe, sessionSnap)
  return s ? db.users.find(u => u.id === s.userId) || null : null
}
export const getUser = (): User | null => (session ? state.users.find(u => u.id === session!.userId) || null : null)
const me = () => getUser()?.name || 'Unknown'

// ---------- auth ----------
export const DEMO_OTP = '1234'
export const auth = {
  /** Replace with POST /auth/otp/request */
  requestOtp(_mobile: string) { return { ok: true } },
  /** Replace with POST /auth/otp/verify -> { token, user }. Falls back to first demo user of the role. */
  verify(mobile: string, otp: string, role: Role): { ok: boolean; error?: string; user?: User } {
    if (otp !== DEMO_OTP) return { ok: false, error: 'Incorrect OTP. Use 1234 for the demo.' }
    const user = state.users.find(u => u.mobile === mobile && u.role === role) || state.users.find(u => u.role === role)
    if (!user) return { ok: false, error: 'No demo user for this role.' }
    session = { userId: user.id }
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)) } catch { /* ignore */ }
    emit()
    return { ok: true, user }
  },
  logout() { session = null; try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ } emit() },
  demoUsers: (role: Role) => state.users.filter(u => u.role === role),
}

// ---------- repository ----------
export const repo = {
  assets: {
    verify(id: string, v: { distance: number; passed: boolean; photo?: string }) {
      mutate(d => {
        const a = d.assets.find(x => x.id === id); if (!a) return
        a.verifications.unshift({ id: nid('V'), at: now(), by: me(), ...v })
        if (v.passed) a.lastVerified = now()
      }, { kind: 'verification', label: `Verify ${id}` })
    },
    updateCondition(id: string, condition: Condition, note: string) {
      mutate(d => {
        const a = d.assets.find(x => x.id === id); if (!a) return
        a.condition = condition
        a.maintenance.unshift({ id: nid('MT'), date: now(), note: `Condition set to ${condition}${note ? ': ' + note : ''}`, by: me() })
      }, { kind: 'asset', label: `Condition ${id}` })
    },
  },
  works: {
    toggleMilestone(pid: string, mid: string) {
      mutate(d => {
        const p = d.projects.find(x => x.id === pid); const m = p?.milestones.find(x => x.id === mid)
        if (!p || !m) return
        m.done = !m.done
        p.history.unshift({ id: nid('H'), at: now(), by: me(), note: `Milestone "${m.title}" ${m.done ? 'completed' : 'reopened'}`, progress: p.progress })
      }, { kind: 'milestone', label: `Milestone ${pid}` })
    },
    update(pid: string, u: { progress: number; remarks: string; photo?: string }) {
      mutate(d => {
        const p = d.projects.find(x => x.id === pid); if (!p) return
        p.progress = u.progress
        p.remarks = u.remarks
        p.history.unshift({ id: nid('H'), at: now(), by: me(), note: u.remarks || 'Progress updated', progress: u.progress })
        if (u.photo) p.evidence.unshift({ id: nid('E'), at: now(), by: me(), note: u.remarks, photo: u.photo })
      }, { kind: 'progress', label: `Progress ${pid} → ${u.progress}%` })
    },
  },
  tickets: {
    create(t: { title: string; category: string; priority: Priority; description: string; assetId?: string; ghatId?: string; lat?: number; lng?: number; photo?: string }): Ticket {
      const id = 'T-' + (1001 + state.tickets.length + Math.floor(Math.random() * 90))
      const created = new Date()
      const ticket: Ticket = {
        ...t, id, status: 'Open', reportedBy: getUser()?.id || 'unknown', createdAt: created.toISOString(),
        dueAt: new Date(created.getTime() + SLA_HOURS[t.priority] * 3600000).toISOString(),
        history: [{ id: nid('H'), at: created.toISOString(), by: me(), note: 'Ticket created', status: 'Open' }],
      }
      mutate(d => { d.tickets.unshift(ticket) }, { kind: 'ticket', label: `New issue ${id}` })
      return ticket
    },
    accept(id: string) {
      const u = getUser(); if (!u) return
      mutate(d => {
        const t = d.tickets.find(x => x.id === id); if (!t) return
        t.status = 'Assigned'
        if (u.role === 'vendor') t.vendorId = u.vendorId; else t.assignedUserId = u.id
        t.history.unshift({ id: nid('H'), at: now(), by: u.name, note: 'Accepted / assigned', status: 'Assigned' })
      }, { kind: 'ticket', label: `Accept ${id}` })
    },
    start(id: string) {
      mutate(d => {
        const t = d.tickets.find(x => x.id === id); if (!t) return
        t.status = 'In progress'
        t.history.unshift({ id: nid('H'), at: now(), by: me(), note: 'Work started', status: 'In progress' })
      }, { kind: 'ticket', label: `Start ${id}` })
    },
    resolve(id: string, note: string, photo?: string) {
      mutate(d => {
        const t = d.tickets.find(x => x.id === id); if (!t) return
        t.status = 'Resolved'; t.resolvedAt = now(); t.proofNote = note; t.proofPhoto = photo
        t.history.unshift({ id: nid('H'), at: now(), by: me(), note: `Resolved: ${note}`, status: 'Resolved' })
      }, { kind: 'ticket', label: `Resolve ${id}` })
    },
  },
  inspections: {
    /** Creates or updates an inspection. Returns its id. */
    save(i: { id?: string; ghatId: string; items: { label: string; result: CheckResult | null }[]; photo?: string; lat?: number; lng?: number; remarks: string }, submit: boolean): string {
      const id = i.id || nid('INS')
      mutate(d => {
        const rec: Inspection = { id, ghatId: i.ghatId, items: i.items, photo: i.photo, lat: i.lat, lng: i.lng, remarks: i.remarks, status: submit ? 'submitted' : 'draft', createdAt: now(), by: getUser()?.id || '' }
        const idx = d.inspections.findIndex(x => x.id === id)
        if (idx >= 0) d.inspections[idx] = rec; else d.inspections.unshift(rec)
      }, submit ? { kind: 'inspection', label: `Inspection ${id}` } : undefined)
      return id
    },
    remove(id: string) { mutate(d => { d.inspections = d.inspections.filter(x => x.id !== id) }) },
  },
  deployments: {
    setActual(id: string, actual: number) {
      mutate(d => { const r = d.deployments.find(x => x.id === id); if (r) r.actual = Math.max(0, actual) }, { kind: 'headcount', label: 'Headcount update' })
    },
  },
  checkins: {
    add(c: Omit<Checkin, 'id' | 'at' | 'userId'>) {
      mutate(d => { d.checkins.unshift({ ...c, id: nid('C'), at: now(), userId: getUser()?.id || '' }) }, { kind: 'checkin', label: `Check-${c.type}` })
    },
  },
  notifications: {
    markRead(id: string) { mutate(d => { if (!d.readNotifs.includes(id)) d.readNotifs.push(id) }) },
    markAllRead(ids: string[]) { mutate(d => { ids.forEach(i => { if (!d.readNotifs.includes(i)) d.readNotifs.push(i) }) }) },
  },
  sync: {
    /** Replace with a real flush of the offline queue to the API. */
    syncNow() { mutate(d => { d.syncQueue.forEach(q => { q.status = 'synced' }) }) },
    setSimOffline(v: boolean) { mutate(d => { d.simOffline = v }) },
  },
  /** "Reset demo data": re-seeds everything (session kept). */
  resetDemo() { state = buildSeed(); persist(); emit() },
}
export type { Asset, Project }
