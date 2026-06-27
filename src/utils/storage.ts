import type { AdminUser, AuthResult, TokenResult } from '@/api/types'

export interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: AdminUser | null
}

const SESSION_KEY = 'zhuxiang_admin_session'

const emptySession: AuthSession = {
  accessToken: '',
  refreshToken: '',
  expiresAt: 0,
  user: null,
}

export function getAuthSession(): AuthSession {
  try {
    const rawValue = localStorage.getItem(SESSION_KEY)
    if (!rawValue) return { ...emptySession }
    const parsed = JSON.parse(rawValue) as Partial<AuthSession>
    return {
      accessToken: parsed.accessToken || '',
      refreshToken: parsed.refreshToken || '',
      expiresAt: parsed.expiresAt || 0,
      user: parsed.user || null,
    }
  } catch {
    return { ...emptySession }
  }
}

export function saveAuthResult(result: AuthResult): AuthSession {
  const session: AuthSession = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: Date.now() + result.expiresIn * 1000,
    user: result.user,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function saveTokenResult(result: TokenResult): AuthSession {
  const currentSession = getAuthSession()
  const session: AuthSession = {
    ...currentSession,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: Date.now() + result.expiresIn * 1000,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  window.dispatchEvent(new CustomEvent('auth-session-refreshed', { detail: session }))
  return session
}

export function clearAuthSession() {
  localStorage.removeItem(SESSION_KEY)
  window.dispatchEvent(new Event('auth-session-cleared'))
}
