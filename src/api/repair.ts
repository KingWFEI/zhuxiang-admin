import request from '@/utils/request'
import type { ApiResponse, PageData } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export interface RepairItem {
  id: string
  repairNo: string
  status: string
  description: string
  houseId: string
  houseName: string
  houseAddress: string
  roomName: string
  tenantId: string
  tenantName: string
  tenantPhone: string
  repairType: string
  assignee: string
  repairmanName: string
  housekeeperName: string
  expectedVisitTime: string
  createdAt: string
  updatedAt: string
  completedAt: string
  rating: number
  reviewContent: string
}

export interface RepairListParams {
  keyword?: string
  status?: string
  page?: number
  pageSize?: number
}

export async function getRepairList(params?: RepairListParams) {
  const response = await request.get<never, ApiResponse<PageData<RepairItem>>>('/admin/repairs', { params })
  return unwrapApiResponse(response)
}
