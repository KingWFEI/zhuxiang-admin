export type MockModuleKey = 'users' | 'orders' | 'leases' | 'bills' | 'repairs' | 'system'
export type MockCellValue = string | number
export type MockRecord = Record<string, MockCellValue>

export interface MockColumn {
  key: string
  label: string
  width?: number
  minWidth?: number
  type?: 'status' | 'currency'
}

export interface MockModuleConfig {
  title: string
  description: string
  itemName: string
  statusOptions: string[]
  columns: MockColumn[]
  rows: MockRecord[]
  metrics: Array<{ label: string; value: string; meta: string }>
}

export const mockManagementConfigs: Record<MockModuleKey, MockModuleConfig> = {
  users: {
    title: '用户管理', description: '管理租客、房东和管家账号，查看认证与账号状态。', itemName: '用户',
    statusOptions: ['正常', '待认证', '已停用'],
    columns: [
      { key: 'id', label: '用户编号', width: 120 }, { key: 'name', label: '姓名', minWidth: 130 },
      { key: 'phone', label: '手机号', width: 140 }, { key: 'role', label: '角色', width: 110 },
      { key: 'verified', label: '实名认证', width: 110, type: 'status' }, { key: 'status', label: '账号状态', width: 110, type: 'status' },
      { key: 'createdAt', label: '注册时间', width: 130 },
    ],
    rows: [
      { id: 'U-10081', name: '林诗雨', phone: '138****4206', role: '租客', verified: '已认证', status: '正常', createdAt: '2026-06-24' },
      { id: 'U-10080', name: '周明远', phone: '186****1138', role: '房东', verified: '已认证', status: '正常', createdAt: '2026-06-23' },
      { id: 'U-10079', name: '陈嘉木', phone: '159****8891', role: '管家', verified: '待认证', status: '待认证', createdAt: '2026-06-22' },
      { id: 'U-10078', name: '许安然', phone: '177****6023', role: '租客', verified: '已认证', status: '正常', createdAt: '2026-06-21' },
      { id: 'U-10077', name: '何志诚', phone: '135****7219', role: '房东', verified: '未认证', status: '已停用', createdAt: '2026-06-20' },
    ],
    metrics: [
      { label: '用户总量', value: '10,081', meta: '较上月 +3.8%' }, { label: '已认证用户', value: '8,426', meta: '认证率 83.6%' },
      { label: '本月新增', value: '286', meta: '租客占比 72%' }, { label: '待处理认证', value: '19', meta: '最早等待 6 小时' },
    ],
  },
  orders: {
    title: '订单管理', description: '跟踪租房订单从创建、实名、合同确认到支付签约的完整流程。', itemName: '订单',
    statusOptions: ['待支付', '待签约', '已完成', '已取消'],
    columns: [
      { key: 'id', label: '订单号', width: 150 }, { key: 'house', label: '房源', minWidth: 190 },
      { key: 'tenant', label: '租客', width: 110 }, { key: 'amount', label: '订单金额', width: 130, type: 'currency' },
      { key: 'status', label: '状态', width: 110, type: 'status' }, { key: 'createdAt', label: '创建时间', width: 150 },
    ],
    rows: [
      { id: 'RO-260627-018', house: '云栖名苑 2栋 1803', tenant: '赵思齐', amount: 3680, status: '待支付', createdAt: '2026-06-27 09:32' },
      { id: 'RO-260627-017', house: '中央公园壹号 8栋 1206', tenant: '孙可欣', amount: 5200, status: '待签约', createdAt: '2026-06-27 08:46' },
      { id: 'RO-260626-091', house: '锦悦和鸣 1栋 702', tenant: '吴浩然', amount: 2850, status: '已完成', createdAt: '2026-06-26 21:12' },
      { id: 'RO-260626-087', house: '山水庭院 5栋 1101', tenant: '郑书言', amount: 4100, status: '已取消', createdAt: '2026-06-26 19:38' },
    ],
    metrics: [
      { label: '今日订单', value: '18', meta: '成交 9 单' }, { label: '待支付', value: '7', meta: '金额 ¥23,860' },
      { label: '待签约', value: '5', meta: '平均等待 3.2 小时' }, { label: '本月成交额', value: '¥482,600', meta: '较上月 +8.2%' },
    ],
  },
  leases: {
    title: '租约管理', description: '集中查看租约履约、到期和终止情况，跟进合同关键节点。', itemName: '租约',
    statusOptions: ['待确认', '生效中', '即将到期', '已终止'],
    columns: [
      { key: 'id', label: '租约编号', width: 150 }, { key: 'house', label: '房源', minWidth: 190 },
      { key: 'tenant', label: '租客', width: 110 }, { key: 'period', label: '租期', width: 210 },
      { key: 'rent', label: '月租', width: 120, type: 'currency' }, { key: 'status', label: '状态', width: 110, type: 'status' },
    ],
    rows: [
      { id: 'LS-2026-0621', house: '中央公园壹号 8-1206', tenant: '孙可欣', period: '2026-07-01 至 2027-06-30', rent: 5200, status: '待确认' },
      { id: 'LS-2026-0618', house: '云栖名苑 2-1803', tenant: '赵思齐', period: '2026-06-20 至 2027-06-19', rent: 3680, status: '生效中' },
      { id: 'LS-2025-1042', house: '锦悦和鸣 1-702', tenant: '吴浩然', period: '2025-07-15 至 2026-07-14', rent: 2850, status: '即将到期' },
      { id: 'LS-2025-0826', house: '山水庭院 5-1101', tenant: '郑书言', period: '2025-09-01 至 2026-08-31', rent: 4100, status: '已终止' },
    ],
    metrics: [
      { label: '生效租约', value: '326', meta: '出租率 81.5%' }, { label: '待确认', value: '8', meta: '今日新增 3 份' },
      { label: '30 天内到期', value: '21', meta: '已联系 16 位租客' }, { label: '本月终止', value: '6', meta: '其中提前退租 2 份' },
    ],
  },
  bills: {
    title: '账单管理', description: '查看应收、实收、逾期和退款记录，跟进租金回款。', itemName: '账单',
    statusOptions: ['待支付', '已支付', '已逾期', '已退款'],
    columns: [
      { key: 'id', label: '账单编号', width: 155 }, { key: 'lease', label: '租约编号', width: 150 },
      { key: 'tenant', label: '租客', width: 110 }, { key: 'amount', label: '应付金额', width: 130, type: 'currency' },
      { key: 'dueDate', label: '应付日期', width: 125 }, { key: 'status', label: '状态', width: 110, type: 'status' },
    ],
    rows: [
      { id: 'BL-2607-0326', lease: 'LS-2026-0618', tenant: '赵思齐', amount: 3680, dueDate: '2026-07-01', status: '待支付' },
      { id: 'BL-2606-0319', lease: 'LS-2025-1042', tenant: '吴浩然', amount: 2850, dueDate: '2026-06-15', status: '已逾期' },
      { id: 'BL-2606-0311', lease: 'LS-2025-0928', tenant: '韩知夏', amount: 4300, dueDate: '2026-06-10', status: '已支付' },
      { id: 'BL-2606-0275', lease: 'LS-2025-0826', tenant: '郑书言', amount: 4100, dueDate: '2026-06-01', status: '已退款' },
    ],
    metrics: [
      { label: '本月应收', value: '¥862,400', meta: '326 笔账单' }, { label: '本月实收', value: '¥741,260', meta: '回款率 85.9%' },
      { label: '逾期金额', value: '¥28,500', meta: '涉及 9 份租约' }, { label: '退款处理中', value: '3', meta: '金额 ¥8,260' },
    ],
  },
  repairs: {
    title: '报修管理', description: '受理租客报修，跟踪派单、维修进度和服务评价。', itemName: '工单',
    statusOptions: ['待受理', '处理中', '待验收', '已完成'],
    columns: [
      { key: 'id', label: '工单编号', width: 145 }, { key: 'house', label: '房源', minWidth: 180 },
      { key: 'category', label: '报修类型', width: 110 }, { key: 'priority', label: '优先级', width: 95, type: 'status' },
      { key: 'assignee', label: '处理人', width: 110 }, { key: 'status', label: '状态', width: 110, type: 'status' },
      { key: 'createdAt', label: '提交时间', width: 150 },
    ],
    rows: [
      { id: 'RP-260627-08', house: '云栖名苑 2-1803', category: '门锁故障', priority: '紧急', assignee: '待分配', status: '待受理', createdAt: '2026-06-27 10:12' },
      { id: 'RP-260627-05', house: '锦悦和鸣 1-702', category: '空调维修', priority: '一般', assignee: '王师傅', status: '处理中', createdAt: '2026-06-27 08:35' },
      { id: 'RP-260626-19', house: '中央公园壹号 8-1206', category: '水路维修', priority: '较高', assignee: '李师傅', status: '待验收', createdAt: '2026-06-26 17:26' },
      { id: 'RP-260626-12', house: '山水庭院 5-1101', category: '照明维修', priority: '一般', assignee: '周师傅', status: '已完成', createdAt: '2026-06-26 13:08' },
    ],
    metrics: [
      { label: '待处理工单', value: '5', meta: '紧急工单 1 个' }, { label: '处理中', value: '12', meta: '平均耗时 5.6 小时' },
      { label: '本月完成', value: '86', meta: '按时完成率 91%' }, { label: '服务评分', value: '4.8', meta: '基于 72 次评价' },
    ],
  },
  system: {
    title: '系统管理', description: '维护角色、权限和操作审计策略。', itemName: '角色',
    statusOptions: ['启用', '停用'],
    columns: [
      { key: 'id', label: '角色编号', width: 130 }, { key: 'name', label: '角色名称', minWidth: 150 },
      { key: 'users', label: '账号数量', width: 110 }, { key: 'permissions', label: '权限数量', width: 110 },
      { key: 'scope', label: '数据范围', minWidth: 160 }, { key: 'status', label: '状态', width: 100, type: 'status' },
    ],
    rows: [
      { id: 'ROLE-ADMIN', name: '平台管理员', users: 3, permissions: 24, scope: '全部业务数据', status: '启用' },
      { id: 'ROLE-HOUSEKEEPER', name: '管家', users: 18, permissions: 12, scope: '负责房源及租约', status: '启用' },
      { id: 'ROLE-LANDLORD', name: '房东', users: 126, permissions: 8, scope: '本人名下房源', status: '启用' },
      { id: 'ROLE-FINANCE', name: '财务专员', users: 2, permissions: 6, scope: '账单与支付数据', status: '停用' },
    ],
    metrics: [
      { label: '系统角色', value: '4', meta: '3 个角色启用' }, { label: '权限标识', value: '24', meta: '覆盖 8 个业务模块' },
      { label: '后台账号', value: '149', meta: '本月新增 7 个' }, { label: '今日操作日志', value: '1,286', meta: '异常操作 0 次' },
    ],
  },
}
