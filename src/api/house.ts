import request from '@/utils/request'
import type { ApiResponse } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export interface FacilityItem {
  id: string
  name: string
  iconKey: string | null
  sortOrder: number | null
  enabled: boolean
}

export interface HouseTagItem {
  id: string
  name: string
  tagType: string | null
  sortOrder: number | null
  enabled: boolean
}

export interface HouseAttributes {
  houseId: string
  facilities: FacilityItem[]
  tags: HouseTagItem[]
}

export interface FacilityPayload {
  name: string
  iconKey?: string | null
  sortOrder?: number
  enabled?: boolean
}

export interface UpdateFacilityPayload {
  name: string
  iconKey?: string | null
  sortOrder: number
  enabled: boolean
}

export interface HouseTagPayload {
  name: string
  tagType: string
  sortOrder?: number
  enabled?: boolean
}

export interface UpdateHouseTagPayload {
  name: string
  tagType: string
  sortOrder: number
  enabled: boolean
}

export interface LockDeviceView {
  lockId: string
  lockName: string
  lockBrand: string
  lockSn: string
  lockStatus: string
  batteryLevel: number | null
}

export interface HouseItem {
  id: string
  title: string
  coverImage: string | null
  location: string | null
  communityId: string | null
  address: string | null
  building: string | null
  unit: string | null
  room: string | null
  price: number
  deposit: number
  paymentMethod: string | null
  roomType: string | null
  area: number | null
  floor: string | null
  orientation: string | null
  decoration: string | null
  availableDate: string | null
  metro: string | null
  description: string | null
  rentType: string
  status: string
  landlordId: string | null
  isSmartLockSupported: boolean
  isSelfViewingSupported: boolean
  smartLockBound: boolean
  lockDevice: LockDeviceView | null
  viewCount: number
  favoriteCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateHouseRequest {
  title: string
  coverImage: string
  location: string
  communityId: string
  landlordId: string
  price: number
  rentType: string
  address?: string
  building?: string
  unit?: string
  room?: string
  deposit?: number
  paymentMethod?: string
  roomType?: string
  area?: number
  floor?: string
  orientation?: string
  decoration?: string
  availableDate?: string
  metro?: string
  description?: string
  isSmartLockSupported?: boolean
  isSelfViewingSupported?: boolean
}

export async function getHouseList() {
  const response = await request.get<never, ApiResponse<HouseItem[]>>('/admin/houses')
  return unwrapApiResponse(response)
}

export async function createHouse(data: CreateHouseRequest) {
  const response = await request.post<never, ApiResponse<HouseItem>>('/admin/houses', data)
  return unwrapApiResponse(response)
}

// 设施字典
export async function getFacilityDictionary() {
  const response = await request.get<never, ApiResponse<FacilityItem[]>>('/admin/house-facilities')
  return unwrapApiResponse(response)
}

export async function createFacility(data: FacilityPayload) {
  const response = await request.post<never, ApiResponse<FacilityItem>>('/admin/house-facilities', data)
  return unwrapApiResponse(response)
}

export async function updateFacility(id: string, data: UpdateFacilityPayload) {
  const response = await request.put<never, ApiResponse<FacilityItem>>(`/admin/house-facilities/${id}`, data)
  return unwrapApiResponse(response)
}

export async function deleteFacility(id: string) {
  const response = await request.delete<never, ApiResponse<boolean>>(`/admin/house-facilities/${id}`)
  return unwrapApiResponse(response)
}

// 标签字典
export async function getHouseTagDictionary() {
  const response = await request.get<never, ApiResponse<HouseTagItem[]>>('/admin/house-tags')
  return unwrapApiResponse(response)
}

export async function createHouseTag(data: HouseTagPayload) {
  const response = await request.post<never, ApiResponse<HouseTagItem>>('/admin/house-tags', data)
  return unwrapApiResponse(response)
}

export async function updateHouseTag(id: string, data: UpdateHouseTagPayload) {
  const response = await request.put<never, ApiResponse<HouseTagItem>>(`/admin/house-tags/${id}`, data)
  return unwrapApiResponse(response)
}

export async function deleteHouseTag(id: string) {
  const response = await request.delete<never, ApiResponse<boolean>>(`/admin/house-tags/${id}`)
  return unwrapApiResponse(response)
}

// 房源属性
export async function getHouseAttributes(houseId: string) {
  const response = await request.get<never, ApiResponse<HouseAttributes>>(`/admin/houses/${houseId}/attributes`)
  return unwrapApiResponse(response)
}

export async function replaceHouseFacilities(houseId: string, facilityIds: string[]) {
  const response = await request.put<never, ApiResponse<HouseAttributes>>(`/admin/houses/${houseId}/facilities`, {
    facilityIds,
  })
  return unwrapApiResponse(response)
}

export async function replaceHouseTags(houseId: string, tagIds: string[]) {
  const response = await request.put<never, ApiResponse<HouseAttributes>>(`/admin/houses/${houseId}/tags`, {
    tagIds,
  })
  return unwrapApiResponse(response)
}
