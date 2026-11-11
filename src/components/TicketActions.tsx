import { useState } from 'react'
import { Play, CheckCheck, UserCheck, ThumbsUp, RotateCcw } from 'lucide-react'
import { useUser } from '../api/auth'
import { useAction } from '../offline/useAction'
import { Button, Card, Field, PhotoField, Sheet, inputCls } from './ui'
import { isOfficerRole } from '../lib/constants'
import type { Ticket } from '../api/types'

/** Accept / Start / Resolve controls (assignee/vendor) and Confirm fixed / Reopen (reporter, once Resolved) for a ticket. Hidden for officers (read-mostly). */
export default function TicketActions({ t }: { t: Ticket }) {
  const user = useUser()!
  const act = useAction()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<string | undefined>()
  const [err, setErr] = useState('')
  const [reopenOpen, setReopenOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [rerr, setRerr] = useState('')
  const reporter = t.reported_by_id === user.id
  const base = `/tickets/${t.id}`
  if (t.status === 'Closed') return null
  if (t.status === 'Resolved') return reporter ? verify() : null
  if (isOfficerRole(user.role)) return null
  const mine = t.assignee_id === user.id || (user.role === 'vendor' && !!user.vendor_id && t.vendor_id === user.vendor_id)
  function verify() {
    const reopen = async () => {
      if (reason.trim().length < 3) return setRerr('Tell us what is still wrong (at least 3 characters).')
      const r = await act.run({ type: 'ticket.reopen', label: `Reopen ${t.id}`, method: 'POST', path: `${base}/reopen`, body: { reason: reason.trim() } }, { ok: 'Ticket reopened' })
      if (r) { setReopenOpen(false); setReason(''); setRerr('') }
    }
    return (
      <>
        <Card className="!bg-green-50 !border-green-200 space-y-2">
          <p className="font-semibold text-green-800">Fixed? Please verify.</p>
          <div className="flex gap-2">
            <Button full variant="success" disabled={act.pending} onClick={() => act.run({ type: 'ticket.close', label: `Close ${t.id}`, method: 'POST', path: `${base}/close` }, { ok: 'Thanks, ticket closed' })}><ThumbsUp size={18} />Confirm fixed</Button>
            <Button full variant="secondary" disabled={act.pending} onClick={() => setReopenOpen(true)}><RotateCcw size={18} />Reopen</Button>
          </div>
        </Card>
        <Sheet open={reopenOpen} title={`Reopen ${t.id}`} onClose={() => setReopenOpen(false)}>
          <Field label="Reason" error={rerr}><textarea className={inputCls} rows={4} value={reason} onChange={e => { setReason(e.target.value); setRerr('') }} placeholder="What is still not fixed?" /></Field>
          <Button full disabled={act.pending} onClick={reopen}>{act.pending ? 'Saving…' : 'Reopen ticket'}</Button>
        </Sheet>
      </>
    )
  }

  const resolve = async () => {
    if (note.trim().length < 5) return setErr('Enter a proof note (at least 5 characters).')
    const r = await act.run({ type: 'ticket.resolve', label: `Resolve ${t.id}`, method: 'POST', path: `${base}/resolve`, body: { note: note.trim() }, photos: { photo_url: photo } }, { ok: 'Ticket resolved' })
    if (r) { setOpen(false); setNote(''); setPhoto(undefined); setErr('') }
  }
  return (
    <>
      <div className="flex gap-2">
        {t.status === 'Open' && <Button full disabled={act.pending} onClick={() => act.run({ type: 'ticket.accept', label: `Accept ${t.id}`, method: 'POST', path: `${base}/accept` }, { ok: 'Assigned to you' })}><UserCheck size={18} />Accept</Button>}
        {(t.status === 'Assigned' || t.status === 'Reopened') && mine && <Button full disabled={act.pending} onClick={() => act.run({ type: 'ticket.start', label: `Start ${t.id}`, method: 'POST', path: `${base}/start` }, { ok: 'Work started' })}><Play size={18} />Start</Button>}
        {t.status === 'In progress' && mine && <Button full variant="success" onClick={() => setOpen(true)}><CheckCheck size={18} />Resolve</Button>}
      </div>
      <Sheet open={open} title={`Resolve ${t.id}`} onClose={() => setOpen(false)}>
        <Field label="Proof note" error={err}><textarea className={inputCls} rows={4} value={note} onChange={e => { setNote(e.target.value); setErr('') }} placeholder="Describe what was done" /></Field>
        <PhotoField value={photo} onChange={setPhoto} label="Proof photo (optional)" />
        <Button full variant="success" disabled={act.pending} onClick={resolve}>{act.pending ? 'Saving…' : 'Mark resolved'}</Button>
      </Sheet>
    </>
  )
}
