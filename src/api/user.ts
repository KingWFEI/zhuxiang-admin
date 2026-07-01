import request from '@/utils/request'
import type { ApiResponse, PageData } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export type UserRole = 'TENANT' | 'HOUSEKEEPER' | 'LANDLORD' | 'ADMIN'
export type UserStatus = 'active' | 'disabled' | 'cancelled'

export interface UserItem {
  id: string
  phone: string
  nickname: string
  avatarUrl: string
  role: UserRole
  verified: boolean
  status: UserStatus
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface UserQuery {
  role?: UserRole
  status?: UserStatus
  keyword?: string
  page: number
  pageSize: number
}

async function unwrap<T>(promise: Promise<ApiResponse<T>>) {
  return unwrapApiResponse(await promise)
}

export function getUserList(params: UserQuery) {
  return unwrap(
    request.get<never, ApiResponse<PageData<UserItem>>>('/admin/users', { params }),
  )
}

export function getUserDetail(id: string) {
  return unwrap(request.get<never, ApiResponse<UserItem>>(`/admin/users/${id}`))
}

export function updateUserStatus(id: string, status: UserStatus) {
  return unwrap(
    request.put<never, ApiResponse<UserItem>>(`/admin/users/${id}/status`, { status }),
  )
}
