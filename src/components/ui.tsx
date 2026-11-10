import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, X, Camera, Inbox, MapPin, Loader2 } from 'lucide-react'
import { takePhoto } from '../native/camera'
import { onToast } from '../lib/toast'
import { useGps } from '../lib/useGps'

export const inputCls = 'w-full min-h-[44px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500'

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#4f46e5" />
      <path d="M8 21c4.5 0 4-10 8-10s3.5 10 8 10" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'; full?: boolean }
export function Button({ variant = 'primary', full, className = '', ...p }: BtnProps) {
  const v = {
    primary: 'bg-brand-600 text-white active:bg-brand-700 disabled:bg-brand-600/40',
    secondary: 'bg-white text-gray-800 border border-gray-300 active:bg-gray-100 disabled:text-gray-400',
    danger: 'bg-red-600 text-white active:bg-red-700 disabled:bg-red-600/40',
    success: 'bg-green-600 text-white active:bg-green-700 disabled:bg-green-600/40',
    ghost: 'text-brand-700 active:bg-brand-50',
  }[variant]
  return <button type="button" {...p} className={`min-h-[44px] px-4 rounded-xl font-semibold text-[15px] inline-flex items-center justify-center gap-2 transition-colors ${v} ${full ? 'w-full' : ''} ${className}`} />
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const cls = `bg-white rounded-2xl border border-gray-200 p-4 ${className}`
  return onClick ? <button type="button" onClick={onClick} className={`${cls} w-full text-left active:bg-gray-50 block`}>{children}</button> : <div className={cls}>{children}</div>
}

const tones = {
  gray: 'bg-gray-100 text-gray-700', green: 'bg-green-100 text-green-800', amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800', indigo: 'bg-brand-100 text-brand-800',
}
export type Tone = keyof typeof tones
export const Badge = ({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) =>
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${tones[tone]}`}>{children}</span>

export const workTone = (s: string): Tone => ({ 'On track': 'green', Completed: 'indigo', Delayed: 'amber', Critical: 'red' } as Record<string, Tone>)[s] || 'gray'
export const condTone = (c: string): Tone => ({ Good: 'green', Fair: 'amber', Poor: 'red', Damaged: 'red' } as Record<string, Tone>)[c] || 'gray'
export const prioTone = (p: string): Tone => ({ Low: 'gray', Medium: 'indigo', High: 'amber', Critical: 'red' } as Record<string, Tone>)[p] || 'gray'
export const statusTone = (s: string): Tone => ({ Open: 'red', Assigned: 'amber', 'In progress': 'indigo', Resolved: 'green' } as Record<string, Tone>)[s] || 'gray'

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
      {error && <span role="alert" className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  )
}

export function Segmented<T extends string>({ value, options, onChange, tones: tn }: { value: T | null; options: readonly T[]; onChange: (v: T) => void; tones?: Partial<Record<T, string>> }) {
  return (
    <div className="flex gap-1.5">
      {options.map(o => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={`flex-1 min-h-[44px] rounded-xl text-sm font-semibold border ${value === o ? (tn?.[o] || 'bg-brand-600 text-white border-brand-600') : 'bg-white text-gray-700 border-gray-300'}`}>{o}</button>
      ))}
    </div>
  )
}

export function Chips<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
      {options.map(o => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={`shrink-0 min-h-[40px] px-4 rounded-full text-sm font-medium border ${value === o ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-700 border-gray-300'}`}>{o}</button>
      ))}
    </div>
  )
}

