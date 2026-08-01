<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

import PageHeader from '@/components/PageHeader.vue'
import {
  getAppointmentList,
  type AppointmentSummary,
} from '@/api/appointment'

const router = useRouter()
const loading = ref(false)
const items = ref<AppointmentSummary[]>([])
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })
const filters = reactive({
  appointmentId: '',
  houseId: '',
  tenantKeyword: '',
  status: '',
  sourceType: '',
  viewingMode: '',
  dateRange: [] as string[],
})

const statusOptions = [
  ['PENDING_CONFIRMATION', '待确认'],
  ['RESCHEDULE_PROPOSED', '待确认改期'],
  ['CONFIRMED', '已确认'],
  ['READY', '可看房'],
  ['IN_PROGRESS', '看房中'],
  ['COMPLETED', '已完成'],
  ['REJECTED', '已拒绝'],
  ['CANCELLED', '已取消'],
  ['EXPIRED', '已过期'],
  ['NO_SHOW', '已爽约'],
] as const

const statusLabels = Object.fromEntries(statusOptions)
const statusTypes: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING_CONFIRMATION: 'warning',
  RESCHEDULE_PROPOSED: 'warning',
  CONFIRMED: 'primary',
  READY: 'success',
  IN_PROGRESS: 'success',
  COMPLETED: 'info',
  REJECTED: 'danger',
  CANCELLED: 'info',
  EXPIRED: 'info',
  NO_SHOW: 'danger',
}

async function fetchItems() {
  loading.value = true
  try {
    const data = await getAppointmentList({
      appointmentId: filters.appointmentId || undefined,
      houseId: filters.houseId || undefined,
      tenantKeyword: filters.tenantKeyword || undefined,
      status: filters.status || undefined,
      sourceType: filters.sourceType || undefined,
      viewingMode: filters.viewingMode || undefined,
      startDate: filters.dateRange[0] || undefined,
      endDate: filters.dateRange[1] || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    items.value = data.items
    pagination.total = data.total
  } finally {
    loading.value = false
  }
}

function search() {
  pagination.page = 1
  fetchItems()
}

function reset() {
  filters.status = ''
  filters.appointmentId = ''
  filters.houseId = ''
  filters.tenantKeyword = ''
  filters.sourceType = ''
  filters.viewingMode = ''
  filters.dateRange = []
  search()
}

function formatTime(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

onMounted(fetchItems)
</script>

<template>
  <div class="page-container">
    <PageHeader title="看房预约" description="统一处理平台陪同、自助看房和个人房东预约。">
      <template #actions>
        <el-button :icon="Refresh" @click="fetchItems">刷新</el-button>
      </template>
    </PageHeader>

    <el-card class="surface-card" shadow="never">
      <el-form :model="filters" inline>
        <el-form-item label="预约编号">
          <el-input v-model="filters.appointmentId" clearable placeholder="精确预约编号" style="width: 210px" />
        </el-form-item>
        <el-form-item label="房源">
          <el-input v-model="filters.houseId" clearable placeholder="房源 ID" style="width: 190px" />
        </el-form-item>
        <el-form-item label="租客">
          <el-input v-model="filters.tenantKeyword" clearable placeholder="姓名或手机号" style="width: 160px" />
        </el-form-item>
        <el-form-item label="房源来源">
          <el-select v-model="filters.sourceType" clearable placeholder="全部" style="width: 140px">
            <el-option label="平台自营" value="PLATFORM" />
            <el-option label="个人房源" value="LANDLORD" />
          </el-select>
        </el-form-item>
        <el-form-item label="履约方式">
          <el-select v-model="filters.viewingMode" clearable placeholder="全部" style="width: 150px">
            <el-option label="智能锁自助" value="SELF_SERVICE_LOCK" />
            <el-option label="平台陪同" value="PLATFORM_HOSTED" />
            <el-option label="房东陪同" value="LANDLORD_HOSTED" />
          </el-select>
        </el-form-item>
        <el-form-item label="预约状态">
          <el-select v-model="filters.status" clearable placeholder="全部" style="width: 150px">
            <el-option
              v-for="[value, label] in statusOptions"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="预约日期">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="surface-card" shadow="never">
      <el-table v-loading="loading" :data="items" border empty-text="暂无预约">
        <el-table-column prop="id" label="预约编号" min-width="190" show-overflow-tooltip />
        <el-table-column label="房源" min-width="220">
          <template #default="{ row }">
            <div class="cell-stack">
              <strong>{{ row.houseTitle }}</strong>
              <span>{{ row.houseId }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="租客" min-width="150">
          <template #default="{ row }">
            <div class="cell-stack">
              <span>{{ row.contactName || '-' }}</span>
              <span>{{ row.contactPhone || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="房东" min-width="130">
          <template #default="{ row }">{{ row.landlordName || '-' }}</template>
        </el-table-column>
        <el-table-column label="来源" width="100">
          <template #default="{ row }">
            <el-tag :type="row.sourceType === 'PLATFORM' ? 'primary' : 'success'" size="small">
              {{ row.sourceLabel }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="viewingModeLabel" label="履约方式" width="120" />
        <el-table-column label="预约时间" width="150">
          <template #default="{ row }">{{ formatTime(row.appointmentStartAt) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="115">
          <template #default="{ row }">
            <el-tag :type="statusTypes[row.status] || 'info'" size="small">
              {{ statusLabels[row.status] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="accessStatus" label="门锁授权" width="110" />
        <el-table-column label="操作" width="85" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="router.push({ name: 'AppointmentDetail', params: { appointmentId: row.id } })"
            >
              详情
            </el-button>
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
          @current-change="fetchItems"
          @size-change="() => { pagination.page = 1; fetchItems() }"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.cell-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;

  span {
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
}
</style>
