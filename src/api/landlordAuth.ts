import request from '@/utils/request'
import type { ApiResponse, PageData } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export type LandlordAuthStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED'

export interface LandlordAuthProof {
  id: string
  proofType: string
  fileId: string
  fileUrl: string
}

export interface LandlordAuthListItem {
  id: string
  applicationNo: string
  userId: string
  applicantName: string
  contactPhone: string
  userNickname: string
  userPhone: string
  status: LandlordAuthStatus
  proofCount: number
  createdAt: string
  reviewedAt: string | null
}

export interface LandlordAuthDetail {
  id: string
  applicationNo: string
  userId: string
  status: LandlordAuthStatus
  realName: string
  idCardMasked: string
  idCardFrontUrl: string
  idCardBackUrl: string
  contactPhone: string
  contactWechat: string | null
  contactEmail: string | null
  contactAddress: string | null
  preferredContactTime: string | null
  applicantNote: string | null
  rejectReason: string | null
  reviewerId: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  proofs: LandlordAuthProof[]
}

async function unwrap<T>(promise: Promise<ApiResponse<T>>) {
  return unwrapApiResponse(await promise)
}

export function getLandlordAuthList(params: {
  status?: LandlordAuthStatus
  keyword?: string
  page: number
  pageSize: number
}) {
  return unwrap(request.get<never, ApiResponse<PageData<LandlordAuthListItem>>>(
    '/admin/landlord-auth', { params },
  ))
}

export function getLandlordAuthDetail(id: string) {
  return unwrap(request.get<never, ApiResponse<LandlordAuthDetail>>(`/admin/landlord-auth/${id}`))
}

export function reviewLandlordAuth(id: string, decision: 'APPROVED' | 'REJECTED', reason?: string) {
  return unwrap(request.post<never, ApiResponse<LandlordAuthDetail>>(
    `/admin/landlord-auth/${id}/review`, { decision, reason },
  ))
}
