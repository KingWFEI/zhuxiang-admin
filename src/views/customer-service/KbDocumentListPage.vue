<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Delete, Document, Refresh, Search, Upload, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import PageHeader from '@/components/PageHeader.vue'
import {
  getKbDocumentList, uploadKbDocument, updateKbDocument,
  vectorizeDocument, deleteKbDocument, type KbDocumentItem,
} from '@/api/customer-service'
import type { PageData } from '@/api/types'
import { formatDateTime } from '@/utils/format'

const loading = ref(false)
const uploading = ref(false)
const documentList = ref<KbDocumentItem[]>([])
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })
const statusFilter = ref('')

const statusOptions = [
  { label: '全部', value: '' },
  { label: '待处理', value: 'PENDING' },
  { label: '处理中', value: 'PROCESSING' },
  { label: '已启用', value: 'ACTIVE' },
  { label: '已停用', value: 'DISABLED' },
  { label: '失败', value: 'FAILED' },
]

const statusTagMap: Record<string, 'warning' | 'success' | 'info' | 'danger' | ''> = {
  PENDING: 'info',
  PROCESSING: 'warning',
  ACTIVE: 'success',
  DISABLED: 'info',
  FAILED: 'danger',
}

const statusLabelMap: Record<string, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  ACTIVE: '已启用',
  DISABLED: '已停用',
  FAILED: '失败',
}

const categoryLabelMap: Record<string, string> = {
  PLATFORM_RULE: '平台规则',
  APP_USAGE: '使用帮助',
  LOCK_FAQ: '门锁常见问题',
  DEPOSIT: '押金',
  BILL: '账单',
  LEASE: '租约',
  APPOINTMENT: '预约',
  REPAIR: '报修',
  GENERAL: '通用',
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function fetchList() {
  loading.value = true
  try {
    const data: PageData<KbDocumentItem> = await getKbDocumentList({
      status: statusFilter.value || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    documentList.value = data.items
    pagination.total = data.total
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchList()
}

onMounted(() => fetchList())

async function handleUpload(file: File) {
  uploading.value = true
  try {
    await uploadKbDocument(file)
    ElMessage.success('上传成功')
    fetchList()
  } catch {
    ElMessage.error('上传失败')
  } finally {
    uploading.value = false
  }
  return false // 阻止默认上传
}

async function handleToggleStatus(row: KbDocumentItem) {
  const newStatus = row.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  const action = newStatus === 'ACTIVE' ? '启用' : '停用'
  try {
    await updateKbDocument(row.id, { status: newStatus })
    ElMessage.success(`${action}成功`)
    fetchList()
  } catch {
    ElMessage.error(`${action}失败`)
  }
}

async function handleVectorize(row: KbDocumentItem) {
  try {
    await ElMessageBox.confirm(`确定重新向量化文档「${row.title}」吗？`, '确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    })
    await vectorizeDocument(row.id)
    ElMessage.success('已触发向量化')
    fetchList()
  } catch { /* 取消 */ }
}

async function handleDelete(row: KbDocumentItem) {
  try {
    await ElMessageBox.confirm(`确定删除文档「${row.title}」吗？此操作不可撤销。`, '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteKbDocument(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch { /* 取消 */ }
}
</script>

<template>
  <div class="page-container">
    <PageHeader title="知识库文档管理" description="管理智能客服知识库文档，支持上传、启用/停用、重新向量化">
      <template #actions>
        <el-upload
          :show-file-list="false"
          :http-request="({ file }: any) => handleUpload(file as File)"
          accept=".pdf,.docx,.txt,.md"
        >
          <el-button type="primary" :icon="Upload" :loading="uploading">上传文档</el-button>
        </el-upload>
      </template>
    </PageHeader>

    <div class="toolbar-row">
      <div style="display: flex; gap: 12px; align-items: center;">
        <el-select
          v-model="statusFilter"
          placeholder="状态筛选"
          style="width: 140px;"
          @change="handleSearch"
          clearable
        >
          <el-option v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-button :icon="Refresh" @click="fetchList">刷新</el-button>
      </div>
    </div>

    <el-table :data="documentList" v-loading="loading" stripe style="width: 100%">
      <el-table-column prop="title" label="文档标题" min-width="180" show-overflow-tooltip />
      <el-table-column label="分类" width="120">
        <template #default="{ row }">{{ categoryLabelMap[row.category] || row.category || '-' }}</template>
      </el-table-column>
      <el-table-column label="类型" width="80">
        <template #default="{ row }">
          <el-tag size="small" type="info">{{ row.fileType }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="大小" width="100">
        <template #default="{ row }">{{ formatFileSize(row.fileSize) }}</template>
      </el-table-column>
      <el-table-column label="分块数" width="80" prop="chunkCount" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTagMap[row.status] || 'info'" size="small">
            {{ statusLabelMap[row.status] || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="错误信息" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="muted-text">{{ row.errorMessage || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="上传时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button
            size="small"
            :type="row.status === 'ACTIVE' ? 'warning' : 'success'"
            @click="handleToggleStatus(row)"
            :disabled="row.status === 'PROCESSING'"
          >
            {{ row.status === 'ACTIVE' ? '停用' : '启用' }}
          </el-button>
          <el-button
            size="small"
            type="primary"
            @click="handleVectorize(row)"
            :disabled="row.status === 'PROCESSING'"
          >
            重新向量化
          </el-button>
          <el-button size="small" type="danger" :icon="Delete" @click="handleDelete(row)" />
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
        @change="fetchList"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
</style>
