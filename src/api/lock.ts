import request from '@/utils/request'
import type { ApiResponse } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export interface LockSummary {
  smartLockId: string
  lockMac: string
  lockName: string
  houseId: string
  houseName: string
  roomId: string
  roomName: string
  status: string
}

export interface LockDetail extends LockSummary {
  lockId: number | null
  keyId: number | null
  battery: number | null
  batterySource: string
  rssi: number | null
  lastBleSyncTime: string
  lastPlatformSyncTime: string
  platformErrorMessage: string
}

export interface LockOperationResult {
  id: string
  lockId: number | null
  keyId: number | null
  lockMac: string
  lockName: string
  houseId: string
  roomId: string
  status: string
  platformErrorCode: string
  platformErrorMessage: string
}

export interface LocalInitializedLockRequest {
  lockMac: string
  lockData: string
  lockName?: string
  battery?: number
  rssi?: number
}

export interface LocalInitializedLockResult {
  smartLockId: string
  lockMac: string
  lockName: string
  status: string
}

export interface UnlockData {
  smartLockId: string
  lockMac: string
  lockName: string
  roomName: string
  lockData: string
  status: string
}

async function unwrap<T>(promise: Promise<ApiResponse<T>>) {
  return unwrapApiResponse(await promise)
}

export function getLockByMac(lockMac: string) {
  return unwrap(
    request.get<never, ApiResponse<LockSummary>>('/admin/locks/by-mac', {
      params: { lockMac },
    }),
  )
}

export function saveLocalInitializedLock(data: LocalInitializedLockRequest) {
  return unwrap(
    request.post<never, ApiResponse<LocalInitializedLockResult>>(
      '/admin/locks/local-initialized',
      data,
    ),
  )
}

export function bindLockRoom(smartLockId: string, data: { houseId: string; roomId?: string }) {
  return unwrap(
    request.post<never, ApiResponse<LockOperationResult>>(
      `/admin/locks/${smartLockId}/bind-room`,
      data,
    ),
  )
}

export function unbindLockRoom(smartLockId: string) {
  return unwrap(
    request.delete<never, ApiResponse<LockOperationResult>>(
      `/admin/locks/${smartLockId}/bind-room`,
    ),
  )
}

export function updateLockBleStatus(
  smartLockId: string,
  data: { battery: number; rssi: number },
) {
  return unwrap(
    request.post<never, ApiResponse<LockDetail>>(
      `/admin/locks/${smartLockId}/ble-status`,
      data,
    ),
  )
}

export function getLockDetail(smartLockId: string) {
  return unwrap(
    request.get<never, ApiResponse<LockDetail>>(`/admin/locks/${smartLockId}/detail`),
  )
}

export function syncLockPlatform(smartLockId: string) {
  return unwrap(
    request.post<never, ApiResponse<LockOperationResult>>(
      `/admin/locks/${smartLockId}/sync-platform`,
    ),
  )
}

export function getLockUnlockData(smartLockId: string) {
  return unwrap(
    request.get<never, ApiResponse<UnlockData>>(`/admin/locks/${smartLockId}/unlock-data`),
  )
}
