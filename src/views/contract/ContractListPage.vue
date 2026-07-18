<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Document, Download, Refresh, Search, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

import PageHeader from '@/components/PageHeader.vue'
import {
  getContractDetail,
  getContractDownloadUrl,
  getContractList,
  type ContractDetail,
  type ContractSummary,
} from '@/api/contract'
import { formatDateTime, formatFenCurrency, maskPhone } from '@/utils/format'

const loading = ref(false)
const detailLoading = ref(false)
const downloadingId = ref('')
const rows = ref<ContractSummary[]>([])
const detail = ref<ContractDetail | null>(null)
const drawerVisible = ref(false)
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })
const filters = reactive({ keyword: '', status: '' })

const statusOptions = [
  { value: 'draft', label: '草稿' }, { value: 'confirmed', label: '已确认' },
  { value: 'generated', label: '已生成' }, { value: 'signing', label: '签署中' },
  { value: 'signed', label: '已签署' }, { value: 'terminated', label: '已终止' },
  { value: 'expired', label: '已到期' }, { value: 'canceled', label: '已取消' },
  { value: 'failed', label: '失败' },
]

const statusMap: Record<string, { label: string; type: 'info' | 'success' | 'warning' | 'danger' | 'primary' }> = {
  draft: { label: '草稿', type: 'info' }, confirmed: { label: '已确认', type: 'primary' },
  generated: { label: '已生成', type: 'primary' }, signing: { label: '签署中', type: 'warning' },
  signed: { label: '已签署', type: 'success' }, terminated: { label: '已终止', type: 'danger' },
  expired: { label: '已到期', type: 'info' }, canceled: { label: '已取消', type: 'info' },
  failed: { label: '失败', type: 'danger' },
}

async function load() {
  loading.value = true
  try {
    const data = await getContractList({
      page: pagination.page, pageSize: pagination.pageSize,
      keyword: filters.keyword || undefined, status: filters.status || undefined,
    })
    rows.value = data.items
    pagination.total = data.total
  } finally { loading.value = false }
}

function search() { pagination.page = 1; load() }
function reset() { filters.keyword = ''; filters.status = ''; pagination.page = 1; load() }

async function openDetail(row: ContractSummary) {
  drawerVisible.value = true
  detail.value = null
  detailLoading.value = true
  try { detail.value = await getContractDetail(row.id) }
  finally { detailLoading.value = false }
}

async function openFile(row: ContractSummary | ContractDetail) {
  downloadingId.value = row.id
  try {
    const file = await getContractDownloadUrl(row.id)
    window.open(file.url, '_blank', 'noopener,noreferrer')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '获取合同文件失败')
  } finally { downloadingId.value = '' }
}

function contractLabel(row: ContractSummary | ContractDetail) {
  return row.contractNo || row.contractNum || row.id
}

function signedText(row: ContractSummary | ContractDetail) {
  if (row.lessorSigned && row.tenantSigned) return '双方已签'
  if (row.lessorSigned) return '甲方已签'
  if (row.tenantSigned) return '乙方已签'
  return '双方未签'
}

onMounted(load)
</script>

