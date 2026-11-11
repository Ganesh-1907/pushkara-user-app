import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { perform, type MutationSpec } from './outbox'
import { toast } from '../lib/toast'

export interface ActionMsgs<T> { ok?: string | ((d: T) => string); queued?: string }

/**
 * Runs an API mutation (or queues it offline), toasts the result, refreshes cached queries, tracks `pending`.
 * Resolves `{queued, data}` or null when it failed (error already toasted).
 */
export function useAction() {
  const [pending, setPending] = useState(false)
  const busy = useRef(false)
  const qc = useQueryClient()
  const run = useCallback(async <T = unknown>(spec: MutationSpec, msgs: ActionMsgs<T> = {}): Promise<{ queued: boolean; data?: T } | null> => {
    if (busy.current) return null
    busy.current = true; setPending(true)
    try {
      const r = await perform<T>(spec)
      if (r.queued) toast(msgs.queued || 'Saved offline. It will sync when you are back online.')
      else {
        const m = typeof msgs.ok === 'function' ? msgs.ok(r.data) : msgs.ok
        if (m) toast(m)
        await qc.invalidateQueries()
      }
      return r
    } catch (e) {
      toast((e as Error).message || 'Something went wrong')
      return null
    } finally { busy.current = false; setPending(false) }
  }, [qc])
  return { run, pending }
}
