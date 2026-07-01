import request from '@/utils/request'
import type { ApiResponse, PageData } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export interface RepairItem {
  id: string
  repairNo?: string
  orderNo?: string
  houseId?: string
  houseName?: string
  houseAddress?: string
  roomName?: string
  tenantId?: string
  tenantName?: string
  tenantPhone?: string
  contactName?: string
  contactPhone?: string
  repairType?: string
  category?: string
  priority?: string
  description?: string
  imageUrls?: string[]
  status: string
  assignee?: string
  housekeeperName?: string
  repairmanName?: string
  expectedVisitTime?: string
  completedAt?: string
  rating?: number
  reviewContent?: string
  createdAt?: string
  updatedAt?: string
}

export interface RepairListParams {
  keyword?: string
  status?: string
  page?: number
  pageSize?: number
}

export type RepairListResult = PageData<RepairItem> | RepairItem[]

export async function getRepairList(params?: RepairListParams) {
  const response = await request.get<never, ApiResponse<RepairListResult>>('/admin/repairs', { params })
  return unwrapApiResponse(response)
}
