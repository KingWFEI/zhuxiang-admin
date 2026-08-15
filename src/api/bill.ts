import request from '@/utils/request'
import type { ApiResponse, PageData } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export interface BillItem {
  billId: string
  leaseId: string
  periodNo: number
  amountDue: number
  amountPaid: number
  overdueAmount: number
  outstandingAmount: number
  dueDate: string
  paidAt: string | null
  status: string
  tenantId: string | null
  tenantName: string | null
  tenantPhone: string | null
  houseId: string | null
  houseName: string | null
  houseAddress: string | null
  leaseStatus: string | null
  paymentNo: string | null
  paymentChannel: string | null
  paymentStatus: string | null
  channelTradeNo: string | null
  createdAt: string
  updatedAt: string
}

export interface BillSummary {
  totalBillCount: number
  scheduledCount: number
  pendingCount: number
  paidCount: number
  overdueCount: number
  cancelledCount: number
  receivableAmount: number
  receivedAmount: number
  outstandingAmount: number
  overdueOutstandingAmount: number
}

export interface BillListParams {
  status?: string
  keyword?: string
  dueDateStart?: string
  dueDateEnd?: string
  page?: number
  pageSize?: number
}

export async function getBillList(params?: BillListParams) {
  const response = await request.get<never, ApiResponse<PageData<BillItem>>>('/admin/bills', {
    params,
  })
  return unwrapApiResponse(response)
}

export async function getBillSummary() {
  const response = await request.get<never, ApiResponse<BillSummary>>('/admin/bills/summary')
  return unwrapApiResponse(response)
}

export async function getBillDetail(billId: string) {
  const response = await request.get<never, ApiResponse<BillItem>>(`/admin/bills/${billId}`)
  return unwrapApiResponse(response)
}
