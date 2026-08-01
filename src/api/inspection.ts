import request from '@/utils/request'
import type { ApiResponse } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export interface InspectionTemplateItem {
  itemCode: string
  itemName: string
  enabled: boolean
  required: boolean
  minPhotoCount: number
  instruction: string
}

export interface InspectionTemplateRoom {
  roomCode: string
  roomName: string
  items: InspectionTemplateItem[]
}

export interface InspectionTemplate {
  rooms: InspectionTemplateRoom[]
}

export type InspectionStatus = 'DRAFT' | 'SUBMITTED' | 'LOCKED'

export interface InspectionPhotoDetail {
  id?: string
  url?: string
  imageUrl?: string
  photoUrl?: string
  fileUrl?: string
  uploadedAt?: string | null
  uploadedBy?: string | null
  remark?: string | null
}

export type InspectionPhoto = string | InspectionPhotoDetail

export interface InspectionComparisonItem {
  itemCode: string
  itemName: string
  enabled?: boolean
  required?: boolean
  minPhotoCount?: number
  instruction?: string | null
  moveInPhotos?: InspectionPhoto[]
  moveOutPhotos?: InspectionPhoto[]
  checkInPhotos?: InspectionPhoto[]
  checkoutPhotos?: InspectionPhoto[]
  tenantUploadedAt?: string | null
  siteRemark?: string | null
}

export interface InspectionComparisonRoom {
  roomCode: string
  roomName: string
  items: InspectionComparisonItem[]
}

export interface InspectionArchiveInfo {
  lockedBy?: string | null
  lockedByName?: string | null
  lockedAt?: string | null
  comment?: string | null
}

export interface InspectionComparison {
  contractId: string
  contractNo?: string | null
  houseId?: string | null
  houseName?: string | null
  houseAddress?: string | null
  tenantId?: string | null
  tenantName?: string | null
  tenantPhone?: string | null
  status: InspectionStatus
  rooms: InspectionComparisonRoom[]
  archive?: InspectionArchiveInfo | null
  lockedBy?: string | null
  lockedByName?: string | null
  lockedAt?: string | null
  lockComment?: string | null
}

export interface LockInspectionPayload {
  comment: string
}

export async function getHouseInspectionTemplate(houseId: string) {
  const response = await request.get<never, ApiResponse<InspectionTemplate | null>>(
    `/admin/houses/${houseId}/inspection-template`,
  )
  return unwrapApiResponse(response)
}

export async function updateHouseInspectionTemplate(houseId: string, data: InspectionTemplate) {
  const response = await request.put<never, ApiResponse<InspectionTemplate>>(
    `/admin/houses/${houseId}/inspection-template`,
    data,
  )
  return unwrapApiResponse(response)
}

export async function getContractInspectionComparison(contractId: string) {
  const response = await request.get<never, ApiResponse<InspectionComparison>>(
    `/admin/contracts/${contractId}/inspection-comparison`,
  )
  return unwrapApiResponse(response)
}

export async function lockContractInspection(contractId: string, data: LockInspectionPayload) {
  const response = await request.post<never, ApiResponse<InspectionComparison>>(
    `/admin/contracts/${contractId}/inspection/lock`,
    data,
  )
  return unwrapApiResponse(response)
}