export function Page({ title, back, right, children, noPad }: { title: string; back?: boolean | string; right?: ReactNode; children: ReactNode; noPad?: boolean }) {
  const nav = useNavigate()
  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 bg-white border-b border-gray-200 pt-safe">
        <div className="h-14 px-2 flex items-center gap-1">
          {back ? <button aria-label="Back" onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))} className="w-11 h-11 flex items-center justify-center rounded-full active:bg-gray-100"><ChevronLeft size={24} /></button> : <div className="w-2" />}
          <h1 className="flex-1 text-lg font-semibold truncate">{title}</h1>
          {right}
        </div>
      </header>
      <div className={`flex-1 min-h-0 ${noPad ? 'relative' : 'overflow-y-auto p-4 space-y-4'}`}>{children}</div>
    </div>
  )
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-12 px-6 text-gray-500">
      <Inbox className="mx-auto mb-3 text-gray-300" size={44} />
      <p className="font-semibold text-gray-700">{title}</p>
      {hint && <p className="text-sm mt-1">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="absolute inset-0 z-[1000] flex items-end" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-h-[88%] overflow-y-auto bg-white rounded-t-3xl sheet-in pb-safe">
        <div className="sticky top-0 bg-white flex items-center px-4 pt-3 pb-2 border-b border-gray-100 z-10">
          <h2 className="flex-1 font-semibold text-lg">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full active:bg-gray-100"><X size={22} /></button>
        </div>
        <div className="p-4 space-y-4">{children}</div>
      </div>
    </div>
  )
}

export function ProgressBar({ value, planned }: { value: number; planned?: number }) {
  return (
    <div className="relative h-2.5 rounded-full bg-gray-200 overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="absolute inset-y-0 left-0 bg-brand-600 rounded-full" style={{ width: `${value}%` }} />
      {planned !== undefined && <div className="absolute inset-y-0 w-0.5 bg-gray-800" style={{ left: `${planned}%` }} title="Planned" />}
    </div>
  )
}

export function PhotoField({ value, onChange, label = 'Photo (optional)' }: { value?: string; onChange: (v?: string) => void; label?: string }) {
  const [err, setErr] = useState('')
  return (
    <div>
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {value && <img src={value} alt="Captured" className="rounded-xl w-full max-h-52 object-cover mb-2 border border-gray-200" />}
      <div className="flex gap-2">
        <Button variant="secondary" full onClick={async () => {
          setErr('')
          try { const p = await takePhoto(); if (p) onChange(p) } catch (e) { setErr((e as Error).message) }
        }}><Camera size={18} />{value ? 'Retake' : 'Take / choose photo'}</Button>
        {value && <Button variant="ghost" onClick={() => onChange(undefined)}>Remove</Button>}
      </div>
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
    </div>
  )
}

export function GpsField({ gps, label = 'Location (GPS)' }: { gps: ReturnType<typeof useGps>; label?: string }) {
  return (
    <div>
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <div className="rounded-xl border border-gray-300 bg-white p-3 flex items-center gap-3">
        <MapPin size={20} className={gps.fix ? 'text-green-600' : 'text-gray-400'} />
        <div className="flex-1 text-sm min-w-0">
          {gps.loading ? 'Getting location…' : gps.fix ? <>{gps.fix.lat.toFixed(5)}, {gps.fix.lng.toFixed(5)}<span className="text-gray-500"> (±{Math.round(gps.fix.accuracy)} m)</span></> : <span className="text-gray-500">Not captured yet</span>}
        </div>
        <Button variant="secondary" onClick={() => gps.locate()} disabled={gps.loading}>{gps.loading ? <Loader2 className="animate-spin" size={16} /> : gps.fix ? 'Refresh' : 'Get'}</Button>
      </div>
      {gps.error && <p role="alert" className="text-xs text-red-600 mt-1">{gps.error}</p>}
    </div>
  )
}

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => onToast(m => { setMsg(m); setTimeout(() => setMsg(null), 2600) }), [])
  if (!msg) return null
  return <div role="status" className="absolute left-4 right-4 bottom-24 z-[2000] bg-gray-900 text-white text-sm rounded-xl px-4 py-3 text-center shadow-lg fade-in">{msg}</div>
}

export const SampleTag = () => <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">Sample data</span>
