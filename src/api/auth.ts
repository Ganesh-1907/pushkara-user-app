import { useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, get, getSession, post, setSession, setUnauthorizedHandler, subscribeSession } from './client'
import { queryClient } from './queryClient'
import type { DemoUser, Role, TokenOut, User } from './types'

export const useSession = () => useSyncExternalStore(subscribeSession, getSession)
/** Current user (null when logged out). */
export const useUser = (): User | null => useSession()?.user ?? null
export const getUser = (): User | null => getSession()?.user ?? null

export function logout() {
  setSession(null)
  queryClient.clear()
}
setUnauthorizedHandler(logout)

export const useDemoUsers = (role: Role) =>
  useQuery({ queryKey: ['demo-users', role], queryFn: () => get<DemoUser[]>('/auth/demo-users', { role }), staleTime: 60_000 })

export const requestOtp = (phone: string) => post<{ ok?: boolean; message?: string | null }>('/auth/otp/request', { phone })

export async function verifyOtp(phone: string, otp: string, role: Role): Promise<User> {
  const r = await api<TokenOut>('POST', '/auth/otp/verify', { body: { phone, otp, role }, auth: false })
  queryClient.clear()
  setSession({ token: r.access_token, user: r.user })
  return r.user
}

/** Refresh the cached user profile (called once after app start; 401 here logs out). */
export async function refreshMe() {
  const s = getSession(); if (!s) return
  const user = await get<User>('/auth/me')
  setSession({ token: s.token, user })
}
