import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResponse, TokenResult } from '@/api/types'
import {
  clearAuthSession,
  getAuthSession,
  saveTokenResult,
  type AuthSession,
} from '@/utils/storage'

declare module 'axios' {
  export interface AxiosRequestConfig {
    silent?: boolean
    skipAuthRefresh?: boolean
  }

  export interface InternalAxiosRequestConfig {
    silent?: boolean
    skipAuthRefresh?: boolean
    _retry?: boolean
  }
}

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

const request = axios.create({ baseURL, timeout: 12000 })
let refreshPromise: Promise<AuthSession> | null = null

request.interceptors.request.use((config) => {
  const { accessToken } = getAuthSession()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

async function refreshAccessToken() {
  const { refreshToken } = getAuthSession()
  if (!refreshToken) throw new Error('登录状态已失效')

  const response = await axios.post<ApiResponse<TokenResult>>(
    `${baseURL}/admin/auth/refresh`,
    { refreshToken },
    { timeout: 12000 },
  )
  if (response.data.code !== 200) throw new Error(response.data.message || '令牌刷新失败')
  return saveTokenResult(response.data.data)
}

function redirectToLogin() {
  if (window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
}

request.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalConfig = error.config as InternalAxiosRequestConfig | undefined
    const canRefresh =
      error.response?.status === 401 &&
      originalConfig &&
      !originalConfig._retry &&
      !originalConfig.skipAuthRefresh

    if (canRefresh) {
      originalConfig._retry = true
      refreshPromise ||= refreshAccessToken().finally(() => {
        refreshPromise = null
      })

      try {
        const session = await refreshPromise
        originalConfig.headers.Authorization = `Bearer ${session.accessToken}`
        return request(originalConfig)
      } catch (refreshError) {
        clearAuthSession()
        redirectToLogin()
        return Promise.reject(refreshError)
      }
    }

    if (!originalConfig?.silent) {
      const message =
        error.response?.data?.message ||
        (error.code === 'ECONNABORTED' ? '请求超时，请稍后重试' : '请求失败，请检查服务状态')
      ElMessage.error(message)
    }
    return Promise.reject(error)
  },
)

export default request
