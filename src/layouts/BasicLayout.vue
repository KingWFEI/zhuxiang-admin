<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowDown,
  Bell,
  Expand,
  Fold,
  House,
  Menu as MenuIcon,
  SwitchButton,
  UserFilled,
} from '@element-plus/icons-vue'
import { menuItems, type MenuItem } from '@/constants/menu'
import { useAuthStore } from '@/stores/auth'
import { logout } from '@/api/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isCollapsed = ref(false)
const mobileDrawerVisible = ref(false)
const roleNameMap = {
  ADMIN: '平台管理员',
  HOUSEKEEPER: '管家',
  LANDLORD: '房东',
} as const

const pageTitle = computed(() => String(route.meta.title || '管理平台'))

function menuIndex(item: MenuItem) {
  return item.path || item.title
}

function closeMobileDrawer() {
  mobileDrawerVisible.value = false
}

async function handleLogout() {
  try {
    if (authStore.refreshToken) await logout(authStore.refreshToken)
  } catch {
    // Local session must still be cleared when the server is unavailable.
  } finally {
    authStore.clear()
    await router.replace({ name: 'Login' })
  }
}
</script>

<template>
  <el-container class="app-layout">
    <el-aside :width="isCollapsed ? '72px' : '236px'" class="sidebar desktop-sidebar">
      <div class="brand" :class="{ 'brand--compact': isCollapsed }">
        <span class="brand__mark"><el-icon><House /></el-icon></span>
        <div v-if="!isCollapsed" class="brand__copy">
          <strong>筑享运营台</strong>
          <span>RENTAL OPERATIONS</span>
        </div>
      </div>

      <el-menu
        :default-active="route.path"
        :collapse="isCollapsed"
        router
        class="sidebar-menu"
      >
        <template v-for="item in menuItems" :key="item.title">
          <el-sub-menu v-if="item.children" :index="menuIndex(item)">
            <template #title>
              <el-icon v-if="item.icon"><component :is="item.icon" /></el-icon>
              <span>{{ item.title }}</span>
            </template>
            <el-menu-item v-for="child in item.children" :key="child.path" :index="child.path">
              <span>{{ child.title }}</span>
              <span v-if="child.source === 'mock'" class="menu-source">模拟</span>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="item.path">
            <el-icon v-if="item.icon"><component :is="item.icon" /></el-icon>
            <template #title>
              <span>{{ item.title }}</span>
              <span v-if="item.source === 'mock'" class="menu-source">模拟</span>
            </template>
          </el-menu-item>
        </template>
      </el-menu>

      <button class="sidebar-toggle" type="button" title="收起侧栏" @click="isCollapsed = !isCollapsed">
        <el-icon><Expand v-if="isCollapsed" /><Fold v-else /></el-icon>
        <span v-if="!isCollapsed">收起菜单</span>
      </button>
    </el-aside>

    <el-drawer v-model="mobileDrawerVisible" direction="ltr" size="276px" :with-header="false">
      <div class="mobile-nav">
        <div class="brand">
          <span class="brand__mark"><el-icon><House /></el-icon></span>
          <div class="brand__copy"><strong>筑享运营台</strong><span>RENTAL OPERATIONS</span></div>
        </div>
        <el-menu :default-active="route.path" router @select="closeMobileDrawer">
          <template v-for="item in menuItems" :key="item.title">
            <el-sub-menu v-if="item.children" :index="menuIndex(item)">
              <template #title>
                <el-icon v-if="item.icon"><component :is="item.icon" /></el-icon>
                <span>{{ item.title }}</span>
              </template>
              <el-menu-item v-for="child in item.children" :key="child.path" :index="child.path">
                {{ child.title }}
                <span v-if="child.source === 'mock'" class="menu-source">模拟</span>
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item v-else :index="item.path">
              <el-icon v-if="item.icon"><component :is="item.icon" /></el-icon>
              <span>{{ item.title }}</span>
            </el-menu-item>
          </template>
        </el-menu>
      </div>
    </el-drawer>

    <el-container class="content-shell">
      <el-header class="topbar">
        <div class="topbar__left">
          <el-button class="mobile-menu-button" text :icon="MenuIcon" title="打开菜单" @click="mobileDrawerVisible = true" />
          <div>
            <span class="topbar__eyebrow">筑享租房运营管理</span>
            <strong>{{ pageTitle }}</strong>
          </div>
        </div>
        <div class="topbar__right">
          <el-button text circle :icon="Bell" title="消息中心" @click="router.push('/messages')" />
          <span class="topbar__divider" />
          <el-dropdown trigger="click">
            <button class="user-menu" type="button">
              <el-avatar :size="34" :src="authStore.user?.avatarUrl">
                <el-icon><UserFilled /></el-icon>
              </el-avatar>
              <span class="user-menu__copy">
                <strong>{{ authStore.user?.nickname || '管理用户' }}</strong>
                <small>{{ authStore.user ? roleNameMap[authStore.user.role] : '-' }}</small>
              </span>
              <el-icon><ArrowDown /></el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>{{ authStore.user?.phone || '-' }}</el-dropdown-item>
                <el-dropdown-item divided :icon="SwitchButton" @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped lang="scss">
