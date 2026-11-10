export type Role = 'staff' | 'vendor' | 'officer' | 'admin'
export type Condition = 'Good' | 'Fair' | 'Poor' | 'Damaged'
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical'
export type TicketStatus = 'Open' | 'Assigned' | 'In progress' | 'Resolved'
export type CheckResult = 'Pass' | 'Fail' | 'NA'

export interface Ghat { id: string; name: string; lat: number; lng: number }
export interface Department { id: string; name: string }
export interface Vendor { id: string; name: string; contact: string }
export interface User {
  id: string; name: string; mobile: string; role: Role
  ghatId?: string; departmentId?: string; vendorId?: string
}
export interface Milestone { id: string; title: string; done: boolean }
export interface HistoryEntry { id: string; at: string; by: string; note: string; progress?: number; status?: string }
export interface Evidence { id: string; at: string; by: string; note: string; photo?: string }
export interface Project {
  id: string; name: string; ghatId: string; departmentId: string; vendorId: string
  startDate: string; endDate: string; progress: number
  milestones: Milestone[]; history: HistoryEntry[]; evidence: Evidence[]; remarks: string
  lat: number; lng: number
}
export interface Maintenance { id: string; date: string; note: string; by: string }
export interface Verification { id: string; at: string; by: string; distance: number; passed: boolean; photo?: string }
export interface Asset {
  id: string; type: string; ghatId: string; condition: Condition
  lat: number; lng: number; lastVerified: string | null
  maintenance: Maintenance[]; verifications: Verification[]
}
export interface Ticket {
  id: string; title: string; category: string; priority: Priority; description: string
  assetId?: string; ghatId?: string; lat?: number; lng?: number; photo?: string
  status: TicketStatus; reportedBy: string; assignedUserId?: string; vendorId?: string
  createdAt: string; dueAt: string; resolvedAt?: string; proofNote?: string; proofPhoto?: string
  history: HistoryEntry[]
}
export interface ChecklistItem { label: string; result: CheckResult | null }
export interface Inspection {
  id: string; ghatId: string; items: ChecklistItem[]; photo?: string
  lat?: number; lng?: number; remarks: string; status: 'draft' | 'submitted'
  createdAt: string; by: string
}
export interface Deployment { id: string; ghatId: string; category: string; planned: number; actual: number }
export interface Checkin { id: string; userId: string; ghatId: string; type: 'in' | 'out'; at: string; lat?: number; lng?: number; distance?: number }
export interface SyncItem { id: string; kind: string; label: string; at: string; status: 'pending' | 'synced' }

export interface DB {
  ghats: Ghat[]; departments: Department[]; vendors: Vendor[]; users: User[]
  projects: Project[]; assets: Asset[]; tickets: Ticket[]; inspections: Inspection[]
  deployments: Deployment[]; checkins: Checkin[]; readNotifs: string[]
  syncQueue: SyncItem[]; simOffline: boolean
}
