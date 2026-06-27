import request from '@/utils/request'
import type { AdminRole, ApiResponse, AuthResult, TokenResult } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export interface LoginRequest {
  phone: string
  password: string
}

export interface RegisterRequest extends LoginRequest {
  nickname: string
  role: AdminRole
}

export async function login(data: LoginRequest) {
  const response = await request.post<never, ApiResponse<AuthResult>>('/admin/auth/login', data, {
    silent: true,
    skipAuthRefresh: true,
  })
  return unwrapApiResponse(response)
}

export async function register(data: RegisterRequest) {
  const response = await request.post<never, ApiResponse<AuthResult>>('/admin/auth/register', data, {
    silent: true,
    skipAuthRefresh: true,
  })
  return unwrapApiResponse(response)
}

export async function refreshToken(refreshTokenValue: string) {
  const response = await request.post<never, ApiResponse<TokenResult>>(
    '/admin/auth/refresh',
    { refreshToken: refreshTokenValue },
    { skipAuthRefresh: true },
  )
  return unwrapApiResponse(response)
}

export async function logout(refreshTokenValue: string) {
  const response = await request.post<never, ApiResponse<boolean>>('/admin/auth/logout', {
    refreshToken: refreshTokenValue,
  })
  return unwrapApiResponse(response)
}
