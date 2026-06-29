import request from '@/utils/request'
import type { ApiResponse, PageData } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export interface LeaseItem {
  contractId: string
  contractNo: string
  contractStatus: string
  createdAt: string
  deposit: number
  endDate: string
  firstPaymentAmount: number
  houseAddress: string
  houseId: string
  houseName: string
  leaseId: string
  leaseMonths: number
  leaseStatus: string
  monthlyRent: number
  paymentMethod: string
  paymentMonths: number
  serviceFee: number
  startDate: string
  tenantId: string
  tenantName: string
  tenantPhone: string
  updatedAt: string
}

export interface LeaseListParams {
  status?: string
  keyword?: string
  page?: number
  pageSize?: number
}

export async function getLeaseList(params?: LeaseListParams) {
  const response = await request.get<never, ApiResponse<PageData<LeaseItem>>>('/admin/leases', { params })
  return unwrapApiResponse(response)
}
