<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Refresh, Search } from '@element-plus/icons-vue'

import PageHeader from '@/components/PageHeader.vue'
import {
  getBillDetail,
  getBillList,
  getBillSummary,
  type BillItem,
  type BillSummary,
} from '@/api/bill'
import type { PageData } from '@/api/types'
import { formatDateTime, formatFenCurrency, maskPhone } from '@/utils/format'

const loading = ref(false)
const summaryLoading = ref(false)
const detailLoading = ref(false)
const billList = ref<BillItem[]>([])
const summary = ref<BillSummary>({
  totalBillCount: 0,
  scheduledCount: 0,
  pendingCount: 0,
  paidCount: 0,
  overdueCount: 0,
  cancelledCount: 0,
  receivableAmount: 0,
  receivedAmount: 0,
  outstandingAmount: 0,
  overdueOutstandingAmount: 0,
})
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })
const searchForm = reactive({ keyword: '', status: 'paid', dueDateRange: [] as string[] })
const drawerVisible = ref(false)
const currentBill = ref<BillItem | null>(null)

const statusOptions = [
  { label: '未到期', value: 'scheduled' },
  { label: '待支付', value: 'pending' },
  { label: '已支付', value: 'paid' },
  { label: '已逾期', value: 'overdue' },
  { label: '已取消', value: 'cancelled' },
]

const quickStatusOptions = [
  { label: '已支付', value: 'paid' },
  { label: '未到期', value: 'scheduled' },
  { label: '待支付', value: 'pending' },
  { label: '已逾期', value: 'overdue' },
  { label: '全部', value: '' },
]

const statusMap: Record<
  string,
  { label: string; type: 'warning' | 'success' | 'info' | 'danger' }
> = {
  scheduled: { label: '未到期', type: 'info' },
  pending: { label: '待支付', type: 'warning' },
  paid: { label: '已支付', type: 'success' },
  overdue: { label: '已逾期', type: 'danger' },
  cancelled: { label: '已取消', type: 'info' },
}

const paymentChannelMap: Record<string, string> = {
  alipay: '支付宝',
  wechat: '微信支付',
  mock: '模拟渠道',
}

