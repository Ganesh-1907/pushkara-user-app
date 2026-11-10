import { useNavigate, Link } from 'react-router-dom'
import { Bell, ScanLine, AlertTriangle, LogIn, Hammer, ClipboardCheck, Wrench, ChevronRight } from 'lucide-react'
import { useDb, useUser } from '../data/store'
import { Card, Badge, Page, SampleTag, workTone } from '../components/ui'
import { assignedTickets, buildNotifications, isOfficer, myProjects, myReportedTickets } from '../lib/selectors'
import { roleLabel, slaState, workStatus, isToday } from '../lib/utils'

export default function HomePage() {
  const db = useDb()
  const user = useUser()!
  const nav = useNavigate()
  const unread = buildNotifications(db, user).filter(n => !n.read).length
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const works = myProjects(db, user)
  const wstat = works.map(p => ({ p, ...workStatus(p) }))
  const alerts = wstat.filter(w => w.status === 'Delayed' || w.status === 'Critical').sort((a, b) => b.gap - a.gap)
  const officer = isOfficer(user)
  const tickets = officer ? db.tickets : assignedTickets(db, user)
  const overdue = tickets.filter(t => slaState(t).overdue)
  const ghat = db.ghats.find(g => g.id === user.ghatId)
  const dept = db.departments.find(d => d.id === user.departmentId)
  const vendor = db.vendors.find(v => v.id === user.vendorId)

  // Today's tasks
  const tasks: { id: string; title: string; sub: string; to: string; tone?: 'red' | 'amber' }[] = []
  if (!officer) {
    tickets.filter(t => t.status !== 'Resolved').slice(0, 3).forEach(t => tasks.push({ id: t.id, title: t.title, sub: `${t.id} · ${t.status} · ${slaState(t).label}`, to: '/maintenance', tone: slaState(t).overdue ? 'red' : undefined }))
    if (user.role === 'staff') {
      if (!db.inspections.some(i => i.status === 'submitted' && i.ghatId === user.ghatId && isToday(i.createdAt))) tasks.push({ id: 'insp', title: `Inspect ${ghat?.name}`, sub: 'Daily checklist not submitted yet', to: '/inspections/new' })
      const last = db.checkins.find(c => c.userId === user.id)
      if (!last || last.type === 'out' || !isToday(last.at)) tasks.push({ id: 'ci', title: 'Check in at your ghat', sub: 'Mark deployment attendance', to: '/checkin' })
    }
    wstat.filter(w => w.status !== 'Completed').slice(0, 2).forEach(w => {
      const next = w.p.milestones.find(m => !m.done)
      if (next) tasks.push({ id: w.p.id, title: `${w.p.name}`, sub: `Next milestone: ${next.title}`, to: `/works/${w.p.id}` })
    })
  } else {
    alerts.filter(a => a.status === 'Critical').slice(0, 3).forEach(a => tasks.push({ id: a.p.id, title: `Review: ${a.p.name}`, sub: `Critical, ${a.gap}% behind plan`, to: `/works/${a.p.id}`, tone: 'red' }))
    overdue.slice(0, 3).forEach(t => tasks.push({ id: t.id, title: `Escalate: ${t.title}`, sub: slaState(t).label, to: `/issues/${t.id}`, tone: 'red' }))
  }

  const quick = [
    { label: 'Scan QR', icon: ScanLine, to: '/scan' },
    { label: 'Report issue', icon: AlertTriangle, to: '/report' },
    { label: 'Check in', icon: LogIn, to: '/checkin' },
    { label: 'My works', icon: Hammer, to: '/works' },
    ...(user.role !== 'vendor' ? [{ label: 'Inspections', icon: ClipboardCheck, to: '/inspections' }] : []),
    ...(user.role !== 'officer' ? [{ label: 'Maintenance', icon: Wrench, to: '/maintenance' }] : [{ label: 'All issues', icon: Wrench, to: '/issues' }]),
  ]

  const kpis = officer ? [
    { label: 'Works on track', v: wstat.filter(w => w.status === 'On track' || w.status === 'Completed').length, c: 'text-green-700' },
    { label: 'Delayed', v: wstat.filter(w => w.status === 'Delayed').length, c: 'text-amber-600' },
    { label: 'Critical', v: wstat.filter(w => w.status === 'Critical').length, c: 'text-red-600' },
    { label: 'Open issues', v: db.tickets.filter(t => t.status !== 'Resolved').length, c: 'text-brand-700' },
    { label: 'SLA overdue', v: overdue.length, c: 'text-red-600' },
    { label: 'Assets poor/damaged', v: db.assets.filter(a => a.condition === 'Poor' || a.condition === 'Damaged').length, c: 'text-amber-600' },
  ] : [
    { label: 'My works', v: works.length, c: 'text-brand-700' },
    { label: 'Delayed / critical', v: alerts.length, c: 'text-amber-600' },
    { label: 'Open tasks', v: tickets.filter(t => t.status !== 'Resolved').length, c: 'text-brand-700' },
  ]
  const deployGap = officer ? db.deployments.filter(d => d.actual < d.planned).length : 0

  return (
    <Page title="Sutrana" right={
      <button aria-label="Notifications" onClick={() => nav('/notifications')} className="relative w-11 h-11 flex items-center justify-center rounded-full active:bg-gray-100">
        <Bell size={22} />{unread > 0 && <span className="absolute top-1.5 right-1 min-w-[18px] h-[18px] rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center px-1">{unread}</span>}
      </button>}>
      <div>
        <p className="text-gray-500 text-sm">{greet},</p>
        <h2 className="text-xl font-bold">{user.name}</h2>
        <div className="flex flex-wrap gap-2 mt-2 items-center">
          <Badge tone="indigo">{roleLabel(user.role)}</Badge>
          {(ghat || dept || vendor) && <span className="text-xs text-gray-500">{[ghat?.name, dept?.name, vendor?.name].filter(Boolean).join(' · ')}</span>}
          <SampleTag />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-200 p-3 text-center">
            <div className={`text-2xl font-bold ${k.c}`}>{k.v}</div>
            <div className="text-[11px] text-gray-500 leading-tight mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>
      {officer && deployGap > 0 && <Card className="!p-3 text-sm text-amber-900 !bg-amber-50 !border-amber-200">{deployGap} deployment categories are below planned strength across ghats. <Link to="/checkin" className="underline font-semibold">View headcount</Link></Card>}

      <section>
        <h3 className="font-semibold mb-2">Quick actions</h3>
        <div className="grid grid-cols-3 gap-2">
          {quick.map(q => (
            <button key={q.label} onClick={() => nav(q.to)} className="bg-white border border-gray-200 rounded-2xl min-h-[84px] flex flex-col items-center justify-center gap-1.5 active:bg-gray-50 text-sm font-medium text-gray-800">
              <q.icon className="text-brand-600" size={26} />{q.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-2">{officer ? 'Needs attention' : "Today's tasks"}</h3>
        {tasks.length === 0 ? <Card className="text-sm text-gray-500 text-center">Nothing pending. You are all caught up.</Card> : (
          <div className="space-y-2">
            {tasks.map(t => (
              <Card key={t.id} onClick={() => nav(t.to)} className="!p-3 flex items-center gap-3">
                <span className={`w-2 h-10 rounded-full ${t.tone === 'red' ? 'bg-red-500' : 'bg-brand-500'}`} />
                <span className="flex-1 min-w-0"><span className="block font-medium truncate">{t.title}</span><span className={`block text-xs truncate ${t.tone === 'red' ? 'text-red-600' : 'text-gray-500'}`}>{t.sub}</span></span>
                <ChevronRight className="text-gray-400" size={20} />
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="font-semibold mb-2">Delay & SLA alerts</h3>
        {alerts.length === 0 && overdue.length === 0 ? <Card className="text-sm text-gray-500 text-center">No delays or overdue tickets.</Card> : (
          <div className="space-y-2">
            {alerts.slice(0, 4).map(a => (
              <Card key={a.p.id} onClick={() => nav(`/works/${a.p.id}`)} className={`!p-3 !border-l-4 ${a.status === 'Critical' ? '!border-l-red-500' : '!border-l-amber-500'}`}>
                <div className="flex items-center gap-2"><span className="font-medium flex-1 truncate">{a.p.name}</span><Badge tone={workTone(a.status)}>{a.status}</Badge></div>
                <p className="text-xs text-gray-500 mt-1">{db.ghats.find(g => g.id === a.p.ghatId)?.name} · {a.p.progress}% done vs {a.planned}% planned</p>
              </Card>
            ))}
            {overdue.slice(0, 3).map(t => (
              <Card key={t.id} onClick={() => nav(`/issues/${t.id}`)} className="!p-3 !border-l-4 !border-l-red-500">
                <div className="flex items-center gap-2"><span className="font-medium flex-1 truncate">{t.title}</span><Badge tone="red">SLA overdue</Badge></div>
                <p className="text-xs text-gray-500 mt-1">{t.id} · {t.priority} · {slaState(t).label}</p>
              </Card>
            ))}
          </div>
        )}
      </section>
      {!officer && <p className="text-xs text-gray-400 text-center">My reported issues: {myReportedTickets(db, user).length} · <Link to="/issues" className="underline">view</Link></p>}
    </Page>
  )
}
