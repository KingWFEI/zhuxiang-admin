import request from '@/utils/request'
import type { ApiResponse } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export type RegionLevel = 'city' | 'district' | 'business_area'

export interface RegionItem {
  id: string
  name: string
  code: string
  level: RegionLevel
  parentId: string
  sortOrder: number
  enabled: boolean
}

export interface RegionPayload {
  name: string
  code?: string
  level: RegionLevel
  parentId?: string | null
  sortOrder?: number
  enabled?: boolean
}

export async function listAdminRegions() {
  const response = await request.get<never, ApiResponse<RegionItem[]>>('/admin/regions')
  return unwrapApiResponse(response)
}

export async function createAdminRegion(body: RegionPayload) {
  const response = await request.post<never, ApiResponse<RegionItem>>('/admin/regions', body)
  return unwrapApiResponse(response)
}

export async function updateAdminRegion(id: string, body: RegionPayload) {
  const response = await request.put<never, ApiResponse<RegionItem>>(`/admin/regions/${id}`, body)
  return unwrapApiResponse(response)
}

export async function deleteAdminRegion(id: string) {
  const response = await request.delete<never, ApiResponse<boolean>>(`/admin/regions/${id}`)
  return unwrapApiResponse(response)
}

export async function importAdminRegions(body: RegionPayload[]) {
  const response = await request.post<never, ApiResponse<{ created: number; updated: number; total: number }>>('/admin/regions/import', body)
  return unwrapApiResponse(response)
}
