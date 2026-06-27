export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface PageData<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export type AdminRole = 'ADMIN' | 'HOUSEKEEPER' | 'LANDLORD'

export interface AdminUser {
  id: string
  phone: string
  nickname: string
  avatarUrl: string
  role: AdminRole
  isVerified: boolean
}

export interface AuthResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: AdminUser
}

export interface TokenResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export function unwrapApiResponse<T>(response: ApiResponse<T>): T {
  if (response.code !== 200) {
    throw new Error(response.message || '请求失败')
  }
  return response.data
}
