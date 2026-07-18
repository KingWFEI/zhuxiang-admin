import request from '@/utils/request'
import type { ApiResponse, PageData } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export interface ContractSummary {
  id: string
  contractNo: string | null
  contractNum: string | null
  orderId: string
  houseId: string
  houseName: string | null
  houseAddress: string | null
  tenantName: string | null
  tenantPhone: string | null
  landlordName: string | null
  landlordPhone: string | null
  status: string
  lessorSigned: boolean
  tenantSigned: boolean
  startDate: string
  endDate: string
  leaseMonths: number
  monthlyRent: number
  deposit: number
  templateVersion: number | null
  hasContractFile: boolean
  signedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ContractDetail extends ContractSummary {
  userId: string
  roomName: string | null
  serviceFee: number
  paymentMonths: number
  firstPaymentAmount: number
  docTemplateId: string | null
  templateConfigId: string | null
  contractFileId: string | null
  signFlowId: string | null
  failureCode: string | null
  failureMessage: string | null
}

export interface ContractDownloadUrl {
  fileName: string
  url: string
  expiresAt: string
}

export async function getContractList(params: {
  status?: string
  keyword?: string
  page?: number
  pageSize?: number
}) {
  const response = await request.get<never, ApiResponse<PageData<ContractSummary>>>('/admin/contracts', { params })
  return unwrapApiResponse(response)
}

export async function getContractDetail(contractId: string) {
  const response = await request.get<never, ApiResponse<ContractDetail>>(`/admin/contracts/${contractId}`)
  return unwrapApiResponse(response)
}

export async function getContractDownloadUrl(contractId: string) {
  const response = await request.get<never, ApiResponse<ContractDownloadUrl>>(`/admin/contracts/${contractId}/download-url`)
  return unwrapApiResponse(response)
}
