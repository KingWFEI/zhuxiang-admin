<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Refresh, Search } from '@element-plus/icons-vue'
import DataSourceNotice from '@/components/DataSourceNotice.vue'
import PageHeader from '@/components/PageHeader.vue'
import { getRepairList, type RepairItem, type RepairListResult } from '@/api/repair'
import { formatDateTime, maskPhone } from '@/utils/format'

const loading = ref(false)
const repairList = ref<RepairItem[]>([])
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })
const searchForm = reactive({ keyword: '', status: '' })
const drawerVisible = ref(false)
const currentRepair = ref<RepairItem | null>(null)

const statusOptions = [
  { label: '待受理', value: 'submitted' },
  { label: '已受理', value: 'accepted' },
  { label: '已分派', value: 'assigned' },
  { label: '处理中', value: 'processing' },
  { label: '待评价', value: 'pendingReview' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
]

const statusMap: Record<string, { label: string; type: 'warning' | 'success' | 'info' | 'danger' }> = {
  submitted: { label: '待受理', type: 'danger' },
  accepted: { label: '已受理', type: 'warning' },
  assigned: { label: '已分派', type: 'warning' },
  processing: { label: '处理中', type: 'warning' },
  pendingReview: { label: '待评价', type: 'info' },
  pending_review: { label: '待评价', type: 'info' },
  completed: { label: '已完成', type: 'success' },
  cancelled: { label: '已取消', type: 'info' },
}

const repairTypeMap: Record<string, string> = {
  plumbing: '水电维修',
  electrical: '电路问题',
  appliance: '家电故障',
  lock: '门锁问题',
  furniture: '家具损坏',
  network: '网络问题',
  other: '其他问题',
}

function normalizeRepairList(data: RepairListResult) {
  if (Array.isArray(data)) {
    repairList.value = data
    pagination.total = data.length
    return
  }
  repairList.value = data.items || []
  pagination.total = data.total || repairList.value.length
}

async function fetchRepairList() {
  loading.value = true
  try {
    const data = await getRepairList({
      keyword: searchForm.keyword || undefined,
      status: searchForm.status || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    normalizeRepairList(data)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchRepairList()
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.status = ''
  pagination.page = 1
  fetchRepairList()
}

function handlePageChange(page: number) {
  pagination.page = page
  fetchRepairList()
}

function handleSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  fetchRepairList()
}

function openDrawer(repair: RepairItem) {
  currentRepair.value = repair
  drawerVisible.value = true
}

function repairNoOf(row: RepairItem) {
  return row.repairNo || row.orderNo || row.id
}

function repairTypeOf(row: RepairItem) {
  const type = row.repairType || row.category || ''
  return repairTypeMap[type] || type || '-'
}

function houseTextOf(row: RepairItem) {
  return row.houseName || row.roomName || row.houseId || '-'
}

function contactTextOf(row: RepairItem) {
  const name = row.tenantName || row.contactName || '-'
  const phone = row.tenantPhone || row.contactPhone || ''
  return phone ? `${name}（${maskPhone(phone)}）` : name
}

function assigneeOf(row: RepairItem) {
  return row.assignee || row.repairmanName || row.housekeeperName || '待分配'
}

function statusLabel(status: string) {
  return statusMap[status]?.label || status || '-'
}

function statusType(status: string) {
  return statusMap[status]?.type || 'info'
}

onMounted(fetchRepairList)
</script>

<template>
  <div class="page-container">
    <PageHeader title="报修管理" description="受理租客报修，跟踪派单、维修进度和服务评价。">
      <template #actions>
        <el-button :icon="Refresh" @click="fetchRepairList">刷新</el-button>
      </template>
    </PageHeader>
    <DataSourceNotice type="real" detail="列表来自 GET /admin/repairs，支持关键词、状态和分页查询。" />

    <el-card class="surface-card" shadow="never">
      <el-form :model="searchForm" inline @submit.prevent="handleSearch">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            clearable
            placeholder="工单号、租客、手机号、房源或报修内容"
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
          <strong class="table-header__title">报修工单</strong>
          <span class="muted-text">共 {{ pagination.total }} 单</span>
        </div>
      </template>
      <el-table v-loading="loading" :data="repairList" border empty-text="暂无报修数据">
        <el-table-column label="工单编号" width="150">
          <template #default="{ row }">{{ repairNoOf(row) }}</template>
        </el-table-column>
        <el-table-column label="房源" min-width="190">
          <template #default="{ row }">
            <div class="cell-stack">
              <strong>{{ houseTextOf(row) }}</strong>
              <span class="muted-text">{{ row.houseAddress || row.roomName || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="报修人" width="160">
          <template #default="{ row }">{{ contactTextOf(row) }}</template>
        </el-table-column>
        <el-table-column label="类型" width="110">
          <template #default="{ row }">{{ repairTypeOf(row) }}</template>
        </el-table-column>
        <el-table-column label="问题描述" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ row.description || '-' }}</template>
        </el-table-column>
        <el-table-column label="处理人" width="110">
          <template #default="{ row }">{{ assigneeOf(row) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="175">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
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

    <el-drawer v-model="drawerVisible" title="报修详情" size="min(560px, 92vw)">
      <template v-if="currentRepair">
        <h2 class="detail-title">{{ repairNoOf(currentRepair) }}</h2>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="工单 ID">{{ currentRepair.id }}</el-descriptions-item>
          <el-descriptions-item label="房源">{{ houseTextOf(currentRepair) }}</el-descriptions-item>
          <el-descriptions-item label="地址">{{ currentRepair.houseAddress || '-' }}</el-descriptions-item>
          <el-descriptions-item label="报修人">{{ contactTextOf(currentRepair) }}</el-descriptions-item>
          <el-descriptions-item label="报修类型">{{ repairTypeOf(currentRepair) }}</el-descriptions-item>
          <el-descriptions-item label="优先级">{{ currentRepair.priority || '-' }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="statusType(currentRepair.status)" size="small">{{ statusLabel(currentRepair.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="处理人">{{ assigneeOf(currentRepair) }}</el-descriptions-item>
          <el-descriptions-item label="期望上门">{{ formatDateTime(currentRepair.expectedVisitTime) }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{ formatDateTime(currentRepair.completedAt) }}</el-descriptions-item>
          <el-descriptions-item label="评分">{{ currentRepair.rating ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="评价">{{ currentRepair.reviewContent || '-' }}</el-descriptions-item>
          <el-descriptions-item label="问题描述">{{ currentRepair.description || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(currentRepair.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDateTime(currentRepair.updatedAt) }}</el-descriptions-item>
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
}
.detail-title {
  margin: 0 0 16px;
  font-size: 20px;
  letter-spacing: 0;
}
</style>
