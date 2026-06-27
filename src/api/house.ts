import request from '@/utils/request'
import type { ApiResponse } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

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
