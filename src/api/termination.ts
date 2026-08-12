import request from '@/utils/request'
import type { ApiResponse, PageData } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export type TerminationStatus =
  | 'pending_review'
  | 'pending_photos'
  | 'need_supplement'
  | 'inspection_pending'
  | 'settlement_pending'
  | 'refund_pending'
  | 'refund_failed'
  | 'rescission_pending'
  | 'rescission_signing'
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
  contractId?: string
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
  depositAmount?: number
  unpaidAmount?: number
  refundAmount?: number
  recommendedRefundAmount?: number
  refundAdjustmentReason?: string
  processLastError?: string
  terminationMode?: 'ESIGN' | 'MANUAL'
  manualTerminationReason?: string
  manualAgreementUrls?: string[]
  manualCompletedBy?: string
  manualCompletedAt?: string
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

export interface CancelTerminationPayload {
  cancelReason: string
}

export interface ConfirmSettlementPayload {
  settlementAmount: number
  refundAmount: number
  adjustmentReason?: string
  remark?: string
  deductions?: Array<{
    deductionType: 'damage' | 'cleaning' | 'rent_arrears' | 'bill_arrears' | 'other'
    amount: number
    description?: string
    evidenceUrls?: string[]
  }>
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

export async function cancelTerminationByAdmin(id: string, data: CancelTerminationPayload) {
  const response = await request.post<never, ApiResponse<TerminationApplication>>(
    `/admin/termination-applications/${id}/cancel`,
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
