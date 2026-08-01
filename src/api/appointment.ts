import request from '@/utils/request'
import type { ApiResponse, PageData } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export interface AppointmentSummary {
  id: string
  houseId: string
  houseTitle: string
  coverImage: string | null
  sourceType: 'PLATFORM' | 'LANDLORD'
  sourceLabel: string
  viewingMode: 'SELF_SERVICE_LOCK' | 'LANDLORD_HOSTED' | 'PLATFORM_HOSTED'
  viewingModeLabel: string
  status: string
  appointmentStartAt: string | null
  appointmentEndAt: string | null
  contactName: string
  contactPhone: string
  landlordId: string | null
  landlordName: string | null
  accessStatus: string
  availableActions: string[]
}

export interface AppointmentStatusLog {
  fromStatus: string | null
  toStatus: string
  operatorRole: string
  reason: string | null
  createdAt: string
}

export interface AppointmentDetail {
  id: string
  userId: string
  status: string
  sourceType: 'PLATFORM' | 'LANDLORD'
  sourceLabel: string
  viewingMode: 'SELF_SERVICE_LOCK' | 'LANDLORD_HOSTED' | 'PLATFORM_HOSTED'
  viewingModeLabel: string
  appointmentStartAt: string | null
  appointmentEndAt: string | null
  confirmDeadlineAt: string | null
  proposedStartAt: string | null
  proposedEndAt: string | null
  rescheduleReason: string | null
  house: {
    id: string
    title: string
    coverImage: string | null
    address: string | null
  }
  host: {
    userId: string
    name: string
    phoneMasked: string
    canContact: boolean
  } | null
  contactName: string
  contactPhone: string
  remark: string | null
  meetingPoint: string | null
  viewingInstruction: string | null
  rejectReason: string | null
  cancelReason: string | null
  accessStatus: string
  accessValidFrom: string | null
  accessValidTo: string | null
  availableActions: string[]
  statusLogs: AppointmentStatusLog[]
}

export interface AppointmentListParams {
  appointmentId?: string
  houseId?: string
  tenantKeyword?: string
  landlordId?: string
  status?: string
  sourceType?: string
  viewingMode?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export interface ConfirmAppointmentPayload {
  meetingPoint?: string
  viewingInstruction?: string
  hostUserId?: string
}

export async function getAppointmentList(params?: AppointmentListParams) {
  const response = await request.get<never, ApiResponse<PageData<AppointmentSummary>>>(
    '/admin/appointments',
    { params },
  )
  return unwrapApiResponse(response)
}

export async function getAppointmentDetail(appointmentId: string) {
  const response = await request.get<never, ApiResponse<AppointmentDetail>>(
    `/admin/appointments/${appointmentId}`,
  )
  return unwrapApiResponse(response)
}

export async function confirmAppointment(
  appointmentId: string,
  payload: ConfirmAppointmentPayload,
) {
  const response = await request.post<never, ApiResponse<AppointmentDetail>>(
    `/admin/appointments/${appointmentId}/confirm`,
    payload,
  )
  return unwrapApiResponse(response)
}

export async function rejectAppointment(appointmentId: string, reason: string) {
  const response = await request.post<never, ApiResponse<AppointmentDetail>>(
    `/admin/appointments/${appointmentId}/reject`,
    { reason },
  )
  return unwrapApiResponse(response)
}

export async function rescheduleAppointment(
  appointmentId: string,
  proposedStartAt: string,
  reason: string,
) {
  const response = await request.post<never, ApiResponse<AppointmentDetail>>(
    `/admin/appointments/${appointmentId}/reschedule`,
    { proposedStartAt, reason },
  )
  return unwrapApiResponse(response)
}

export async function completeAppointment(appointmentId: string) {
  const response = await request.post<never, ApiResponse<AppointmentDetail>>(
    `/admin/appointments/${appointmentId}/complete`,
  )
  return unwrapApiResponse(response)
}

export async function markAppointmentNoShow(appointmentId: string) {
  const response = await request.post<never, ApiResponse<AppointmentDetail>>(
    `/admin/appointments/${appointmentId}/no-show`,
  )
  return unwrapApiResponse(response)
}

export async function retryAppointmentAccess(appointmentId: string) {
  const response = await request.post<never, ApiResponse<string>>(
    `/admin/appointments/${appointmentId}/access/retry`,
  )
  return unwrapApiResponse(response)
}

export async function revokeAppointmentAccess(appointmentId: string) {
  const response = await request.post<never, ApiResponse<null>>(
    `/admin/appointments/${appointmentId}/access/revoke`,
  )
  return unwrapApiResponse(response)
}
