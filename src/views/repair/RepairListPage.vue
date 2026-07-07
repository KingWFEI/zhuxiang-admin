<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Refresh, Search } from '@element-plus/icons-vue'

import PageHeader from '@/components/PageHeader.vue'
import { getRepairList, type RepairItem } from '@/api/repair'
import type { PageData } from '@/api/types'
import { formatDateTime, maskPhone } from '@/utils/format'

const loading = ref(false)
const repairList = ref<RepairItem[]>([])
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })
const searchForm = reactive({ keyword: '', status: '' })
const drawerVisible = ref(false)
const currentRepair = ref<RepairItem | null>(null)

const statusOptions = [
  { label: '待受理', value: 'submitted' },
  { label: '已派单', value: 'assigned' },
  { label: '处理中', value: 'processing' },
  { label: '待验收', value: 'pending_review' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
]

const statusMap: Record<string, { label: string; type: 'warning' | 'success' | 'info' | 'danger' | '' }> = {
  submitted: { label: '待受理', type: 'danger' },
  assigned: { label: '已派单', type: 'warning' },
  processing: { label: '处理中', type: 'warning' },
  pending_review: { label: '待验收', type: 'warning' },
  completed: { label: '已完成', type: 'success' },
  cancelled: { label: '已取消', type: 'info' },
}

const repairTypeMap: Record<string, string> = {
  plumbing: '水路维修',
  electrical: '电路维修',
  hvac: '空调维修',
  carpentry: '木工维修',
  lock: '门锁故障',
  lighting: '照明维修',
  waterproof: '防水维修',
  painting: '墙面涂刷',
  appliance: '家电维修',
  other: '其他',
}

function getRepairTypeLabel(type: string) {
  return repairTypeMap[type] || type || '-'
}

async function fetchRepairList() {
  loading.value = true
  try {
    const data: PageData<RepairItem> = await getRepairList({
      keyword: searchForm.keyword || undefined,
      status: searchForm.status || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    repairList.value = data.items
    pagination.total = data.total
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

onMounted(fetchRepairList)
</script>

<template>
  <div class="page-container">
    <PageHeader title="报修管理" description="受理租客报修，跟踪派单、维修进度和服务评价。">
      <template #actions>
        <el-button :icon="Refresh" @click="fetchRepairList">刷新</el-button>
      </template>
    </PageHeader>


    <el-card class="surface-card" shadow="never">
      <el-form :model="searchForm" inline @submit.prevent="handleSearch">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            clearable
            placeholder="工单号、租客姓名、手机号、房源名称、地址、报修内容"
            :prefix-icon="Search"
            style="width: 360px"
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
          <strong class="table-header__title">工单列表</strong>
          <span class="muted-text">共 {{ pagination.total }} 条工单</span>
        </div>
      </template>
      <el-table v-loading="loading" :data="repairList" border empty-text="暂无报修工单">
        <el-table-column label="工单编号" width="160">
          <template #default="{ row }">
            <span>{{ row.repairNo || row.id }}</span>
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
        <el-table-column label="报修类型" width="110">
          <template #default="{ row }">
            <span>{{ getRepairTypeLabel(row.repairType) }}</span>
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
        <el-table-column label="处理人" width="110">
          <template #default="{ row }">
            <span>{{ row.repairmanName || row.assignee || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status]?.type || 'info'" size="small">
              {{ statusMap[row.status]?.label || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="170">
          <template #default="{ row }">
            <span>{{ formatDateTime(row.createdAt) }}</span>
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

    <el-drawer v-model="drawerVisible" title="工单详情" size="min(560px, 92vw)">
      <template v-if="currentRepair">
        <h2 class="detail-title">{{ currentRepair.repairNo || currentRepair.id }}</h2>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="工单 ID">{{ currentRepair.id }}</el-descriptions-item>
          <el-descriptions-item label="工单编号">{{ currentRepair.repairNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusMap[currentRepair.status]?.type || 'info'" size="small">
              {{ statusMap[currentRepair.status]?.label || currentRepair.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="报修类型">{{ getRepairTypeLabel(currentRepair.repairType) }}</el-descriptions-item>
          <el-descriptions-item label="报修内容">{{ currentRepair.description || '-' }}</el-descriptions-item>
          <el-descriptions-item label="房源">{{ currentRepair.houseName }}</el-descriptions-item>
          <el-descriptions-item label="房源地址">{{ currentRepair.houseAddress || '-' }}</el-descriptions-item>
          <el-descriptions-item label="房间">{{ currentRepair.roomName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="租客">{{ currentRepair.tenantName }}（{{ maskPhone(currentRepair.tenantPhone) }}）</el-descriptions-item>
          <el-descriptions-item label="管家">{{ currentRepair.housekeeperName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="指派人">{{ currentRepair.assignee || '-' }}</el-descriptions-item>
          <el-descriptions-item label="维修师傅">{{ currentRepair.repairmanName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="预计上门时间">{{ formatDateTime(currentRepair.expectedVisitTime) }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{ formatDateTime(currentRepair.completedAt) }}</el-descriptions-item>
          <el-descriptions-item label="服务评分">{{ currentRepair.rating != null ? currentRepair.rating + ' 分' : '未评分' }}</el-descriptions-item>
          <el-descriptions-item label="评价内容">{{ currentRepair.reviewContent || '暂无评价' }}</el-descriptions-item>
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
