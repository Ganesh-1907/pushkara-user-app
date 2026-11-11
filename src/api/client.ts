/**
 * Fetch wrapper for the Sutrana API: base URL from VITE_API_BASE_URL, bearer token, normalised errors,
 * 401 -> logout. The token lives in localStorage (allowed: auth session only).
 */
const SESSION_KEY = 'sutrana.session.v2'

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')

export class ApiError extends Error {
  status: number; code: string; details?: unknown
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message); this.name = 'ApiError'; this.status = status; this.code = code; this.details = details
  }
  /** true when the request never reached the server (offline / DNS / CORS / server down) */
  get isNetwork() { return this.status === 0 }
}

// ---- session (token + user) ----
export interface Session { token: string; user: import('./types').User }
let session: Session | null = (() => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch { return null } })()
const listeners = new Set<() => void>()
export const subscribeSession = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export const getSession = () => session
export function setSession(s: Session | null) {
  session = s
  try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY) } catch { /* storage unavailable */ }
  listeners.forEach(l => l())
}

/** Set by the offline layer so GETs/POSTs fail fast while "simulate offline" is on. */
let forceOffline: () => boolean = () => false
export const setOfflineProbe = (f: () => boolean) => { forceOffline = f }

/** Called on 401 (token expired / revoked). Registered by the auth module so it can also clear caches. */
let onUnauthorized: () => void = () => setSession(null)
export const setUnauthorizedHandler = (f: () => void) => { onUnauthorized = f }

type Query = Record<string, string | number | boolean | undefined | null>
export interface ReqOpts { query?: Query; body?: unknown; form?: FormData; auth?: boolean; signal?: AbortSignal }

function qs(q?: Query) {
  if (!q) return ''
  const p = new URLSearchParams()
  Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, String(v)) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

export async function api<T>(method: string, path: string, opts: ReqOpts = {}): Promise<T> {
  if (forceOffline()) throw new ApiError(0, 'offline', 'You are offline.')
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (opts.auth !== false && session) headers.Authorization = `Bearer ${session.token}`
  let body: BodyInit | undefined
  if (opts.form) body = opts.form
  else if (opts.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(opts.body) }
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}${qs(opts.query)}`, { method, headers, body, signal: opts.signal })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new ApiError(0, 'network_error', 'Cannot reach the server. Check your connection.')
  }
  const text = await res.text()
  let data: unknown = null
  if (text) { try { data = JSON.parse(text) } catch { data = text } }
  if (!res.ok) {
    const e = (data as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error
    const err = new ApiError(res.status, e?.code || `http_${res.status}`, e?.message || `Request failed (${res.status})`, e?.details)
    if (res.status === 401 && opts.auth !== false && session) onUnauthorized()
    throw err
  }
  return data as T
}

export const get = <T>(path: string, query?: Query) => api<T>('GET', path, { query })
export const post = <T>(path: string, body?: unknown) => api<T>('POST', path, { body })
export const put = <T>(path: string, body?: unknown) => api<T>('PUT', path, { body })
export const patch = <T>(path: string, body?: unknown) => api<T>('PATCH', path, { body })
export const del = <T>(path: string) => api<T>('DELETE', path)

/** Absolute URL for an uploaded file path returned by the API (e.g. /uploads/abc.jpg). */
export const assetUrl = (u?: string | null) => (!u ? undefined : /^(https?:|data:|blob:)/.test(u) ? u : `${API_BASE}${u.startsWith('/') ? '' : '/'}${u}`)
