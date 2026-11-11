/**
 * Offline outbox. Mutations made while offline (real or "simulate offline") are queued in localStorage as
 * {type, method, path (endpoint), body (payload)} and replayed in order against the API by syncNow().
 * Photos queued offline are kept as (downscaled) data URLs in `photos` and uploaded at replay time, so the
 * API only ever receives the stored URL. This queue and the auth session are the only things kept in localStorage.
 */
import { useSyncExternalStore } from 'react'
import { ApiError, api, getSession, setOfflineProbe } from '../api/client'
import { getUser } from '../api/auth'
import { queryClient } from '../api/queryClient'
import { uploadPhoto } from '../api/uploads'

const KEY = 'sutrana.outbox.v1'

export interface MutationSpec {
  /** machine type, e.g. 'ticket.create' */
  type: string
  /** human label shown in the queue */
  label: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** endpoint path, e.g. /tickets/TKT-001/accept */
  path: string
  body?: Record<string, unknown>
  /** body field -> data URL of a captured photo; uploaded via /uploads and replaced by the returned URL */
  photos?: Record<string, string | undefined>
}
export interface OutboxItem extends MutationSpec {
  id: string; userId: string; at: string
  status: 'pending' | 'synced' | 'failed'
  error?: string
}
interface Snap { items: OutboxItem[]; simOffline: boolean; syncing: boolean }

function load(): OutboxItem[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}
let snap: Snap = { items: load(), simOffline: false, syncing: false }
const listeners = new Set<() => void>()
const set = (p: Partial<Snap>) => {
  snap = { ...snap, ...p }
  if (p.items) { try { localStorage.setItem(KEY, JSON.stringify(snap.items)) } catch { /* quota: keep in memory */ } }
  listeners.forEach(l => l())
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

export const isOffline = () => snap.simOffline || (typeof navigator !== 'undefined' && !navigator.onLine)
setOfflineProbe(() => snap.simOffline)
export const setSimOffline = (v: boolean) => set({ simOffline: v })

/** Outbox snapshot, scoped to the signed-in user. */
export function useOutbox() {
  const s = useSyncExternalStore(subscribe, () => snap)
  const uid = getSession()?.user.id
  const items = s.items.filter(i => i.userId === uid)
  return {
    items, simOffline: s.simOffline, syncing: s.syncing,
    pending: items.filter(i => i.status === 'pending').length,
    failed: items.filter(i => i.status === 'failed').length,
    offline: s.simOffline || (typeof navigator !== 'undefined' && !navigator.onLine),
  }
}
/** Re-render on browser online/offline events. */
export function useOnlineEvents() {
  useSyncExternalStore(
    l => { window.addEventListener('online', l); window.addEventListener('offline', l); return () => { window.removeEventListener('online', l); window.removeEventListener('offline', l) } },
    () => navigator.onLine,
  )
}

const nid = () => `Q-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase()

export function enqueue(spec: MutationSpec) {
  const u = getUser(); if (!u) return
  const item: OutboxItem = { ...spec, id: nid(), userId: u.id, at: new Date().toISOString(), status: 'pending' }
  set({ items: [...snap.items, item] })
}

/** Performs the HTTP call for a spec (uploads photos first). */
export async function execute<T>(spec: MutationSpec): Promise<T> {
  const body: Record<string, unknown> | undefined = spec.body ? { ...spec.body } : undefined
  for (const [field, dataUrl] of Object.entries(spec.photos || {})) {
    if (dataUrl) (body as Record<string, unknown>)[field] = await uploadPhoto(dataUrl)
  }
  return api<T>(spec.method, spec.path, { body })
}

/** Runs a mutation now, or queues it when offline / unreachable. */
export async function perform<T>(spec: MutationSpec): Promise<{ queued: true } | { queued: false; data: T }> {
  if (isOffline()) { enqueue(spec); return { queued: true } }
  try {
    return { queued: false, data: await execute<T>(spec) }
  } catch (e) {
    if (e instanceof ApiError && e.isNetwork) { enqueue(spec); return { queued: true } }
    throw e
  }
}

/** Replays pending/failed items of the current user in order. Returns counts. */
export async function syncNow(): Promise<{ synced: number; failed: number; stopped: boolean }> {
  const uid = getSession()?.user.id
  const res = { synced: 0, failed: 0, stopped: false }
  if (!uid || snap.syncing || isOffline()) { res.stopped = true; return res }
  set({ syncing: true })
  try {
    const todo = snap.items.filter(i => i.userId === uid && i.status !== 'synced')
    for (const it of todo) {
      try {
        await execute(it)
        patchItem(it.id, { status: 'synced', error: undefined }); res.synced++
      } catch (e) {
        if (e instanceof ApiError && e.isNetwork) { res.stopped = true; break }
        patchItem(it.id, { status: 'failed', error: (e as Error).message }); res.failed++
      }
    }
  } finally {
    // keep only the most recent 15 synced entries for display
    const synced = snap.items.filter(i => i.status === 'synced')
    const drop = new Set(synced.slice(0, Math.max(0, synced.length - 15)).map(i => i.id))
    set({ syncing: false, items: snap.items.filter(i => !drop.has(i.id)) })
    queryClient.invalidateQueries()
  }
  return res
}
function patchItem(id: string, p: Partial<OutboxItem>) { set({ items: snap.items.map(i => (i.id === id ? { ...i, ...p } : i)) }) }

export const discardItem = (id: string) => set({ items: snap.items.filter(i => i.id !== id) })
export const clearSynced = () => set({ items: snap.items.filter(i => i.status !== 'synced') })
