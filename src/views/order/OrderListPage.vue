<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Refresh, Search, View } from '@element-plus/icons-vue'

import PageHeader from '@/components/PageHeader.vue'
import { getOrderDetail, getOrderList, type OrderItem } from '@/api/order'
import { formatDateTime, formatFenCurrency, maskPhone } from '@/utils/format'

const loading = ref(false)
const detailLoading = ref(false)
const rows = ref<OrderItem[]>([])
const detail = ref<OrderItem | null>(null)
const drawerVisible = ref(false)
const filters = reactive({ keyword: '', status: '' })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const statuses = [
  { value: 'created', label: '已创建' },
  { value: 'pendingRealName', label: '待实名认证' },
  { value: 'pendingContract', label: '待确认合同' },
  { value: 'pendingPayment', label: '待支付' },
  { value: 'pendingEsign', label: '待电子签约' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

const statusMap: Record<string, { label: string; type: 'info' | 'success' | 'warning' | 'danger' | 'primary' }> = {
  created: { label: '已创建', type: 'info' }, pendingRealName: { label: '待实名认证', type: 'warning' },
  pendingContract: { label: '待确认合同', type: 'warning' }, pendingPayment: { label: '待支付', type: 'warning' },
  pendingEsign: { label: '待电子签约', type: 'primary' }, completed: { label: '已完成', type: 'success' },
  cancelled: { label: '已取消', type: 'info' },
}

const paymentStatusMap: Record<string, string> = {
  pending: '待支付', processing: '支付中', success: '支付成功', failed: '支付失败', closed: '已关闭', refunded: '已退款',
}

async function load() {
  loading.value = true
  try {
    const data = await getOrderList({
      page: pagination.page, pageSize: pagination.pageSize,
      keyword: filters.keyword || undefined, status: filters.status || undefined,
    })
    rows.value = data.items
    pagination.total = data.total
  } finally { loading.value = false }
}

function search() { pagination.page = 1; load() }
function reset() { filters.keyword = ''; filters.status = ''; pagination.page = 1; load() }

async function openDetail(row: OrderItem) {
  drawerVisible.value = true
  detail.value = null
  detailLoading.value = true
  try { detail.value = await getOrderDetail(row.id) }
  finally { detailLoading.value = false }
}

function phone(value: string | null) { return value ? maskPhone(value) : '-' }
function milestone(value: string | null) { return value ? formatDateTime(value) : '未完成' }

onMounted(load)
</script>

<template>
  <div class="page-container">
    <PageHeader title="订单管理" description="查看租客下单、合同确认、支付和电子签约的真实业务进度。">
      <template #actions><el-button :icon="Refresh" @click="load">刷新</el-button></template>
    </PageHeader>

    <el-card class="surface-card" shadow="never">
      <el-form inline @submit.prevent="search">
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            clearable
            :prefix-icon="Search"
            style="width: 340px"
            placeholder="订单号、合同号、租客、手机号、房源或地址"
            @keyup.enter="search"
          />
        </el-form-item>
        <el-form-item label="订单状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 150px">
            <el-option v-for="item in statuses" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item><el-button type="primary" @click="search">查询</el-button><el-button @click="reset">重置</el-button></el-form-item>
      </el-form>
    </el-card>

    <el-card class="surface-card" shadow="never">
      <template #header><div class="table-header"><strong class="table-header__title">订单列表</strong><span class="muted-text">共 {{ pagination.total }} 笔订单</span></div></template>
      <el-table v-loading="loading" :data="rows" border empty-text="暂无订单数据">
        <el-table-column label="订单号" min-width="185"><template #default="{ row }"><div class="cell-stack"><strong>{{ row.id }}</strong><small class="muted-text">{{ formatDateTime(row.createdAt) }}</small></div></template></el-table-column>
        <el-table-column label="房源" min-width="210"><template #default="{ row }"><div class="cell-stack"><strong>{{ row.houseName || '-' }} {{ row.roomName || '' }}</strong><small class="muted-text">{{ row.houseAddress || '-' }}</small></div></template></el-table-column>
        <el-table-column label="租客 / 房东" min-width="180"><template #default="{ row }"><div class="cell-stack"><span>租：{{ row.tenantName || '-' }} {{ phone(row.tenantPhone) }}</span><small class="muted-text">房：{{ row.landlordName || '-' }} {{ phone(row.landlordPhone) }}</small></div></template></el-table-column>
        <el-table-column label="租期" width="195"><template #default="{ row }">{{ row.startDate }} 至 {{ row.endDate }}</template></el-table-column>
        <el-table-column label="首期应付" width="125"><template #default="{ row }"><strong class="currency-text">{{ formatFenCurrency(row.firstPaymentAmount) }}</strong></template></el-table-column>
        <el-table-column label="支付" width="115"><template #default="{ row }"><span>{{ row.paymentStatus ? paymentStatusMap[row.paymentStatus] || row.paymentStatus : '未发起' }}</span></template></el-table-column>
        <el-table-column label="状态" width="115"><template #default="{ row }"><el-tag :type="statusMap[row.status]?.type || 'info'" size="small">{{ statusMap[row.status]?.label || row.status }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="80" fixed="right"><template #default="{ row }"><el-button link type="primary" :icon="View" @click="openDetail(row)">查看</el-button></template></el-table-column>
      </el-table>
      <div class="pagination-wrapper"><el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize" :total="pagination.total" :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next" @current-change="load" @size-change="pagination.page = 1; load()" /></div>
    </el-card>

    <el-drawer v-model="drawerVisible" title="订单详情" size="min(700px, 94vw)">
      <div v-loading="detailLoading">
        <template v-if="detail">
          <div class="drawer-heading"><div><h2>{{ detail.id }}</h2><el-tag :type="statusMap[detail.status]?.type || 'info'">{{ statusMap[detail.status]?.label || detail.status }}</el-tag></div></div>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="房源">{{ detail.houseName || '-' }}</el-descriptions-item><el-descriptions-item label="房间">{{ detail.roomName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="房源地址" :span="2">{{ detail.houseAddress || '-' }}</el-descriptions-item>
            <el-descriptions-item label="租客">{{ detail.tenantName || '-' }}</el-descriptions-item><el-descriptions-item label="租客手机">{{ phone(detail.tenantPhone) }}</el-descriptions-item>
            <el-descriptions-item label="房东">{{ detail.landlordName || '-' }}</el-descriptions-item><el-descriptions-item label="房东手机">{{ phone(detail.landlordPhone) }}</el-descriptions-item>
            <el-descriptions-item label="租赁开始">{{ detail.startDate }}</el-descriptions-item><el-descriptions-item label="租赁结束">{{ detail.endDate }}</el-descriptions-item>
            <el-descriptions-item label="租期">{{ detail.leaseMonths }}个月</el-descriptions-item><el-descriptions-item label="入住人数">{{ detail.tenantCount }}人</el-descriptions-item>
            <el-descriptions-item label="付款方式">{{ detail.paymentMethod || '-' }}</el-descriptions-item><el-descriptions-item label="付款周期">{{ detail.paymentMonths }}个月/期</el-descriptions-item>
            <el-descriptions-item label="月租金">{{ formatFenCurrency(detail.monthlyRent) }}</el-descriptions-item><el-descriptions-item label="押金">{{ formatFenCurrency(detail.deposit) }}</el-descriptions-item>
            <el-descriptions-item label="服务费">{{ formatFenCurrency(detail.serviceFee) }}</el-descriptions-item><el-descriptions-item label="首期应付">{{ formatFenCurrency(detail.firstPaymentAmount) }}</el-descriptions-item>
            <el-descriptions-item label="合同编号">{{ detail.contractNo || '-' }}</el-descriptions-item><el-descriptions-item label="合同状态">{{ detail.contractStatus || '-' }}</el-descriptions-item>
            <el-descriptions-item label="支付单号">{{ detail.paymentNo || '-' }}</el-descriptions-item><el-descriptions-item label="支付渠道">{{ detail.paymentChannel || '-' }}</el-descriptions-item>
          </el-descriptions>

          <h3 class="section-title">流程时间</h3>
          <el-timeline>
            <el-timeline-item :timestamp="milestone(detail.createdAt)" type="primary">创建订单</el-timeline-item>
            <el-timeline-item :timestamp="milestone(detail.realNameAt)" :type="detail.realNameAt ? 'success' : 'info'">实名认证</el-timeline-item>
            <el-timeline-item :timestamp="milestone(detail.contractConfirmedAt)" :type="detail.contractConfirmedAt ? 'success' : 'info'">确认合同</el-timeline-item>
            <el-timeline-item :timestamp="milestone(detail.paidAt)" :type="detail.paidAt ? 'success' : 'info'">支付成功</el-timeline-item>
            <el-timeline-item :timestamp="milestone(detail.signedAt)" :type="detail.signedAt ? 'success' : 'info'">完成签约</el-timeline-item>
            <el-timeline-item v-if="detail.cancelledAt" :timestamp="milestone(detail.cancelledAt)" type="danger">取消订单</el-timeline-item>
          </el-timeline>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
.cell-stack { display: flex; flex-direction: column; gap: 3px; line-height: 1.35; }
.drawer-heading { margin-bottom: 18px; }
.drawer-heading h2 { margin: 0 0 8px; font-size: 20px; }
.section-title { margin: 24px 0 16px; font-size: 16px; }
</style>
