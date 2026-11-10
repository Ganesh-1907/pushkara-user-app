import { useState } from 'react'
import { Play, CheckCheck, UserCheck } from 'lucide-react'
import { repo, useUser } from '../data/store'
import { Button, Field, PhotoField, Sheet, inputCls } from './ui'
import { toast } from '../lib/toast'
import type { Ticket } from '../data/types'

/** Accept / Start / Resolve controls for a ticket. Hidden for officers (read-mostly). */
export default function TicketActions({ t }: { t: Ticket }) {
  const user = useUser()!
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<string | undefined>()
  const [err, setErr] = useState('')
  if (user.role === 'officer' || user.role === 'admin' || t.status === 'Resolved') return null
  const mine = t.assignedUserId === user.id || (user.role === 'vendor' && t.vendorId === user.vendorId)

  const resolve = () => {
    if (note.trim().length < 5) return setErr('Enter a proof note (at least 5 characters).')
    repo.tickets.resolve(t.id, note.trim(), photo)
    toast('Ticket resolved'); setOpen(false); setNote(''); setPhoto(undefined); setErr('')
  }
  return (
    <>
      <div className="flex gap-2">
        {t.status === 'Open' && <Button full onClick={() => { repo.tickets.accept(t.id); toast('Assigned to you') }}><UserCheck size={18} />Accept</Button>}
        {t.status === 'Assigned' && mine && <Button full onClick={() => { repo.tickets.start(t.id); toast('Work started') }}><Play size={18} />Start</Button>}
        {t.status === 'In progress' && mine && <Button full variant="success" onClick={() => setOpen(true)}><CheckCheck size={18} />Resolve</Button>}
      </div>
      <Sheet open={open} title={`Resolve ${t.id}`} onClose={() => setOpen(false)}>
        <Field label="Proof note" error={err}><textarea className={inputCls} rows={4} value={note} onChange={e => { setNote(e.target.value); setErr('') }} placeholder="Describe what was done" /></Field>
        <PhotoField value={photo} onChange={setPhoto} label="Proof photo (optional)" />
        <Button full variant="success" onClick={resolve}>Mark resolved</Button>
      </Sheet>
    </>
  )
}
