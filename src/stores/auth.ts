import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AdminUser, AuthResult } from '@/api/types'
import {
  clearAuthSession,
  getAuthSession,
  saveAuthResult,
  type AuthSession,
} from '@/utils/storage'

export const useAuthStore = defineStore('auth', () => {
  const initialSession = getAuthSession()
  const accessToken = ref(initialSession.accessToken)
  const refreshToken = ref(initialSession.refreshToken)
  const expiresAt = ref(initialSession.expiresAt)
  const user = ref<AdminUser | null>(initialSession.user)

  const isAuthenticated = computed(() => Boolean(accessToken.value && user.value))

  function applySession(session: AuthSession) {
    accessToken.value = session.accessToken
    refreshToken.value = session.refreshToken
    expiresAt.value = session.expiresAt
    user.value = session.user
  }

  function setAuth(result: AuthResult) {
    applySession(saveAuthResult(result))
  }

  function clear() {
    accessToken.value = ''
    refreshToken.value = ''
    expiresAt.value = 0
    user.value = null
    clearAuthSession()
  }

  function handleRefresh(event: Event) {
    applySession((event as CustomEvent<AuthSession>).detail)
  }

  function handleClear() {
    accessToken.value = ''
    refreshToken.value = ''
    expiresAt.value = 0
    user.value = null
  }

  window.addEventListener('auth-session-refreshed', handleRefresh)
  window.addEventListener('auth-session-cleared', handleClear)

  return { accessToken, refreshToken, expiresAt, user, isAuthenticated, setAuth, clear }
})