.app-layout {
  min-height: 100vh;
  background: #f3f5f4;
}

.sidebar {
  position: fixed;
  z-index: 20;
  inset: 0 auto 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #18231f;
  transition: width 0.22s ease;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  height: 72px;
  padding: 0 18px;
  color: white;
  border-bottom: 1px solid rgb(255 255 255 / 9%);
  white-space: nowrap;
}

.brand--compact {
  justify-content: center;
  padding: 0;
}

.brand__mark {
  display: grid;
  flex: none;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 6px;
  background: #2b8b68;
  font-size: 20px;
}

.brand__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.brand__copy strong {
  font-size: 17px;
  letter-spacing: 0;
}

.brand__copy span {
  margin-top: 3px;
  color: #8fa39a;
  font-size: 9px;
  letter-spacing: 0.8px;
}

.sidebar-menu {
  flex: 1;
  padding: 12px 8px;
  overflow-y: auto;
  border-right: 0;
  background: transparent;
  --el-menu-bg-color: transparent;
  --el-menu-text-color: #aebdb7;
  --el-menu-hover-bg-color: #24332d;
  --el-menu-active-color: #ffffff;
}

.sidebar-menu :deep(.el-menu-item),
.sidebar-menu :deep(.el-sub-menu__title) {
  height: 46px;
  margin-bottom: 3px;
  border-radius: 5px;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background: #176b4d;
}

.menu-source {
  margin-left: auto;
  color: #d9ae66;
  font-size: 10px;
}

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  color: #91a49c;
  border: 0;
  border-top: 1px solid rgb(255 255 255 / 8%);
  background: transparent;
  cursor: pointer;
}

.content-shell {
  min-width: 0;
  margin-left: 236px;
  transition: margin-left 0.22s ease;
}

.sidebar[style*='72px'] + .content-shell {
  margin-left: 72px;
}

.topbar {
  position: sticky;
  z-index: 15;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
  padding: 0 24px;
  border-bottom: 1px solid #dfe5e2;
  background: rgb(255 255 255 / 96%);
}

.topbar__left,
.topbar__right,
.user-menu {
  display: flex;
  align-items: center;
}

.topbar__left strong {
  display: block;
  margin-top: 3px;
  font-size: 17px;
}

.topbar__eyebrow {
  color: #84918b;
  font-size: 11px;
}

.topbar__right {
  gap: 8px;
}

.topbar__divider {
  width: 1px;
  height: 26px;
  background: #e3e8e6;
}

.user-menu {
  gap: 9px;
  padding: 4px;
  color: #27342f;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.user-menu__copy {
  display: flex;
  min-width: 88px;
  flex-direction: column;
  align-items: flex-start;
}

.user-menu__copy strong {
  max-width: 120px;
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-menu__copy small {
  margin-top: 2px;
  color: #84918b;
  font-size: 11px;
}

.app-main {
  min-width: 0;
  padding: 22px 24px 32px;
  overflow: visible;
}

.mobile-menu-button {
  display: none;
  margin-right: 8px;
}

.mobile-nav {
  min-height: 100%;
  background: #18231f;
}

.mobile-nav :deep(.el-menu) {
  border: 0;
  background: #18231f;
  --el-menu-bg-color: #18231f;
  --el-menu-text-color: #aebdb7;
  --el-menu-hover-bg-color: #24332d;
  --el-menu-active-color: #ffffff;
}

@media (max-width: 860px) {
  .desktop-sidebar {
    display: none;
  }

  .content-shell {
    margin-left: 0 !important;
  }

  .mobile-menu-button {
    display: inline-flex;
  }

  .topbar,
  .app-main {
    padding-right: 16px;
    padding-left: 16px;
  }
}

@media (max-width: 560px) {
  .user-menu__copy,
  .topbar__eyebrow,
  .topbar__divider {
    display: none;
  }

  .app-main {
    padding-top: 16px;
  }
}
</style>
