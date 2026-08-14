import request from '@/utils/request'
import type { ApiResponse, PageData } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export type AdvertisementPosition = 'home_banner' | 'home_feed'
export type AdvertisementTargetType = 'none' | 'house' | 'house_list' | 'url'
export type AdvertisementStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'DISABLED'

export interface AdvertisementItem {
  id: string
  title: string
  description: string | null
  tag: string | null
  imageUrl: string
  targetType: AdvertisementTargetType
  targetValue: string | null
  position: AdvertisementPosition
  enabled: boolean
  sortOrder: number
  startTime: string | null
  endTime: string | null
  displayStatus: AdvertisementStatus
  createdAt: string
  updatedAt: string
}

export interface AdvertisementPayload {
  title: string
  description?: string | null
  tag?: string | null
  imageUrl: string
  imageFileId?: string | null
  targetType: AdvertisementTargetType
  targetValue?: string | null
  position: AdvertisementPosition
  enabled: boolean
  sortOrder: number
  startTime?: string | null
  endTime?: string | null
}

export interface UploadAdvertisementImageResult {
  url: string
  fileId: string
}

export interface AdvertisementHouseOption {
  id: string
  title: string
  coverImage: string | null
  community: string | null
  location: string | null
  price: number | null
}

export async function getAdvertisements(params: {
  keyword?: string
  position?: AdvertisementPosition
  status?: AdvertisementStatus
  page: number
  pageSize: number
}) {
  const response = await request.get<never, ApiResponse<PageData<AdvertisementItem>>>(
    '/admin/advertisements', { params },
  )
  return unwrapApiResponse(response)
}

export async function createAdvertisement(body: AdvertisementPayload) {
  const response = await request.post<never, ApiResponse<AdvertisementItem>>(
    '/admin/advertisements', body,
  )
  return unwrapApiResponse(response)
}

export async function updateAdvertisement(id: string, body: AdvertisementPayload) {
  const response = await request.put<never, ApiResponse<AdvertisementItem>>(
    `/admin/advertisements/${id}`, body,
  )
  return unwrapApiResponse(response)
}

export async function setAdvertisementEnabled(id: string, enabled: boolean) {
  const response = await request.patch<never, ApiResponse<AdvertisementItem>>(
    `/admin/advertisements/${id}/enabled`, { enabled },
  )
  return unwrapApiResponse(response)
}

export async function deleteAdvertisement(id: string) {
  const response = await request.delete<never, ApiResponse<boolean>>(`/admin/advertisements/${id}`)
  return unwrapApiResponse(response)
}

export async function uploadAdvertisementImage(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await request.post<never, ApiResponse<UploadAdvertisementImageResult>>(
    '/admin/files/advertisement-images/upload', formData, { timeout: 30000 },
  )
  return unwrapApiResponse(response)
}

export async function searchAdvertisementHouseOptions(keyword: string) {
  const response = await request.get<never, ApiResponse<AdvertisementHouseOption[]>>(
    '/admin/advertisements/house-options/search',
    { params: { keyword, limit: 20 } },
  )
  return unwrapApiResponse(response)
}
