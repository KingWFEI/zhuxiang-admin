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
        path: 'houses/:id/edit',
        name: 'HouseEdit',
        component: () => import('@/views/house/HouseEditPage.vue'),
        meta: { title: '编辑房源', source: 'real' },
      },
      {
        path: 'houses/:houseId/inspection-template',
        name: 'HouseInspectionTemplate',
        component: () => import('@/views/house/HouseInspectionTemplatePage.vue'),
        meta: { title: '退租验收标准', source: 'real', permission: 'house:update' },
      },
      {
        path: 'houses/config',
        name: 'FacilityTagConfig',
        component: () => import('@/views/house/FacilityTagConfigPage.vue'),
        meta: { title: '设施与标签配置', source: 'real' },
      },
      {
        path: 'immersive-tour/debug',
        name: 'ImmersiveTourDebug',
        component: () => import('@/views/immersive/ImmersiveTourManagePage.vue'),
        meta: { title: '沉浸式看房管理', source: 'real' },
      },
      {
        path: 'immersive-tour/house/:houseId',
        name: 'ImmersiveTourHouse',
        component: () => import('@/views/immersive/ImmersiveTourManagePage.vue'),
        meta: { title: '沉浸式看房管理', source: 'real' },
      },
      {
        path: 'immersive-tour/preview/:houseId',
        name: 'ImmersiveTourPreview',
        component: () => import('@/views/immersive/ImmersiveTourPreview.vue'),
        meta: { title: '沉浸式看房预览', source: 'real' },
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
        path: 'messages/send',
        name: 'MessageSend',
        component: () => import('@/views/message/SendMessagePage.vue'),
        meta: { title: '发送系统消息', source: 'real' },
      },
      {
        path: 'users',
        name: 'UserList',
        component: () => import('@/views/user/UserListPage.vue'),
        meta: { title: '用户管理', source: 'real', permission: 'user:list' },
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
        meta: { title: '租约管理', source: 'real', permission: 'lease:list' },
      },
      {
        path: 'contracts/:contractId/inspection',
        name: 'ContractInspectionArchive',
        component: () => import('@/views/inspection/ContractInspectionArchivePage.vue'),
        meta: { title: '退租验房归档', source: 'real', permission: 'lease:list' },
      },
      {
        path: 'terminations',
        name: 'TerminationList',
        component: () => import('@/views/termination/TerminationListPage.vue'),
        meta: { title: '退租管理', source: 'real', permission: 'termination:list' },
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
        meta: { title: '报修管理', source: 'real', permission: 'repair:list' },
      },
      {
        path: 'system',
        name: 'SystemSettings',
        component: () => import('@/views/system/SettingsPage.vue'),
        meta: { title: '系统管理', source: 'mock' },
      },
      {
        path: 'customer-service/kb',
        name: 'CustomerServiceKb',
        component: () => import('@/views/customer-service/KbDocumentListPage.vue'),
        meta: { title: '知识库管理', source: 'real' },
      },
      {
        path: 'customer-service/sessions',
        name: 'CustomerServiceSessions',
        component: () => import('@/views/customer-service/SessionListPage.vue'),
        meta: { title: '客服会话记录', source: 'real' },
      },
      {
        path: 'customer-service/sessions/:sessionId',
        name: 'CustomerServiceSessionDetail',
        component: () => import('@/views/customer-service/SessionDetailPage.vue'),
        meta: { title: '会话详情', source: 'real' },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]
