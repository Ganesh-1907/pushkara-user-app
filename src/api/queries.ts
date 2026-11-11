/** Typed endpoint modules + react-query hooks (reads). Mutations go through offline/outbox.ts via useAction. */
import { useQuery } from '@tanstack/react-query'
import { get } from './client'
import { useUser } from './auth'
import type {
  Asset, AssetBrief, CheckinRow, CheckinStatus, Deployment, Department, Ghat, Inspection, NotificationList,
  Page, Project, ProjectBrief, Summary, Ticket, TicketScope,
} from './types'

/** Walks all pages of a list endpoint (page_size 200). */
async function all<T>(path: string, query: Record<string, string | number | undefined> = {}): Promise<T[]> {
  const out: T[] = []
  for (let page = 1; page < 50; page++) {
    const r = await get<Page<T>>(path, { ...query, page, page_size: 200 })
    out.push(...r.items)
    if (out.length >= r.total || r.items.length === 0) break
  }
  return out
}

const uid = () => useUser()?.id

// reference data
export const useGhats = () => useQuery({ queryKey: ['ghats'], queryFn: () => get<Ghat[]>('/ghats'), staleTime: 300_000 })
export const useDepartments = () => useQuery({ queryKey: ['departments'], queryFn: () => get<Department[]>('/departments'), staleTime: 300_000 })

// projects (works)
export const useProjects = () => useQuery({ queryKey: ['projects', uid()], queryFn: () => all<ProjectBrief>('/projects') })
export const useProject = (id?: string) => useQuery({ queryKey: ['project', id], queryFn: () => get<Project>(`/projects/${id}`), enabled: !!id })

// assets
export const useAssets = () => useQuery({ queryKey: ['assets', uid()], queryFn: () => all<AssetBrief>('/assets') })
export const useAsset = (id?: string) => useQuery({ queryKey: ['asset', id], queryFn: () => get<Asset>(`/assets/${id}`), enabled: !!id })

// tickets
export const useTickets = (scope?: TicketScope) =>
  useQuery({ queryKey: ['tickets', scope ?? 'all', uid()], queryFn: () => all<Ticket>('/tickets', { scope }) })
export const useTicket = (id?: string) => useQuery({ queryKey: ['ticket', id], queryFn: () => get<Ticket>(`/tickets/${id}`), enabled: !!id })

// inspections
export const useInspections = () => useQuery({ queryKey: ['inspections', uid()], queryFn: () => all<Inspection>('/inspections') })
export const useInspection = (id?: string) => useQuery({ queryKey: ['inspection', id], queryFn: () => get<Inspection>(`/inspections/${id}`), enabled: !!id && id !== 'new' })

// deployments + check-ins
export const useDeployments = (ghat?: string) =>
  useQuery({ queryKey: ['deployments', ghat ?? 'all'], queryFn: () => get<Deployment[]>('/deployments', { ghat }) })
export const useCheckinStatus = (enabled = true) => useQuery({ queryKey: ['checkin-status', uid()], queryFn: () => get<CheckinStatus>('/checkins/status'), enabled })
export const useCheckins = (enabled = true) => useQuery({ queryKey: ['checkins', uid()], queryFn: () => all<CheckinRow>('/checkins'), enabled })

// notifications + dashboard
export const useNotifications = () => useQuery({ queryKey: ['notifications', uid()], queryFn: () => get<NotificationList>('/notifications'), refetchInterval: 60_000 })
export const useSummary = (enabled = true) => useQuery({ queryKey: ['summary', uid()], queryFn: () => get<Summary>('/dashboard/summary'), enabled })
