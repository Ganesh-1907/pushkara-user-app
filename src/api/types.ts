/** Shapes returned by the Sutrana backend (snake_case JSON). */
export type Role = 'admin' | 'officer' | 'staff' | 'vendor'
export type Condition = 'Good' | 'Fair' | 'Poor' | 'Damaged'
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical'
export type TicketStatus = 'Open' | 'Assigned' | 'In progress' | 'Resolved' | 'Closed' | 'Reopened'
export type CheckResult = 'Pass' | 'Fail' | 'NA'
export type InspectionStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected'
export type WorkStatus = 'On track' | 'Delayed' | 'Critical' | 'Completed'

export interface Page<T> { items: T[]; total: number; page: number; page_size: number }

export interface User {
  id: string; name: string; phone: string; email: string; role: Role; designation: string
  ghat_id?: string | null; department_id?: string | null; vendor_id?: string | null
}
export interface DemoUser { id: string; name: string; phone: string; role: Role }
export interface TokenOut { access_token: string; token_type?: string; expires_in: number; user: User }

export interface Ghat { id: string; name: string; lat: number; lng: number }
export interface Department { id: string; name: string }

export interface Milestone { id: string; title: string; done: boolean; position: number }
export interface HistoryEntry { id: number; at: string; by: string; note: string; progress?: number | null; status?: string | null }
export interface Evidence { id: number; at: string; by: string; note: string; photo_url?: string | null }
export interface ProjectBrief {
  id: string; name: string; ghat_id: string; ghat_name: string; department_id: string; department_name: string
  vendor_id: string | null; vendor_name: string | null; start_date: string; end_date: string
  actual_pct: number; planned_pct: number; gap: number; status: WorkStatus | string
  escalation_level: number; escalation_to: string; budget_lakh: number
}
export interface Project extends ProjectBrief {
  description: string; remarks: string; lat: number | null; lng: number | null
  milestones: Milestone[]; history: HistoryEntry[]; evidence: Evidence[]
}

export interface Maintenance { id: number; at: string; note: string; by: string }
export interface Verification { id: number; at: string; by: string; lat: number; lng: number; distance: number; passed: boolean; photo_url?: string | null }
export interface AssetBrief {
  id: string; type: string; ghat_id: string; ghat_name: string; lat: number; lng: number
  condition: Condition; last_verified: string | null; handover: string; project_id: string | null
}
export interface Asset extends AssetBrief { maintenance: Maintenance[]; verifications: Verification[] }
export interface VerifyOut { passed: boolean; distance_m: number; threshold_m: number; verification: Verification; asset: Asset }

export interface TicketHistory { id: number; at: string; by: string; note: string; status?: string | null }
export interface Ticket {
  id: string; title: string; category: string; description: string
  ghat_id: string | null; ghat_name: string | null; asset_id: string | null
  lat: number | null; lng: number | null; photo_url: string | null
  priority: Priority; status: TicketStatus
  reported_by_id: string | null; reported_by_name: string | null; reported_by_role: string | null
  assignee_id: string | null; assignee_name: string | null; vendor_id: string | null; vendor_name: string | null
  created_at: string; due_at: string; resolved_at: string | null; closed_at: string | null; reopen_reason: string | null
  overdue: boolean; overdue_hours: number
  proof_note: string | null; proof_photo_url: string | null
  history: TicketHistory[]
}
export type TicketScope = 'reported' | 'assigned' | 'open'

export interface ChecklistItem { label: string; result: CheckResult | null }
export interface Inspection {
  id: string; project_id: string | null; project_name: string | null
  ghat_id: string; ghat_name: string; inspector_id: string; inspector_name: string
  created_at: string; updated_at: string; items: ChecklistItem[]
  lat: number | null; lng: number | null; photo_url: string | null; remarks: string
  status: InspectionStatus; reviewed_by_id: string | null; reviewed_at: string | null; review_note: string | null
}
export interface InspectionBody {
  ghat_id: string; items: ChecklistItem[]; photo_url?: string | null; lat?: number | null; lng?: number | null
  remarks?: string; submit?: boolean
}

export interface Deployment { id: string; ghat_id: string; ghat_name: string; resource: string; planned: number; deployed: number; gap: number }
export interface CheckinRow { id: number; user_id: string; ghat_id: string; ghat_name: string; type: 'in' | 'out'; at: string; lat: number | null; lng: number | null; distance: number | null; flagged: boolean }
export interface CheckinStatus { checked_in: boolean; last: CheckinRow | null }

export interface Notification { id: string; kind: 'delay' | 'sla' | 'deployment' | 'assignment' | 'ticket'; level: 'red' | 'amber' | 'indigo' | 'green'; title: string; body: string; at: string; link: string; read: boolean }
export interface NotificationList { items: Notification[]; unread: number }

export interface Kpis {
  projects_total: number; on_track: number; delayed: number; critical: number; completed: number
  assets_total: number; assets_verified_pct: number; assets_poor_damaged: number
  open_issues: number; sla_overdue: number; deployment_gap_rows: number; deployment_short_total: number
}
export interface Summary { kpis: Kpis }
