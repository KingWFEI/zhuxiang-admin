<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Refresh, Search } from '@element-plus/icons-vue'
import DataSourceNotice from '@/components/DataSourceNotice.vue'
import PageHeader from '@/components/PageHeader.vue'
import { getLeaseList, type LeaseItem } from '@/api/lease'
import type { PageData } from '@/api/types'
import { formatDateTime, formatFenCurrency, maskPhone } from '@/utils/format'

const loading = ref(false)
const leaseList = ref<LeaseItem[]>([])
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })
const searchForm = reactive({ keyword: '', status: '' })
const drawerVisible = ref(false)
const currentLease = ref<LeaseItem | null>(null)

const statusOptions = [
  { label: '待确认', value: 'pending' },
  { label: '生效中', value: 'active' },
  { label: '已到期', value: 'expired' },
  { label: '已终止', value: 'terminated' },
]

const statusMap: Record<string, { label: string; type: 'warning' | 'success' | 'info' | 'danger' }> = {
  pending: { label: '待确认', type: 'warning' },
  active: { label: '生效中', type: 'success' },
  expired: { label: '已到期', type: 'info' },
  terminated: { label: '已终止', type: 'danger' },
}

async function fetchLeaseList() {
  loading.value = true
  try {
    const data: PageData<LeaseItem> = await getLeaseList({
      keyword: searchForm.keyword || undefined,
      status: searchForm.status || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    leaseList.value = data.items
    pagination.total = data.total
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchLeaseList()
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.status = ''
  pagination.page = 1
  fetchLeaseList()
}

function handlePageChange(page: number) {
  pagination.page = page
  fetchLeaseList()
}

function handleSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  fetchLeaseList()
}

function openDrawer(lease: LeaseItem) {
  currentLease.value = lease
  drawerVisible.value = true
}

function formatPeriod(startDate: string, endDate: string, months: number) {
  return `${startDate} 至 ${endDate}（${months} 个月）`
}

onMounted(fetchLeaseList)
</script>

<template>
  <div class="page-container">
    <PageHeader title="租约管理" description="集中查看租约履约、到期和终止情况，跟进合同关键节点。">
      <template #actions>
        <el-button :icon="Refresh" @click="fetchLeaseList">刷新</el-button>
      </template>
    </PageHeader>
    <DataSourceNotice type="real" detail="列表来自 GET /admin/leases，支持按状态和关键词筛选，支持分页查询。" />

    <el-card class="surface-card" shadow="never">
      <el-form :model="searchForm" inline @submit.prevent="handleSearch">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            clearable
            placeholder="租约编号、租客姓名、手机号、房源名称或地址"
            :prefix-icon="Search"
            style="width: 320px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" clearable placeholder="全部状态" style="width: 140px">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
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
          <strong class="table-header__title">租约列表</strong>
          <span class="muted-text">共 {{ pagination.total }} 份租约</span>
        </div>
      </template>
      <el-table v-loading="loading" :data="leaseList" border empty-text="暂无租约数据">
        <el-table-column label="租约编号" width="150">
          <template #default="{ row }">
            <span>{{ row.contractNo || row.leaseId }}</span>
          </template>
        </el-table-column>
        <el-table-column label="房源" min-width="200">
          <template #default="{ row }">
            <div class="cell-stack">
              <strong>{{ row.houseName }}</strong>
              <span class="muted-text">{{ row.houseAddress || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="租客" width="130">
          <template #default="{ row }">
            <div class="cell-stack">
              <span>{{ row.tenantName }}</span>
              <small class="muted-text">{{ maskPhone(row.tenantPhone) }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="租期" width="220">
          <template #default="{ row }">
            <span>{{ formatPeriod(row.startDate, row.endDate, row.leaseMonths) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="月租金" width="120">
          <template #default="{ row }">
            <span class="currency-text">{{ formatFenCurrency(row.monthlyRent) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="押金" width="120">
          <template #default="{ row }">
            <span class="currency-text">{{ formatFenCurrency(row.deposit) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.leaseStatus]?.type || 'info'" size="small">
              {{ statusMap[row.leaseStatus]?.label || row.leaseStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDrawer(row)">查看</el-button>
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

    <el-drawer v-model="drawerVisible" title="租约详情" size="min(560px, 92vw)">
      <template v-if="currentLease">
        <h2 class="detail-title">{{ currentLease.contractNo || currentLease.leaseId }}</h2>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="租约 ID">{{ currentLease.leaseId }}</el-descriptions-item>
          <el-descriptions-item label="合同编号">{{ currentLease.contractNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="合同状态">{{ statusMap[currentLease.contractStatus]?.label || currentLease.contractStatus || '-' }}</el-descriptions-item>
          <el-descriptions-item label="房源">{{ currentLease.houseName }}</el-descriptions-item>
          <el-descriptions-item label="地址">{{ currentLease.houseAddress || '-' }}</el-descriptions-item>
          <el-descriptions-item label="租客">{{ currentLease.tenantName }}（{{ maskPhone(currentLease.tenantPhone) }}）</el-descriptions-item>
          <el-descriptions-item label="租期">{{ formatPeriod(currentLease.startDate, currentLease.endDate, currentLease.leaseMonths) }}</el-descriptions-item>
          <el-descriptions-item label="月租金">{{ formatFenCurrency(currentLease.monthlyRent) }}</el-descriptions-item>
          <el-descriptions-item label="押金">{{ formatFenCurrency(currentLease.deposit) }}</el-descriptions-item>
          <el-descriptions-item label="首期付款">{{ formatFenCurrency(currentLease.firstPaymentAmount) }}</el-descriptions-item>
          <el-descriptions-item label="服务费">{{ formatFenCurrency(currentLease.serviceFee) }}</el-descriptions-item>
          <el-descriptions-item label="付款方式">{{ currentLease.paymentMethod || '-' }}</el-descriptions-item>
          <el-descriptions-item label="每期月数">{{ currentLease.paymentMonths ? currentLease.paymentMonths + ' 个月' : '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(currentLease.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDateTime(currentLease.updatedAt) }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
.cell-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
  strong {
    font-size: 13px;
  }
  span {
    font-size: 12px;
  }
  small {
    font-size: 11px;
  }
}
.detail-title {
  margin: 0 0 16px;
  font-size: 20px;
  letter-spacing: 0;
}
</style>
