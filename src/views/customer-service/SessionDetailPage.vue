<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'

import PageHeader from '@/components/PageHeader.vue'
import { getSessionMessages, type MessageItem } from '@/api/customer-service'
import { formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const messages = ref<MessageItem[]>([])
const sessionId = route.params.sessionId as string

const roleLabelMap: Record<string, string> = {
  USER: '用户',
  ASSISTANT: 'AI 客服',
  SYSTEM: '系统',
}

const roleTagMap: Record<string, '' | 'success' | 'warning' | 'info' | 'danger'> = {
  USER: '',
  ASSISTANT: 'success',
  SYSTEM: 'info',
}

async function fetchMessages() {
  loading.value = true
  try {
    messages.value = await getSessionMessages(sessionId)
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'CustomerServiceSessions' })
}

onMounted(() => fetchMessages())
</script>

<template>
  <div class="page-container">
    <PageHeader :title="`会话详情 ${sessionId ? '-' + sessionId.slice(0, 8) : ''}`" description="查看会话消息记录">
      <template #actions>
        <el-button :icon="ArrowLeft" @click="goBack">返回列表</el-button>
      </template>
    </PageHeader>

    <div v-loading="loading" class="message-container">
      <el-empty v-if="!loading && messages.length === 0" description="暂无消息" />

      <div v-else class="message-list">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message-item"
          :class="{ 'is-user': msg.role === 'USER' }"
        >
          <div class="message-header">
            <el-tag :type="roleTagMap[msg.role] || 'info'" size="small">
              {{ roleLabelMap[msg.role] || msg.role }}
            </el-tag>
            <span class="message-status" v-if="msg.status !== 'SENT' && msg.status !== 'DONE'">
              {{ msg.status === 'STREAMING' ? '生成中...' : msg.status }}
            </span>
            <span class="message-time">{{ formatDateTime(msg.createdAt) }}</span>
          </div>
          <div class="message-content">
            <div style="white-space: pre-wrap; word-break: break-word;">{{ msg.content || '(空消息)' }}</div>

            <!-- 知识库引用 -->
            <div v-if="msg.metadataJson" class="retrieval-refs">
              <el-divider content-position="left" style="margin: 12px 0;">
                <span style="font-size: 12px; color: #7d8a84;">知识参考</span>
              </el-divider>
              <pre class="metadata-json">{{ msg.metadataJson }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.message-container {
  min-height: 400px;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 900px;
}

.message-item {
  background: #ffffff;
  border: 1px solid #dfe5e2;
  border-radius: 8px;
  padding: 16px;

  &.is-user {
    background: #f4f9f7;
    border-color: #bdd8cc;
  }
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.message-status {
  font-size: 12px;
  color: #c47b1f;
}

.message-time {
  font-size: 12px;
  color: #7d8a84;
  margin-left: auto;
}

.message-content {
  font-size: 14px;
  line-height: 1.7;
  color: #1d2b25;
}

.retrieval-refs {
  margin-top: 8px;
}

.metadata-json {
  font-size: 12px;
  color: #52605a;
  background: #f3f5f4;
  padding: 8px 12px;
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}
</style>
