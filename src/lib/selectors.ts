import type { DB, User, Project, Ticket } from '../data/types'
import { workStatus, slaState } from './utils'

export const isOfficer = (u: User | null) => !!u && (u.role === 'officer' || u.role === 'admin')

export function myProjects(db: DB, u: User): Project[] {
  if (isOfficer(u)) return db.projects
  if (u.role === 'vendor') return db.projects.filter(p => p.vendorId === u.vendorId)
  return db.projects.filter(p => p.departmentId === u.departmentId)
}
export function myReportedTickets(db: DB, u: User): Ticket[] {
  return isOfficer(u) ? db.tickets : db.tickets.filter(t => t.reportedBy === u.id)
}
export function assignedTickets(db: DB, u: User): Ticket[] {
  if (u.role === 'vendor') return db.tickets.filter(t => t.vendorId === u.vendorId)
  if (u.role === 'staff') return db.tickets.filter(t => t.assignedUserId === u.id)
  return db.tickets
}
export function openTicketsForUser(db: DB, u: User): Ticket[] {
  return db.tickets.filter(t => t.status === 'Open' && (isOfficer(u) || u.role === 'vendor' || t.ghatId === u.ghatId))
}

export interface Notif { id: string; title: string; body: string; at: string; to: string; tone: 'red' | 'amber' | 'indigo'; read: boolean }
export function buildNotifications(db: DB, u: User): Notif[] {
  const out: Notif[] = []
  myProjects(db, u).forEach(p => {
    const { status, gap } = workStatus(p)
    if (status === 'Delayed' || status === 'Critical')
      out.push({ id: `delay-${p.id}-${status}`, title: `${status}: ${p.name}`, body: `${gap}% behind planned progress`, at: p.history[0]?.at || p.startDate, to: `/works/${p.id}`, tone: status === 'Critical' ? 'red' : 'amber', read: false })
  })
  const tk = isOfficer(u) ? db.tickets : [...assignedTickets(db, u), ...db.tickets.filter(t => t.reportedBy === u.id)]
  const seen = new Set<string>()
  tk.forEach(t => {
    if (seen.has(t.id)) return
    seen.add(t.id)
    if (slaState(t).overdue) out.push({ id: `sla-${t.id}`, title: `SLA overdue: ${t.title}`, body: `${t.id} · ${t.priority} priority`, at: t.dueAt, to: `/issues/${t.id}`, tone: 'red', read: false })
  })
  if (!isOfficer(u)) assignedTickets(db, u).filter(t => t.status === 'Assigned').forEach(t =>
    out.push({ id: `assign-${t.id}`, title: `New assignment: ${t.title}`, body: `${t.id} assigned to you`, at: t.createdAt, to: '/maintenance', tone: 'indigo', read: false }))
  return out.map(n => ({ ...n, read: db.readNotifs.includes(n.id) })).sort((a, b) => +new Date(b.at) - +new Date(a.at))
}
