import request from '@/utils/request'
import type { ApiResponse, PageData } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export type RepairStatus =
  | 'submitted'
  | 'accepted'
  | 'assigned'
  | 'processing'
  | 'pendingReview'
  | 'completed'
  | 'cancelled'

export interface RepairItem {
  id: string
  repairNo: string
  houseId: string
  houseName: string
  houseAddress: string | null
  roomName: string | null
  tenantId: string
  tenantName: string
  tenantPhone: string
  repairType: string
  description: string
  status: RepairStatus
  assignee: string | null
  repairmanName: string | null
  housekeeperName: string | null
  expectedVisitTime: string | null
  completedAt: string | null
  rating: number | null
  reviewContent: string | null
  createdAt: string
  updatedAt: string
}

export interface RepairTimelineItem {
  title: string
  description: string | null
  time: string
  status: RepairStatus
}

export interface RepairDetail extends RepairItem {
  imageUrls: string[]
  contactName: string
  contactPhone: string
  housekeeperPhone: string | null
  cancelReason: string | null
  cancelTime: string | null
  timeline: RepairTimelineItem[]
  availableActions: Array<'accept' | 'assign' | 'start' | 'finish'>
}

export interface RepairListParams {
  keyword?: string
  status?: RepairStatus | ''
  page?: number
  pageSize?: number
}

export async function getRepairList(params?: RepairListParams) {
  const response = await request.get<never, ApiResponse<PageData<RepairItem>>>('/admin/repairs', {
    params,
  })
  return unwrapApiResponse(response)
}

export async function getRepairDetail(repairId: string) {
  const response = await request.get<never, ApiResponse<RepairDetail>>(
    `/admin/repairs/${repairId}`,
  )
  return unwrapApiResponse(response)
}

async function postRepairAction(repairId: string, action: string, data?: object) {
  const response = await request.post<never, ApiResponse<RepairDetail>>(
    `/admin/repairs/${repairId}/${action}`,
    data,
  )
  return unwrapApiResponse(response)
}

export const acceptRepair = (repairId: string) => postRepairAction(repairId, 'accept')
export const startRepair = (repairId: string) => postRepairAction(repairId, 'start')
export const finishRepair = (repairId: string) => postRepairAction(repairId, 'finish')
export const assignRepair = (repairId: string, assignee: string, repairmanName?: string) =>
  postRepairAction(repairId, 'assign', { assignee, repairmanName })
