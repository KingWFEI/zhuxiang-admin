import type { Component } from 'vue'
import type { AdminRole } from '@/api/types'
import { DataAnalysis, Document, House, Key, Promotion, Service, Setting, User } from '@element-plus/icons-vue'

export interface MenuItem {
  title: string
  path?: string
  icon?: Component
  source?: 'real' | 'mock' | 'mixed'
  allowedRoles?: AdminRole[]
  children?: MenuItem[]
}

export const menuItems: MenuItem[] = [
  {
    title: '数据看板',
    path: '/dashboard',
    icon: DataAnalysis,
    source: 'mixed',
  },
  {
    title: '房源运营',
    icon: House,
    children: [
      { title: '房源列表', path: '/houses', source: 'real' },
      { title: '房源审核', path: '/houses/reviews', source: 'real' },
      { title: '新增房源', path: '/houses/create', source: 'real' },
      { title: '设施与标签配置', path: '/houses/config', source: 'real' },
      {
        title: '户型配置',
        path: '/houses/room-types',
        source: 'real',
        allowedRoles: ['ADMIN', 'HOUSEKEEPER'],
      },
      { title: '小区管理', path: '/communities', source: 'real' },
      { title: '行政区域配置', path: '/regions', source: 'real', allowedRoles: ['ADMIN', 'HOUSEKEEPER'] },
      { title: '沉浸式看房管理', path: '/immersive-tour/debug', source: 'real' },
    ],
  },
  {
    title: '智能门锁',
    path: '/locks',
    icon: Key,
    source: 'real',
  },
  {
    title: '业务管理',
    icon: Document,
    children: [
      { title: '订单管理', path: '/orders', source: 'real' },
      {
        title: '看房预约',
        path: '/appointments',
        source: 'real',
        allowedRoles: ['ADMIN', 'HOUSEKEEPER'],
      },
      { title: '租约管理', path: '/leases', source: 'real' },
      { title: '合同管理', path: '/contracts', source: 'real' },
      { title: '合同模板管理', path: '/contracts/templates', source: 'real' },
      { title: '退租管理', path: '/terminations', source: 'real' },
      { title: '账单管理', path: '/bills', source: 'mock' },
      { title: '报修管理', path: '/repairs', source: 'real' },
    ],
  },
  {
    title: '客户与协同',
    icon: User,
    children: [
      { title: '用户管理', path: '/users', source: 'real' },
      { title: '房东认证审核', path: '/users/landlord-auth', source: 'real', allowedRoles: ['ADMIN', 'HOUSEKEEPER'] },
      { title: '消息中心', path: '/messages', source: 'real' },
      { title: '发送系统消息', path: '/messages/send', source: 'real' },
    ],
  },
  {
    title: '智能客服',
    icon: Service,
    children: [
      { title: '知识库管理', path: '/customer-service/kb', source: 'real' },
      { title: '客服会话记录', path: '/customer-service/sessions', source: 'real' },
    ],
  },
  {
    title: '运营管理',
    icon: Promotion,
    allowedRoles: ['ADMIN', 'HOUSEKEEPER'],
    children: [
      { title: '广告管理', path: '/advertisements', source: 'real', allowedRoles: ['ADMIN', 'HOUSEKEEPER'] },
    ],
  },
  {
    title: '系统管理',
    path: '/system',
    icon: Setting,
    source: 'mock',
  },
]
