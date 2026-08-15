import request from '@/utils/request'
import type { ApiResponse } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export interface SystemRoleItem {
  role: string
  name: string
  description: string
  dataScope: string
  managementLoginAllowed: boolean
  accountCount: number
  activeCount: number
  disabledCount: number
  cancelledCount: number
  recentLoginCount: number
}

export interface SystemOverview {
  roleModel: 'CODE_MANAGED'
  totalAccounts: number
  backendAccounts: number
  activeBackendAccounts: number
  recentBackendLogins: number
  generatedAt: string
  roles: SystemRoleItem[]
}

export async function getSystemOverview() {
  const response = await request.get<never, ApiResponse<SystemOverview>>('/admin/system/overview')
  return unwrapApiResponse(response)
}
