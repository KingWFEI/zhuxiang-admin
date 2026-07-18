<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CopyDocument, Plus, Refresh, Setting, SwitchButton, View } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import {
  cloneContractTemplate,
  listContractTemplates,
  offlineContractTemplate,
  syncTemplateComponents,
  type ContractTemplateSummary,
  type TemplateStatus,
} from '@/api/contractTemplate'

const router = useRouter()
const loading = ref(false)
const rows = ref<ContractTemplateSummary[]>([])
const total = ref(0)
const query = reactive<{ page: number; pageSize: number; keyword: string; status: TemplateStatus | '' }>({
  page: 1,
  pageSize: 20,
  keyword: '',
  status: '',
})

const statusOptions: Array<{ label: string; value: TemplateStatus }> = [
  { label: '草稿', value: 'DRAFT' },
  { label: '配置中', value: 'EDITING' },
  { label: '校验中', value: 'VALIDATING' },
  { label: '待发布', value: 'READY' },
  { label: '已发布', value: 'ACTIVE' },
  { label: '已下线', value: 'INACTIVE' },
  { label: '模板已漂移', value: 'DRIFTED' },
  { label: '异常', value: 'ERROR' },
]

const statusLabel = Object.fromEntries(statusOptions.map((item) => [item.value, item.label]))
const statusTagType: Record<TemplateStatus, 'success' | 'warning' | 'danger' | 'info' | 'primary'> = {
  DRAFT: 'info',
  EDITING: 'warning',
  VALIDATING: 'warning',
  READY: 'primary',
  ACTIVE: 'success',
  INACTIVE: 'info',
  DRIFTED: 'danger',
  ERROR: 'danger',
}

async function fetchRows() {
  loading.value = true
  try {
    const page = await listContractTemplates(query)
    rows.value = page.items
    total.value = page.total
  } finally {
    loading.value = false
  }
}

function search() {
  query.page = 1
  void fetchRows()
}

async function handleSync(row: ContractTemplateSummary) {
  await syncTemplateComponents(row.id)
  ElMessage.success('控件已同步')
  await fetchRows()
}

async function handleClone(row: ContractTemplateSummary) {
  const copy = await cloneContractTemplate(row.id)
  ElMessage.success(`已创建 V${copy.version} 草稿`)
  await router.push(`/contracts/templates/${copy.id}/configure`)
}

async function handleOffline(row: ContractTemplateSummary) {
  try {
    await ElMessageBox.confirm('下线后新合同将不能使用该模板，确定继续吗？', '下线模板', {
      type: 'warning',
      confirmButtonText: '确认下线',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  await offlineContractTemplate(row.id)
  ElMessage.success('模板已下线')
  await fetchRows()
}

onMounted(fetchRows)
</script>

<template>
  <div class="page-container">
    <PageHeader title="合同模板管理" description="管理合同底稿、e签宝控件、字段映射、模板校验和生产发布。">
      <template #actions>
        <el-button :icon="Refresh" :loading="loading" @click="fetchRows">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="router.push('/contracts/templates/create')">
          新建模板
        </el-button>
      </template>
    </PageHeader>

    <el-alert
      title="已发布模板不可直接修改；如需调整合同或控件，请复制为新版本后再配置发布。"
      type="info"
      :closable="false"
      show-icon
    />

    <el-card class="surface-card" shadow="never">
      <div class="toolbar-row template-toolbar">
        <el-form inline @submit.prevent="search">
          <el-form-item label="关键词">
            <el-input v-model="query.keyword" clearable placeholder="模板名称、编码或 e签宝模板 ID" @keyup.enter="search" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable placeholder="全部状态" style="width: 150px">
              <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item><el-button type="primary" @click="search">查询</el-button></el-form-item>
        </el-form>
        <span class="muted-text">共 {{ total }} 个模板版本</span>
      </div>

      <el-table v-loading="loading" :data="rows" border empty-text="暂无合同模板">
        <el-table-column label="模板" min-width="230">
          <template #default="{ row }">
            <div class="template-name">
              <strong>{{ row.templateName }}</strong>
              <span>{{ row.templateCode }} · V{{ row.version }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="环境" width="90">
          <template #default="{ row }">{{ row.environment === 'PRODUCTION' ? '正式' : '沙箱' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType[row.status as TemplateStatus]" size="small">
              {{ statusLabel[row.status as TemplateStatus] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="控件映射" min-width="180">
          <template #default="{ row }">
            <div class="mapping-progress">
              <span>{{ row.mappedCount }}/{{ row.componentCount }} 已处理</span>
              <el-tag v-if="row.requiredUnmappedCount" type="danger" size="small">
                {{ row.requiredUnmappedCount }} 个必填未映射
              </el-tag>
              <el-tag v-else type="success" size="small">无阻断项</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="docTemplateId" label="e签宝模板 ID" min-width="210">
          <template #default="{ row }"><span class="mono">{{ row.docTemplateId || '-' }}</span></template>
        </el-table-column>
        <el-table-column prop="lastSyncedAt" label="最近同步" width="165">
          <template #default="{ row }">{{ row.lastSyncedAt || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="330" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="View" @click="router.push(`/contracts/templates/${row.id}`)">详情</el-button>
            <el-button
              v-if="row.status !== 'ACTIVE'"
              link
              type="primary"
              :icon="Setting"
              @click="router.push(`/contracts/templates/${row.id}/configure`)"
            >
              配置
            </el-button>
            <el-button link type="primary" :icon="Refresh" @click="handleSync(row)">同步</el-button>
            <el-button link type="primary" :icon="CopyDocument" @click="handleClone(row)">新版本</el-button>
            <el-button v-if="row.status === 'ACTIVE'" link type="danger" :icon="SwitchButton" @click="handleOffline(row)">下线</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @change="fetchRows"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.template-toolbar { align-items: flex-end; margin-bottom: 16px; }
.template-name, .mapping-progress { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; }
.template-name span { color: #74817b; font-size: 12px; }
.mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; }
</style>
