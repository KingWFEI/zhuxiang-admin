import request from '@/utils/request'
import type { ApiResponse } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export interface DashboardOverview {
  generatedAt: string
  house: {
    totalCount: number
    smartLockBoundCount: number
    totalViewCount: number
    averageRent: number
  }
  workflow: {
    pendingLeaseCount: number
    currentMonthOutstandingBillCount: number
    currentMonthOutstandingAmount: number
    currentMonthBillCount: number
    currentMonthPaidBillCount: number
    currentMonthReceivedAmount: number
    pendingRepairCount: number
    todayAppointmentCount: number
    todayCompletedAppointmentCount: number
  }
  rentalTrend: Array<{ weekStart: string; rentedCount: number }>
  health: {
    houseDataCompletenessRate: number | null
    leaseRenewalTimelinessRate: number | null
    repairOnTimeCompletionRate: number | null
  }
  recentHouses: Array<{
    id: string
    title: string
    location: string | null
    roomType: string | null
    price: number
    smartLockBound: boolean
    createdAt: string
  }>
}

export async function getDashboardOverview() {
  const response = await request.get<never, ApiResponse<DashboardOverview>>(
    '/admin/dashboard/overview',
  )
  return unwrapApiResponse(response)
}