<template>
  <div class="page-container">
    <PageHeader title="合同管理" description="查看全部租房合同、签署进度、合同版本和电子合同文件。">
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
            placeholder="合同编号、订单、租客、房东、房源或地址"
            @keyup.enter="search"
          />
        </el-form-item>
        <el-form-item label="合同状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 140px">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item><el-button type="primary" @click="search">查询</el-button><el-button @click="reset">重置</el-button></el-form-item>
      </el-form>
    </el-card>

    <el-card class="surface-card" shadow="never">
      <template #header><div class="table-header"><strong class="table-header__title">合同列表</strong><span class="muted-text">共 {{ pagination.total }} 份合同</span></div></template>
      <el-table v-loading="loading" :data="rows" border empty-text="暂无合同数据">
        <el-table-column label="合同编号" min-width="175">
          <template #default="{ row }"><div class="cell-stack"><strong>{{ contractLabel(row) }}</strong><small class="muted-text">订单：{{ row.orderId }}</small></div></template>
        </el-table-column>
        <el-table-column label="房源" min-width="210">
          <template #default="{ row }"><div class="cell-stack"><strong>{{ row.houseName || '-' }}</strong><small class="muted-text">{{ row.houseAddress || '-' }}</small></div></template>
        </el-table-column>
        <el-table-column label="租客 / 房东" min-width="170">
          <template #default="{ row }"><div class="cell-stack"><span>租：{{ row.tenantName || '-' }} {{ row.tenantPhone ? maskPhone(row.tenantPhone) : '' }}</span><small class="muted-text">房：{{ row.landlordName || '-' }} {{ row.landlordPhone ? maskPhone(row.landlordPhone) : '' }}</small></div></template>
        </el-table-column>
        <el-table-column label="租期" width="195"><template #default="{ row }">{{ row.startDate }} 至 {{ row.endDate }}</template></el-table-column>
        <el-table-column label="月租 / 押金" width="145"><template #default="{ row }"><div class="cell-stack"><span>{{ formatFenCurrency(row.monthlyRent) }}</span><small class="muted-text">押金 {{ formatFenCurrency(row.deposit) }}</small></div></template></el-table-column>
        <el-table-column label="签署进度" width="105"><template #default="{ row }"><span>{{ signedText(row) }}</span></template></el-table-column>
        <el-table-column label="状态" width="95"><template #default="{ row }"><el-tag :type="statusMap[row.status]?.type || 'info'" size="small">{{ statusMap[row.status]?.label || row.status }}</el-tag></template></el-table-column>
        <el-table-column label="创建时间" width="155"><template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template></el-table-column>
        <el-table-column label="操作" width="145" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="View" @click="openDetail(row)">详情</el-button>
            <el-button v-if="row.hasContractFile" link type="primary" :icon="Download" :loading="downloadingId === row.id" @click="openFile(row)">文件</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper"><el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize" :total="pagination.total" :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next" @current-change="load" @size-change="pagination.page = 1; load()" /></div>
    </el-card>

    <el-drawer v-model="drawerVisible" title="合同详情" size="min(680px, 94vw)">
      <div v-loading="detailLoading">
        <template v-if="detail">
          <div class="drawer-heading"><div><h2>{{ contractLabel(detail) }}</h2><el-tag :type="statusMap[detail.status]?.type || 'info'">{{ statusMap[detail.status]?.label || detail.status }}</el-tag></div><el-button v-if="detail.hasContractFile" type="primary" :icon="Document" :loading="downloadingId === detail.id" @click="openFile(detail)">查看合同文件</el-button></div>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="合同ID" :span="2">{{ detail.id }}</el-descriptions-item>
            <el-descriptions-item label="订单ID" :span="2">{{ detail.orderId }}</el-descriptions-item>
            <el-descriptions-item label="房源">{{ detail.houseName || '-' }}</el-descriptions-item><el-descriptions-item label="房间">{{ detail.roomName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="合同地址" :span="2">{{ detail.houseAddress || '-' }}</el-descriptions-item>
            <el-descriptions-item label="租客">{{ detail.tenantName || '-' }}</el-descriptions-item><el-descriptions-item label="租客手机">{{ detail.tenantPhone ? maskPhone(detail.tenantPhone) : '-' }}</el-descriptions-item>
            <el-descriptions-item label="房东">{{ detail.landlordName || '-' }}</el-descriptions-item><el-descriptions-item label="房东手机">{{ detail.landlordPhone ? maskPhone(detail.landlordPhone) : '-' }}</el-descriptions-item>
            <el-descriptions-item label="甲方签署">{{ detail.lessorSigned ? '已签署' : '未签署' }}</el-descriptions-item><el-descriptions-item label="乙方签署">{{ detail.tenantSigned ? '已签署' : '未签署' }}</el-descriptions-item>
            <el-descriptions-item label="租赁开始">{{ detail.startDate }}</el-descriptions-item><el-descriptions-item label="租赁结束">{{ detail.endDate }}</el-descriptions-item>
            <el-descriptions-item label="月租金">{{ formatFenCurrency(detail.monthlyRent) }}</el-descriptions-item><el-descriptions-item label="押金">{{ formatFenCurrency(detail.deposit) }}</el-descriptions-item>
            <el-descriptions-item label="首期付款">{{ formatFenCurrency(detail.firstPaymentAmount) }}</el-descriptions-item><el-descriptions-item label="服务费">{{ formatFenCurrency(detail.serviceFee) }}</el-descriptions-item>
            <el-descriptions-item label="模板版本">{{ detail.templateVersion ? `V${detail.templateVersion}` : '-' }}</el-descriptions-item><el-descriptions-item label="e签宝合同编号">{{ detail.contractNum || '-' }}</el-descriptions-item>
            <el-descriptions-item label="签署完成时间">{{ formatDateTime(detail.signedAt) }}</el-descriptions-item><el-descriptions-item label="更新时间">{{ formatDateTime(detail.updatedAt) }}</el-descriptions-item>
            <el-descriptions-item v-if="detail.failureMessage" label="失败原因" :span="2"><el-text type="danger">{{ detail.failureCode ? `${detail.failureCode}：` : '' }}{{ detail.failureMessage }}</el-text></el-descriptions-item>
          </el-descriptions>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
.cell-stack { display: flex; flex-direction: column; gap: 3px; line-height: 1.35; }
.drawer-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.drawer-heading h2 { margin: 0 0 8px; font-size: 20px; }
</style>
