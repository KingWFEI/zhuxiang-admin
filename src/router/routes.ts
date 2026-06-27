import type { RouteRecordRaw } from 'vue-router'
import BasicLayout from '@/layouts/BasicLayout.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginPage.vue'),
    meta: { title: '登录', requiresAuth: false },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/RegisterPage.vue'),
    meta: { title: '注册', requiresAuth: false },
  },
  {
    path: '/',
    component: BasicLayout,
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/DashboardPage.vue'),
        meta: { title: '数据看板', source: 'mixed' },
      },
      {
        path: 'houses',
        name: 'HouseList',
        component: () => import('@/views/house/HouseListPage.vue'),
        meta: { title: '房源列表', source: 'real', permission: 'house:list' },
      },
      {
        path: 'houses/create',
        name: 'HouseForm',
        component: () => import('@/views/house/HouseFormPage.vue'),
        meta: { title: '新增房源', source: 'real', permission: 'house:create' },
      },
      {
        path: 'locks',
        name: 'LockList',
        component: () => import('@/views/lock/LockListPage.vue'),
        meta: { title: '智能门锁', source: 'real', permission: 'lock:list' },
      },
      {
        path: 'messages',
        name: 'MessageList',
        component: () => import('@/views/message/MessageListPage.vue'),
        meta: { title: '消息中心', source: 'real' },
      },
      {
        path: 'users',
        name: 'UserList',
        component: () => import('@/views/user/UserListPage.vue'),
        meta: { title: '用户管理', source: 'mock', permission: 'user:list' },
      },
      {
        path: 'orders',
        name: 'OrderList',
        component: () => import('@/views/order/OrderListPage.vue'),
        meta: { title: '订单管理', source: 'mock' },
      },
      {
        path: 'leases',
        name: 'LeaseList',
        component: () => import('@/views/lease/LeaseListPage.vue'),
        meta: { title: '租约管理', source: 'mock', permission: 'lease:list' },
      },
      {
        path: 'bills',
        name: 'BillList',
        component: () => import('@/views/bill/BillListPage.vue'),
        meta: { title: '账单管理', source: 'mock', permission: 'bill:list' },
      },
      {
        path: 'repairs',
        name: 'RepairList',
        component: () => import('@/views/repair/RepairListPage.vue'),
        meta: { title: '报修管理', source: 'mock', permission: 'repair:list' },
      },
      {
        path: 'system',
        name: 'SystemSettings',
        component: () => import('@/views/system/SettingsPage.vue'),
        meta: { title: '系统管理', source: 'mock' },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]
