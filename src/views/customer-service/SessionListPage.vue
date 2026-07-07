<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'

import PageHeader from '@/components/PageHeader.vue'
import { getSessionList, type SessionItem } from '@/api/customer-service'
import type { PageData } from '@/api/types'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const sessionList = ref<SessionItem[]>([])
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const statusLabelMap: Record<string, string> = {
  ACTIVE: '活跃中',
  CLOSED: '已关闭',
}

async function fetchList() {
  loading.value = true
  try {
    const data: PageData<SessionItem> = await getSessionList({
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    sessionList.value = data.items
    pagination.total = data.total
  } catch {
    // API 可能暂未就绪
  } finally {
    loading.value = false
  }
}

function handleViewDetail(row: SessionItem) {
  router.push({ name: 'CustomerServiceSessionDetail', params: { sessionId: row.id } })
}

function handlePageChange(page: number, size: number) {
  pagination.page = page
  pagination.pageSize = size
  fetchList()
}

onMounted(() => fetchList())
</script>

<template>
  <div class="page-container">
    <PageHeader title="客服会话记录" description="查看用户的智能客服会话记录">
      <template #actions>
        <el-button :icon="Refresh" @click="fetchList">刷新</el-button>
      </template>
    </PageHeader>

    <el-table :data="sessionList" v-loading="loading" stripe style="width: 100%">
      <el-table-column prop="title" label="会话标题" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">{{ row.title || '新会话' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="small">
            {{ statusLabelMap[row.status] || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="messageCount" label="消息数" width="80" align="center" />
      <el-table-column label="最后消息" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="muted-text">{{ row.lastMessagePreview || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="handleViewDetail(row)">查看详情</el-button>
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
        @change="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.muted-text { color: #7d8a84; }
</style>