async function fetchBillList() {
  loading.value = true
  try {
    const data: PageData<BillItem> = await getBillList({
      keyword: searchForm.keyword || undefined,
      status: searchForm.status || undefined,
      dueDateStart: searchForm.dueDateRange[0] || undefined,
      dueDateEnd: searchForm.dueDateRange[1] || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    billList.value = data.items
    pagination.total = data.total
  } finally {
    loading.value = false
  }
}

async function fetchSummary() {
  summaryLoading.value = true
  try {
    summary.value = await getBillSummary()
  } finally {
    summaryLoading.value = false
  }
}

async function refreshAll() {
  await Promise.all([fetchBillList(), fetchSummary()])
}

function handleSearch() {
  pagination.page = 1
  fetchBillList()
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.status = 'paid'
  searchForm.dueDateRange = []
  pagination.page = 1
  fetchBillList()
}

function handleQuickStatus(status: string) {
  searchForm.status = status
  pagination.page = 1
  fetchBillList()
}

function handlePageChange(page: number) {
  pagination.page = page
  fetchBillList()
}

function handleSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  fetchBillList()
}

async function openDetail(bill: BillItem) {
  currentBill.value = bill
  drawerVisible.value = true
  detailLoading.value = true
  try {
    currentBill.value = await getBillDetail(bill.billId)
  } finally {
    detailLoading.value = false
  }
}

function tenantDisplay(bill: BillItem) {
  if (!bill.tenantName && !bill.tenantPhone) return '-'
  return bill.tenantName || '未设置昵称'
}

onMounted(refreshAll)
</script>

<template>
  <div class="page-container">
    <PageHeader
      title="账单管理"
      description="基于实际租约账单与支付记录，查看应收、实收和逾期情况。"
    >
      <template #actions>
        <el-button :icon="Refresh" :loading="loading || summaryLoading" @click="refreshAll">
          刷新
        </el-button>
      </template>
    </PageHeader>

    <section v-loading="summaryLoading" class="metric-grid">
      <article class="metric-card">
        <span class="metric-card__label">累计应收</span>
        <strong class="metric-card__value">{{
          formatFenCurrency(summary.receivableAmount)
        }}</strong>
        <p class="metric-card__meta">共 {{ summary.totalBillCount }} 笔账单</p>
      </article>
      <article class="metric-card">
        <span class="metric-card__label">累计实收</span>
        <strong class="metric-card__value">{{ formatFenCurrency(summary.receivedAmount) }}</strong>
        <p class="metric-card__meta">{{ summary.paidCount }} 笔已支付</p>
      </article>
      <article class="metric-card">
        <span class="metric-card__label">待收金额</span>
        <strong class="metric-card__value">{{
          formatFenCurrency(summary.outstandingAmount)
        }}</strong>
        <p class="metric-card__meta">
          待支付 {{ summary.pendingCount }} 笔，未到期 {{ summary.scheduledCount }} 笔
        </p>
      </article>
      <article class="metric-card metric-card--danger">
        <span class="metric-card__label">逾期未收</span>
        <strong class="metric-card__value">{{
          formatFenCurrency(summary.overdueOutstandingAmount)
        }}</strong>
        <p class="metric-card__meta">{{ summary.overdueCount }} 笔逾期账单</p>
      </article>
    </section>

    <el-card class="surface-card" shadow="never">
      <el-form :model="searchForm" inline @submit.prevent="handleSearch">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            clearable
            :prefix-icon="Search"
            placeholder="账单、租约、租客、手机号或房源"
            style="width: 300px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            clearable
            placeholder="全部状态"
            style="width: 130px"
          >
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="到期日">
          <el-date-picker
            v-model="searchForm.dueDateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 250px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="surface-card" shadow="never">
      <template #header>
        <div class="table-header">
          <strong class="table-header__title">账单列表</strong>
          <div class="table-header__actions">
            <span class="muted-text">共 {{ pagination.total }} 笔</span>
            <el-button-group class="quick-filter">
              <el-button
                v-for="item in quickStatusOptions"
                :key="item.value || 'all'"
                :type="searchForm.status === item.value ? 'primary' : 'default'"
                size="small"
                @click="handleQuickStatus(item.value)"
              >
                {{ item.label }}
              </el-button>
            </el-button-group>
          </div>
        </div>
      </template>
      <el-table v-loading="loading" :data="billList" border empty-text="暂无账单数据">
        <el-table-column label="账单 / 租约" min-width="210">
          <template #default="{ row }">
            <div class="cell-stack">
              <strong>{{ row.billId }}</strong>
              <span class="muted-text">租约 {{ row.leaseId }} · 第 {{ row.periodNo }} 期</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="租客" width="140">
          <template #default="{ row }">
            <div class="cell-stack">
              <span>{{ tenantDisplay(row) }}</span>
              <small class="muted-text">{{
                row.tenantPhone ? maskPhone(row.tenantPhone) : '-'
              }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="房源" min-width="190">
          <template #default="{ row }">
            <div class="cell-stack">
              <span>{{ row.houseName || '-' }}</span>
              <small class="muted-text">{{ row.houseAddress || '-' }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="应收" width="120">
          <template #default="{ row }">
            <span class="currency-text">{{
              formatFenCurrency(row.amountDue + row.overdueAmount)
            }}</span>
          </template>
        </el-table-column>
        <el-table-column label="收款情况" width="160">
          <template #default="{ row }">
            <div class="cell-stack amount-stack">
              <template v-if="row.status === 'cancelled'">
                <span class="muted-text">已取消，不计收款</span>
              </template>
              <template v-else-if="row.status === 'paid'">
                <strong class="amount-received">已收 {{ formatFenCurrency(row.amountPaid) }}</strong>
                <small class="amount-settled">已结清</small>
              </template>
              <template v-else>
                <strong class="amount-outstanding">待收 {{ formatFenCurrency(row.outstandingAmount) }}</strong>
                <small v-if="row.amountPaid > 0">已收 {{ formatFenCurrency(row.amountPaid) }}</small>
                <small v-else>{{ row.status === 'scheduled' ? '尚未到期' : '尚未收款' }}</small>
              </template>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="dueDate" label="到期日" width="120" />
        <el-table-column label="支付信息" min-width="190">
          <template #default="{ row }">
            <div v-if="row.status === 'paid'" class="cell-stack payment-stack">
              <span>{{ formatDateTime(row.paidAt) }}</span>
              <small :class="{ 'muted-text': !row.paymentNo }">
                {{ row.paymentNo || '支付单号暂缺' }}
              </small>
            </div>
            <span v-else class="muted-text">—</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status]?.type || 'info'" size="small">
              {{ statusMap[row.status]?.label || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <el-drawer v-model="drawerVisible" title="账单详情" size="min(580px, 92vw)">
      <div v-loading="detailLoading">
        <template v-if="currentBill">
          <div class="detail-heading">
            <div>
              <span class="muted-text">账单编号</span>
              <h2>{{ currentBill.billId }}</h2>
            </div>
            <el-tag :type="statusMap[currentBill.status]?.type || 'info'">
              {{ statusMap[currentBill.status]?.label || currentBill.status }}
            </el-tag>
          </div>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="关联租约">{{ currentBill.leaseId }}</el-descriptions-item>
            <el-descriptions-item label="账单期数">
              第 {{ currentBill.periodNo }} 期
            </el-descriptions-item>
            <el-descriptions-item label="租客">
              {{ tenantDisplay(currentBill) }}
              <span v-if="currentBill.tenantPhone">（{{ maskPhone(currentBill.tenantPhone) }}）</span>
            </el-descriptions-item>
            <el-descriptions-item label="房源">
              {{
                currentBill.houseName || '-'
              }}
            </el-descriptions-item>
            <el-descriptions-item label="房源地址">
              {{
                currentBill.houseAddress || '-'
              }}
            </el-descriptions-item>
            <el-descriptions-item label="应缴本金">
              {{
                formatFenCurrency(currentBill.amountDue)
              }}
            </el-descriptions-item>
            <el-descriptions-item label="逾期金额">
              {{
                formatFenCurrency(currentBill.overdueAmount)
              }}
            </el-descriptions-item>
            <el-descriptions-item label="已缴金额">
              {{
                currentBill.status === 'cancelled'
                  ? '—'
                  : formatFenCurrency(currentBill.amountPaid)
              }}
            </el-descriptions-item>
            <el-descriptions-item label="待缴金额">
              {{
                currentBill.status === 'cancelled' || currentBill.status === 'paid'
                  ? '—'
                  : formatFenCurrency(currentBill.outstandingAmount)
              }}
            </el-descriptions-item>
            <el-descriptions-item label="应缴日期">{{ currentBill.dueDate }}</el-descriptions-item>
            <el-descriptions-item label="支付时间">
              {{
                formatDateTime(currentBill.paidAt)
              }}
            </el-descriptions-item>
            <el-descriptions-item label="支付单号">
              {{
                currentBill.paymentNo || '-'
              }}
            </el-descriptions-item>
            <el-descriptions-item label="支付渠道">
              {{
                currentBill.paymentChannel
                  ? paymentChannelMap[currentBill.paymentChannel] || currentBill.paymentChannel
                  : '-'
              }}
            </el-descriptions-item>
            <el-descriptions-item label="渠道交易号">
              {{
                currentBill.channelTradeNo || '-'
              }}
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{
                formatDateTime(currentBill.createdAt)
              }}
            </el-descriptions-item>
            <el-descriptions-item label="更新时间">
              {{
                formatDateTime(currentBill.updatedAt)
              }}
            </el-descriptions-item>
          </el-descriptions>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
.cell-stack {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;

  strong,
  span,
  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.amount-outstanding,
.metric-card--danger .metric-card__value {
  color: #c45656;
}

.amount-received,
.amount-settled {
  color: #2e7d5b;
}

.payment-stack small {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.table-header__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 760px) {
  .table-header,
  .table-header__actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .quick-filter {
    display: flex;
    flex-wrap: wrap;
  }
}

.detail-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;

  h2 {
    margin: 4px 0 0;
    font-size: 19px;
  }
}
</style>
