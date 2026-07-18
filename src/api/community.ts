import request from '@/utils/request'
import type { ApiResponse } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export interface CommunityItem {
  id: string
  name: string
  address: string
  regionId: string
  regionName: string
  latitude: number | null
  longitude: number | null
  createdAt: string
}

export interface CreateCommunityRequest {
  name: string
  address?: string
  regionId?: string
  latitude?: number
  longitude?: number
}

export interface UpdateCommunityRequest {
  name?: string
  address?: string
  regionId?: string
  latitude?: number
  longitude?: number
}

export interface RegionItem {
  id: string
  name: string
  code: string
  level: string
  parentId: string
}

export async function searchCommunities(keyword?: string) {
  const response = await request.get<never, ApiResponse<CommunityItem[]>>(
    '/admin/communities',
    { params: { keyword: keyword || '' } }
  )
  return unwrapApiResponse(response)
}

export async function getCommunityDetail(id: string) {
  const response = await request.get<never, ApiResponse<CommunityItem>>(
    `/admin/communities/${id}`
  )
  return unwrapApiResponse(response)
}

export async function createCommunity(body: CreateCommunityRequest) {
  const response = await request.post<never, ApiResponse<CommunityItem>>(
    '/admin/communities',
    body
  )
  return unwrapApiResponse(response)
}

export async function updateCommunity(id: string, body: UpdateCommunityRequest) {
  const response = await request.put<never, ApiResponse<CommunityItem>>(
    `/admin/communities/${id}`,
    body
  )
  return unwrapApiResponse(response)
}

export async function deleteCommunity(id: string) {
  const response = await request.delete<never, ApiResponse<null>>(
    `/admin/communities/${id}`
  )
  return unwrapApiResponse(response)
}

export async function getRegionList() {
  const response = await request.get<never, ApiResponse<RegionItem[]>>(
    '/admin/regions'
  )
  return unwrapApiResponse(response)
}
