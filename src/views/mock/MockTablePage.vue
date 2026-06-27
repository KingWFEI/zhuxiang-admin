<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import DataSourceNotice from '@/components/DataSourceNotice.vue'
import PageHeader from '@/components/PageHeader.vue'
import { mockManagementConfigs, type MockModuleKey, type MockRecord } from '@/mocks/management'
import { formatCurrency } from '@/utils/format'

const props = defineProps<{ module: MockModuleKey }>()
const config = computed(() => mockManagementConfigs[props.module])
const filters = reactive({ keyword: '', status: '' })
const pagination = reactive({ page: 1, pageSize: 10 })
const detailVisible = ref(false)
const currentRecord = ref<MockRecord | null>(null)

const filteredRows = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  return config.value.rows.filter((row) => {
    const matchesKeyword = !keyword || Object.values(row).some((value) => String(value).toLowerCase().includes(keyword))
    const matchesStatus = !filters.status || row.status === filters.status
    return matchesKeyword && matchesStatus
  })
})

const pagedRows = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize
  return filteredRows.value.slice(start, start + pagination.pageSize)
})

function statusType(value: string | number) {
  const text = String(value)
  if (['正常', '已认证', '已完成', '已支付', '生效中', '启用'].includes(text)) return 'success'
  if (['待认证', '待支付', '待签约', '待确认', '即将到期', '处理中', '待验收', '较高'].includes(text)) return 'warning'
  if (['已停用', '已取消', '已终止', '已退款', '停用'].includes(text)) return 'info'
  if (['已逾期', '紧急', '待受理'].includes(text)) return 'danger'
  return 'info'
}

function handleReset() { filters.keyword = ''; filters.status = ''; pagination.page = 1 }
function openDetail(row: MockRecord) { currentRecord.value = row; detailVisible.value = true }
</script>

<template>
  <div class="page-container">
    <PageHeader :title="config.title" :description="config.description" />
    <DataSourceNotice type="mock" />

    <section class="metric-grid">
      <article v-for="metric in config.metrics" :key="metric.label" class="metric-card">
        <span class="metric-card__label">{{ metric.label }}</span><strong class="metric-card__value">{{ metric.value }}</strong><p class="metric-card__meta">{{ metric.meta }} · 模拟</p>
      </article>
    </section>

    <el-card class="surface-card" shadow="never">
      <el-form :model="filters" inline @submit.prevent="pagination.page = 1">
        <el-form-item label="关键词"><el-input v-model="filters.keyword" clearable :prefix-icon="Search" :placeholder="`搜索${config.itemName}信息`" /></el-form-item>
        <el-form-item label="状态"><el-select v-model="filters.status" clearable placeholder="全部状态"><el-option v-for="item in config.statusOptions" :key="item" :label="item" :value="item" /></el-select></el-form-item>
        <el-form-item><el-button type="primary" @click="pagination.page = 1">查询</el-button><el-button @click="handleReset">重置</el-button></el-form-item>
      </el-form>
    </el-card>

    <el-card class="surface-card" shadow="never">
      <template #header><div class="table-header"><strong class="table-header__title">{{ config.itemName }}列表</strong><el-tag type="info" effect="plain">模拟数据</el-tag></div></template>
      <el-table :data="pagedRows" border>
        <el-table-column v-for="column in config.columns" :key="column.key" :prop="column.key" :label="column.label" :width="column.width" :min-width="column.minWidth" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="column.type === 'currency'" class="currency-text">{{ formatCurrency(Number(row[column.key])) }}</span>
            <el-tag v-else-if="column.type === 'status'" :type="statusType(row[column.key])" size="small">{{ row[column.key] }}</el-tag>
            <span v-else>{{ row[column.key] }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openDetail(row)">详情</el-button></template></el-table-column>
      </el-table>
      <div class="pagination-wrapper"><el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize" :total="filteredRows.length" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" /></div>
    </el-card>

    <el-drawer v-model="detailVisible" :title="`${config.itemName}详情（模拟）`" size="min(460px, 92vw)">
      <DataSourceNotice type="mock" detail="该详情仅展示页面结构，未提交任何后端操作。" />
      <el-descriptions v-if="currentRecord" :column="1" border class="detail-descriptions">
        <el-descriptions-item v-for="column in config.columns" :key="column.key" :label="column.label">{{ currentRecord[column.key] }}</el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
.metric-card__meta { margin-bottom: 0; }.detail-descriptions { margin-top: 16px; }
</style>
