import request from '@/utils/request'
import type { ApiResponse, PageData } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export type TerminationStatus =
  | 'pending_review'
  | 'need_supplement'
  | 'inspection_pending'
  | 'settlement_pending'
  | 'refund_pending'
  | 'completed'
  | 'rejected'
  | 'cancelled'

export interface TerminationAttachment {
  url: string
  type: string
  name: string
}

export interface TerminationApplication {
  id: string
  applicationNo: string
  status: TerminationStatus
  tenantName: string
  tenantPhone: string
  houseName: string
  houseAddress: string
  contractNo: string
  leaseId: string
  reason: string
  remark: string
  expectedMoveOutDate: string
  hasMovedOut: boolean
  contactName: string
  contactPhone: string
  attachments: TerminationAttachment[]
  rejectReason?: string
  supplementReason?: string
  settlementAmount?: number
  totalDeduction?: number
  refundAmount?: number
  createdAt: string
  updatedAt: string
}

export interface TerminationListParams {
  keyword?: string
  status?: TerminationStatus | ''
  page?: number
  pageSize?: number
}

export interface RejectTerminationPayload {
  rejectReason: string
}

export interface RequestSupplementPayload {
  supplementReason: string
}

export interface ConfirmSettlementPayload {
  settlementAmount: number
  refundAmount: number
  remark?: string
}

export async function getTerminationList(params?: TerminationListParams) {
  const response = await request.get<never, ApiResponse<PageData<TerminationApplication>>>(
    '/admin/termination-applications',
    { params },
  )
  return unwrapApiResponse(response)
}

export async function getTerminationDetail(id: string) {
  const response = await request.get<never, ApiResponse<TerminationApplication>>(
    `/admin/termination-applications/${id}`,
  )
  return unwrapApiResponse(response)
}

export async function approveTermination(id: string) {
  const response = await request.post<never, ApiResponse<TerminationApplication>>(
    `/admin/termination-applications/${id}/approve`,
  )
  return unwrapApiResponse(response)
}

export async function rejectTermination(id: string, data: RejectTerminationPayload) {
  const response = await request.post<never, ApiResponse<TerminationApplication>>(
    `/admin/termination-applications/${id}/reject`,
    data,
  )
  return unwrapApiResponse(response)
}

export async function requestTerminationSupplement(id: string, data: RequestSupplementPayload) {
  const response = await request.post<never, ApiResponse<TerminationApplication>>(
    `/admin/termination-applications/${id}/request-supplement`,
    data,
  )
  return unwrapApiResponse(response)
}

export async function confirmTerminationSettlement(id: string, data: ConfirmSettlementPayload) {
  const response = await request.post<never, ApiResponse<TerminationApplication>>(
    `/admin/termination-applications/${id}/settlement/confirm`,
    data,
  )
  return unwrapApiResponse(response)
}

export async function completeTermination(id: string) {
  const response = await request.post<never, ApiResponse<TerminationApplication>>(
    `/admin/termination-applications/${id}/complete`,
  )
  return unwrapApiResponse(response)
}
