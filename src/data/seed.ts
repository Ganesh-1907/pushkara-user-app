import type { DB, Asset, Condition, Project, Ticket, Priority, TicketStatus, Inspection, CheckResult } from './types'

const DAY = 86400000
const HOUR = 3600000
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString()
const day = (d: number) => iso(d * DAY)

export const CHECKLIST = ['Toilets clean', 'Drinking water available', 'Lighting working', 'Barricades intact', 'Signage visible', 'Garbage cleared', 'Changing rooms usable', 'Steps / ghat surface safe']
export const ASSET_TYPES = ['Toilet block', 'Water tank', 'Floodlight', 'Barricade', 'CCTV', 'Changing room', 'Signage board', 'Generator']
export const TICKET_CATEGORIES = ['Sanitation', 'Water supply', 'Electrical', 'Structural damage', 'Crowd / safety', 'Signage', 'Other']
export const DEPLOY_CATEGORIES = ['Sanitation workers', 'Police', 'Medical staff', 'Volunteers', 'Water tankers', 'Mobile toilets']
export const SLA_HOURS: Record<Priority, number> = { Critical: 4, High: 12, Medium: 48, Low: 96 }

export function buildSeed(): DB {
  const ghats = [
    { id: 'g1', name: 'Pushkar Ghat', lat: 17.0005, lng: 81.7804 },
    { id: 'g2', name: 'Kotilingala Ghat', lat: 16.9987, lng: 81.7922 },
    { id: 'g3', name: 'Saraswathi Ghat', lat: 17.0102, lng: 81.7751 },
    { id: 'g4', name: 'Gowthami Ghat', lat: 17.0061, lng: 81.7688 },
    { id: 'g5', name: 'Dowleswaram Ghat', lat: 16.9453, lng: 81.7655 },
    { id: 'g6', name: 'Kovvur Ghat', lat: 17.0213, lng: 81.7299 },
  ]
  const departments = ['Municipal Engineering', 'Public Health', 'Electrical', 'Sanitation', 'Roads & Buildings', 'Police & Traffic'].map((name, i) => ({ id: 'd' + (i + 1), name }))
  const vendors = [
    'Godavari Infra Works', 'AquaServe Constructions', 'BrightLine Electricals', 'CleanWave Sanitation',
    'Sri Sai Roadways', 'SecureVision Systems', 'Konaseema Barricades', 'GreenBin Services',
  ].map((name, i) => ({ id: 'v' + (i + 1), name, contact: '98480' + String(10000 + i * 111).slice(0, 5) }))

  const users = [
    { id: 'u-admin', name: 'Admin User', mobile: '9000000001', role: 'admin' as const },
    { id: 'u-officer', name: 'K. Ramesh Babu (Sub-Collector)', mobile: '9000000002', role: 'officer' as const },
    { id: 'u-s1', name: 'P. Suresh Kumar', mobile: '9000000011', role: 'staff' as const, ghatId: 'g1', departmentId: 'd1' },
    { id: 'u-s2', name: 'M. Lakshmi Devi', mobile: '9000000012', role: 'staff' as const, ghatId: 'g2', departmentId: 'd2' },
    { id: 'u-s3', name: 'T. Venkata Rao', mobile: '9000000013', role: 'staff' as const, ghatId: 'g3', departmentId: 'd4' },
    { id: 'u-v1', name: 'Anil (Godavari Infra Works)', mobile: '9000000021', role: 'vendor' as const, vendorId: 'v1' },
    { id: 'u-v2', name: 'Srinivas (AquaServe Constructions)', mobile: '9000000022', role: 'vendor' as const, vendorId: 'v2' },
  ]

  // Projects: [name, ghat, dept, vendor, startOffsetDays, endOffsetDays, progress]
  const pdefs: [string, string, string, string, number, number, number][] = [
    ['Ghat steps renovation', 'g1', 'd1', 'v1', -60, 20, 70],
    ['Toilet blocks construction (40 units)', 'g2', 'd2', 'v2', -50, 10, 45],
    ['Floodlight installation', 'g1', 'd3', 'v3', -40, 25, 50],
    ['Changing rooms', 'g3', 'd1', 'v1', -45, 15, 60],
    ['Drinking water points', 'g4', 'd2', 'v4', -30, 30, 50],
    ['Approach road resurfacing', 'g5', 'd5', 'v5', -70, -5, 80],
    ['CCTV network', 'g6', 'd6', 'v6', -25, 35, 40],
    ['Barricading & crowd control', 'g1', 'd6', 'v7', -20, 10, 55],
    ['Solid waste bins & sweeping', 'g2', 'd4', 'v8', -35, 20, 70],
    ['Generator & power backup', 'g3', 'd3', 'v3', -30, 5, 60],
    ['Signage boards', 'g4', 'd5', 'v5', -15, 25, 30],
    ['Parking area development', 'g5', 'd5', 'v1', -55, 30, 90],
  ]
  // vendor 2 also handles waste bins to give them two works
  const projects: Project[] = pdefs.map(([name, gid, dept, vendor, s, e, progress], i) => {
    const g = ghats.find(x => x.id === gid)!
    const titles = ['Mobilisation & survey', 'Material procurement', 'Main execution', 'Finishing & handover']
    const doneCount = Math.floor(progress / 25)
    return {
      id: 'P-' + String(i + 1).padStart(3, '0'), name, ghatId: gid, departmentId: dept,
      vendorId: i === 8 ? 'v2' : vendor, startDate: day(s), endDate: day(e), progress,
      milestones: titles.map((t, k) => ({ id: `m${k}`, title: t, done: k < doneCount })),
      history: [{ id: 'h0', at: day(s + 2), by: 'System', note: 'Work order issued', progress: 0, status: 'Started' }, { id: 'h1', at: day(-3), by: 'Site engineer', note: 'Weekly progress update', progress }],
      evidence: [], remarks: '',
      lat: g.lat + 0.0012 * ((i % 3) - 1), lng: g.lng + 0.0014 * ((i % 4) - 1.5),
    }
  })

  const conds: Condition[] = ['Good', 'Good', 'Fair', 'Good', 'Poor', 'Fair', 'Good', 'Damaged', 'Fair', 'Good']
  const assets: Asset[] = Array.from({ length: 30 }, (_, i) => {
    const g = ghats[i % 6]
    return {
      id: 'AST-' + String(i + 1).padStart(4, '0'), type: ASSET_TYPES[i % 8], ghatId: g.id,
      condition: conds[i % 10],
      lat: g.lat + ((i * 37) % 17 - 8) * 0.00007, lng: g.lng + ((i * 53) % 19 - 9) * 0.00007,
      lastVerified: i % 5 === 4 ? null : day(-((i * 3) % 20) - 1),
      maintenance: i % 3 === 0 ? [{ id: 'mt1', date: day(-12), note: 'Routine servicing completed', by: 'Godavari Infra Works' }, { id: 'mt2', date: day(-40), note: 'Installed and commissioned', by: 'Municipal Engineering' }] : [{ id: 'mt1', date: day(-30), note: 'Installed and commissioned', by: 'Municipal Engineering' }],
      verifications: [],
    }
  })

  // tickets: [title, category, priority, status, assetIdx|-1, ghat, ageHours, assignedUser, vendor, reportedBy]
  const tdefs: [string, string, Priority, TicketStatus, number, string, number, string?, string?, string?][] = [
    ['Toilet block door broken', 'Sanitation', 'Medium', 'Assigned', 0, 'g1', 30, 'u-s1', undefined, 'u-s2'],
    ['Floodlight not working', 'Electrical', 'High', 'In progress', 2, 'g3', 10, undefined, 'v3', 'u-s3'],
    ['Water tank leaking', 'Water supply', 'High', 'Assigned', 1, 'g2', 20, undefined, 'v2', 'u-s2'],
    ['Barricade fallen near steps', 'Crowd / safety', 'Critical', 'Open', 3, 'g4', 2, undefined, undefined, 'u-s1'],
    ['Garbage not cleared at ghat entrance', 'Sanitation', 'Medium', 'Resolved', -1, 'g1', 70, 'u-s1', undefined, 'u-s3'],
    ['CCTV camera offline', 'Electrical', 'Medium', 'Assigned', 4, 'g5', 60, undefined, 'v6', 'u-s2'],
    ['Signage board damaged', 'Signage', 'Low', 'Open', 6, 'g1', 12, undefined, undefined, 'u-s1'],
    ['Generator fuel low', 'Other', 'High', 'In progress', 7, 'g2', 6, 'u-s2', undefined, 'u-s2'],
    ['Changing room lock broken', 'Structural damage', 'Low', 'Assigned', 5, 'g3', 100, 'u-s3', undefined, 'u-s3'],
    ['No drinking water at point 3', 'Water supply', 'Critical', 'Assigned', -1, 'g4', 9, undefined, 'v1', 'u-s1'],
    ['Slippery steps - needs sand/mat', 'Crowd / safety', 'High', 'Open', -1, 'g1', 5, undefined, undefined, 'u-s1'],
    ['Overflowing dustbin', 'Sanitation', 'Low', 'Resolved', -1, 'g2', 120, 'u-s2', undefined, 'u-s1'],
    ['Flickering floodlight', 'Electrical', 'Medium', 'Assigned', 10, 'g5', 52, 'u-s1', 'v3', 'u-s2'],
    ['Pump motor noise', 'Water supply', 'Low', 'Resolved', 1, 'g2', 150, undefined, 'v2', 'u-s2'],
    ['Crowd barrier gap at Kovvur ghat', 'Crowd / safety', 'High', 'Open', -1, 'g6', 3, undefined, undefined, 'u-officer'],
  ]
  const tickets: Ticket[] = tdefs.map(([title, category, priority, status, ai, gid, age, au, ven, rep], i) => {
    const created = Date.now() - age * HOUR
    const g = ghats.find(x => x.id === gid)!
    const a = ai >= 0 ? assets[ai] : undefined
    return {
      id: 'T-' + String(1001 + i), title, category, priority, description: `${title}. Reported from the field, please attend.`,
      assetId: a?.id, ghatId: a ? a.ghatId : gid, lat: a ? a.lat : g.lat, lng: a ? a.lng : g.lng,
      status, reportedBy: rep || 'u-s1', assignedUserId: au, vendorId: ven,
      createdAt: new Date(created).toISOString(), dueAt: new Date(created + SLA_HOURS[priority] * HOUR).toISOString(),
      resolvedAt: status === 'Resolved' ? new Date(created + 5 * HOUR).toISOString() : undefined,
      proofNote: status === 'Resolved' ? 'Issue fixed and verified on site.' : undefined,
      history: [{ id: 'h0', at: new Date(created).toISOString(), by: 'Reporter', note: 'Ticket created', status: 'Open' }],
    }
  })

  const rnd = (i: number, j: number): CheckResult => { const v = (i * 7 + j * 3) % 10; return v < 7 ? 'Pass' : v < 9 ? 'Fail' : 'NA' }
  const inspections: Inspection[] = Array.from({ length: 8 }, (_, i) => {
    const g = ghats[i % 6]
    return {
      id: 'INS-' + String(i + 1).padStart(3, '0'), ghatId: g.id,
      items: CHECKLIST.map((label, j) => ({ label, result: rnd(i, j) })),
      lat: g.lat, lng: g.lng, remarks: i % 2 ? 'Minor issues noted, follow-up raised.' : 'Overall satisfactory.',
      status: 'submitted' as const, createdAt: iso(-(i * 9 + 3) * HOUR), by: users[2 + (i % 3)].id,
    }
  })

  const planned = [20, 12, 4, 25, 3, 6]
  const deployments = ghats.flatMap((g, gi) => DEPLOY_CATEGORIES.map((c, ci) => {
    const p = Math.max(1, Math.round(planned[ci] * (1 + (gi % 3) * 0.25)))
    const gap = (gi + ci) % 3 === 0 ? Math.max(1, Math.round(p * 0.25)) : (gi + ci) % 5 === 0 ? -1 : 0
    return { id: `D-${g.id}-${ci}`, ghatId: g.id, category: c, planned: p, actual: Math.max(0, p - gap) }
  }))

  return { ghats, departments, vendors, users, projects, assets, tickets, inspections, deployments, checkins: [], readNotifs: [], syncQueue: [], simOffline: false }
}
