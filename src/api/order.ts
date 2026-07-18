import request from '@/utils/request'
import type { ApiResponse, PageData } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export interface OrderItem {
  id: string
  status: string
  userId: string
  lessorUserId: string | null
  tenantName: string | null
  tenantPhone: string | null
  landlordName: string | null
  landlordPhone: string | null
  houseId: string
  houseName: string | null
  roomName: string | null
  houseAddress: string | null
  houseStatus: string | null
  startDate: string
  endDate: string
  leaseMonths: number
  paymentMethod: string
  paymentMonths: number
  tenantCount: number
  monthlyRent: number
  deposit: number
  serviceFee: number
  firstPaymentAmount: number
  totalAmount: number
  contractId: string | null
  contractNo: string | null
  contractStatus: string | null
  paymentNo: string | null
  paymentStatus: string | null
  paymentChannel: string | null
  realNameAt: string | null
  contractConfirmedAt: string | null
  paidAt: string | null
  signedAt: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
}

export async function getOrderList(params: {
  status?: string
  keyword?: string
  page?: number
  pageSize?: number
}) {
  const response = await request.get<never, ApiResponse<PageData<OrderItem>>>('/admin/orders', { params })
  return unwrapApiResponse(response)
}

export async function getOrderDetail(orderId: string) {
  const response = await request.get<never, ApiResponse<OrderItem>>(`/admin/orders/${orderId}`)
  return unwrapApiResponse(response)
}
