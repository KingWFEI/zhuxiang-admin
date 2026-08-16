<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'

import PageHeader from '@/components/PageHeader.vue'
import {
  acceptRepair,
  assignRepair,
  finishRepair,
  getRepairDetail,
  getRepairList,
  startRepair,
  type RepairDetail,
  type RepairItem,
  type RepairStatus,
} from '@/api/repair'
import { formatDateTime, maskPhone } from '@/utils/format'

const loading = ref(false)
const detailLoading = ref(false)
const actionLoading = ref(false)
const requestFailed = ref(false)
const rows = ref<RepairItem[]>([])
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })
const filters = reactive<{ keyword: string; status: RepairStatus | '' }>({ keyword: '', status: '' })
const drawerVisible = ref(false)
const currentRepair = ref<RepairDetail | null>(null)

const statusOptions: Array<{ label: string; value: RepairStatus }> = [
  { label: '待受理', value: 'submitted' },
  { label: '已受理', value: 'accepted' },
  { label: '已派单', value: 'assigned' },
  { label: '处理中', value: 'processing' },
  { label: '待评价', value: 'pendingReview' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
]

const statusMap: Record<RepairStatus, { label: string; type: 'warning' | 'primary' | 'success' | 'info' | 'danger' }> = {
  submitted: { label: '待受理', type: 'warning' },
  accepted: { label: '已受理', type: 'primary' },
  assigned: { label: '已派单', type: 'primary' },
  processing: { label: '处理中', type: 'primary' },
  pendingReview: { label: '待评价', type: 'warning' },
  completed: { label: '已完成', type: 'success' },
  cancelled: { label: '已取消', type: 'info' },
}

const typeMap: Record<string, string> = {
  plumbing: '水管维修',
  electrical: '电路维修',
  appliance: '家电维修',
  furniture: '家具维修',
  door_window: '门窗维修',
  other: '其他',
}

async function fetchRepairs() {
  loading.value = true
  requestFailed.value = false
  try {
    const data = await getRepairList({
      keyword: filters.keyword || undefined,
      status: filters.status || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    rows.value = data.items
    pagination.total = data.total
  } catch {
    rows.value = []
    pagination.total = 0
    requestFailed.value = true
  } finally {
    loading.value = false
  }
}

function search() {
  pagination.page = 1
  fetchRepairs()
}

function reset() {
  filters.keyword = ''
  filters.status = ''
  pagination.page = 1
  fetchRepairs()
}

async function openDetail(row: RepairItem) {
  drawerVisible.value = true
  detailLoading.value = true
  currentRepair.value = null
  try {
    currentRepair.value = await getRepairDetail(row.id)
  } catch {
    drawerVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

async function runAction(action: 'accept' | 'start' | 'finish') {
  if (!currentRepair.value) return
  const labels = { accept: '受理', start: '开始处理', finish: '完成维修' }
  try {
    await ElMessageBox.confirm(`确认${labels[action]}该报修工单？`, '操作确认', { type: 'warning' })
  } catch {
    return
  }
  actionLoading.value = true
  try {
    const handlers = { accept: acceptRepair, start: startRepair, finish: finishRepair }
    currentRepair.value = await handlers[action](currentRepair.value.id)
    ElMessage.success('操作成功')
    await fetchRepairs()
  } finally {
    actionLoading.value = false
  }
}

async function runAssign() {
  if (!currentRepair.value) return
  let assignee: string
  try {
    const result = await ElMessageBox.prompt('请输入处理人或维修人员姓名', '派单', {
      inputPattern: /\S+/,
      inputErrorMessage: '处理人不能为空',
      confirmButtonText: '确认派单',
    })
    assignee = result.value
  } catch {
    return
  }
  actionLoading.value = true
  try {
    currentRepair.value = await assignRepair(currentRepair.value.id, assignee, assignee)
    ElMessage.success('派单成功')
    await fetchRepairs()
  } finally {
    actionLoading.value = false
  }
}

onMounted(fetchRepairs)
</script>

<template>
  <div class="page-container">
    <PageHeader title="报修管理" description="受理租客报修，跟踪派单、维修进度和服务评价。">
      <template #actions>
        <el-button :icon="Refresh" :loading="loading" @click="fetchRepairs">刷新</el-button>
      </template>
    </PageHeader>

    <el-alert
      v-if="requestFailed"
      title="报修接口请求失败，未回退到模拟数据。请检查服务状态后重试。"
      type="error"
      :closable="false"
      show-icon
    />

    <el-card class="surface-card" shadow="never">
      <el-form :model="filters" inline @submit.prevent="search">
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            clearable
            :prefix-icon="Search"
            placeholder="工单号、租客、手机号、房源或报修内容"
            style="width: 340px"
            @keyup.enter="search"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 140px">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="surface-card" shadow="never">
      <template #header>
        <div class="table-header">
          <strong class="table-header__title">报修工单</strong>
          <span class="muted-text">共 {{ pagination.total }} 条</span>
        </div>
      </template>
      <el-table v-loading="loading" :data="rows" border empty-text="暂无报修数据">
        <el-table-column prop="repairNo" label="工单编号" width="160" />
        <el-table-column label="房源" min-width="210">
          <template #default="{ row }">
            <div class="cell-stack"><strong>{{ row.houseName || '-' }}</strong><span>{{ row.houseAddress || row.roomName || '-' }}</span></div>
          </template>
        </el-table-column>
        <el-table-column label="租客" width="135">
          <template #default="{ row }"><div class="cell-stack"><span>{{ row.tenantName || '-' }}</span><small>{{ maskPhone(row.tenantPhone) }}</small></div></template>
        </el-table-column>
        <el-table-column label="报修类型" width="110">
          <template #default="{ row }">{{ typeMap[row.repairType] || row.repairType }}</template>
        </el-table-column>
        <el-table-column prop="description" label="问题描述" min-width="180" show-overflow-tooltip />
        <el-table-column label="处理人" width="110">
          <template #default="{ row }">{{ row.assignee || row.repairmanName || '待分配' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><el-tag :type="statusMap[row.status]?.type || 'info'" size="small">{{ statusMap[row.status]?.label || row.status }}</el-tag></template>
        </el-table-column>
        <el-table-column label="提交时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }"><el-button link type="primary" @click="openDetail(row)">查看</el-button></template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @current-change="fetchRepairs"
          @size-change="search"
        />
      </div>
    </el-card>

    <el-drawer v-model="drawerVisible" title="报修详情" size="min(640px, 94vw)">
      <div v-loading="detailLoading">
        <template v-if="currentRepair">
          <div class="detail-actions">
            <el-button v-if="currentRepair.availableActions.includes('accept')" type="primary" :loading="actionLoading" @click="runAction('accept')">受理</el-button>
            <el-button v-if="currentRepair.availableActions.includes('assign')" type="primary" plain :loading="actionLoading" @click="runAssign">派单</el-button>
            <el-button v-if="currentRepair.availableActions.includes('start')" type="primary" :loading="actionLoading" @click="runAction('start')">开始处理</el-button>
            <el-button v-if="currentRepair.availableActions.includes('finish')" type="success" :loading="actionLoading" @click="runAction('finish')">完成维修</el-button>
          </div>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="工单编号">{{ currentRepair.repairNo }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ statusMap[currentRepair.status]?.label }}</el-descriptions-item>
            <el-descriptions-item label="房源">{{ currentRepair.houseName }} · {{ currentRepair.houseAddress || '-' }}</el-descriptions-item>
            <el-descriptions-item label="租客">{{ currentRepair.tenantName }}（{{ maskPhone(currentRepair.tenantPhone) }}）</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ currentRepair.contactName }}（{{ maskPhone(currentRepair.contactPhone) }}）</el-descriptions-item>
            <el-descriptions-item label="报修类型">{{ typeMap[currentRepair.repairType] || currentRepair.repairType }}</el-descriptions-item>
            <el-descriptions-item label="问题描述">{{ currentRepair.description }}</el-descriptions-item>
            <el-descriptions-item label="期望上门">{{ formatDateTime(currentRepair.expectedVisitTime) }}</el-descriptions-item>
            <el-descriptions-item label="处理人">{{ currentRepair.assignee || currentRepair.repairmanName || '待分配' }}</el-descriptions-item>
            <el-descriptions-item label="完成时间">{{ formatDateTime(currentRepair.completedAt) }}</el-descriptions-item>
            <el-descriptions-item label="评价">{{ currentRepair.rating ? `${currentRepair.rating} 分 ${currentRepair.reviewContent || ''}` : '暂无评价' }}</el-descriptions-item>
          </el-descriptions>
          <div v-if="currentRepair.imageUrls.length" class="repair-images">
            <el-image v-for="url in currentRepair.imageUrls" :key="url" :src="url" :preview-src-list="currentRepair.imageUrls" fit="cover" />
          </div>
          <el-timeline class="repair-timeline">
            <el-timeline-item v-for="item in currentRepair.timeline" :key="`${item.time}-${item.status}`" :timestamp="formatDateTime(item.time)">
              <strong>{{ item.title }}</strong><p>{{ item.description || '-' }}</p>
            </el-timeline-item>
          </el-timeline>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
.cell-stack { display: flex; flex-direction: column; gap: 2px; }
.cell-stack span, .cell-stack small { color: #76827c; font-size: 12px; }
.detail-actions { display: flex; justify-content: flex-end; margin-bottom: 16px; }
.repair-images { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; margin-top: 18px; }
.repair-images :deep(.el-image) { width: 100%; height: 96px; border-radius: 4px; }
.repair-timeline { margin-top: 24px; }
.repair-timeline p { margin: 4px 0 0; color: #76827c; }
</style>
