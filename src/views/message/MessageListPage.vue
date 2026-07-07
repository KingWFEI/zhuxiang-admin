<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Delete, Refresh } from '@element-plus/icons-vue'

import PageHeader from '@/components/PageHeader.vue'
import {
  clearReadMessages,
  deleteMessage,
  getMessageList,
  getUnreadCounts,
  markAllMessagesRead,
  markMessageRead,
  type MessageItem,
  type UnreadCounts,
} from '@/api/message'
import { formatDateTime } from '@/utils/format'

const loading = ref(false)
const messageList = ref<MessageItem[]>([])
const total = ref(0)
const unreadCounts = ref<UnreadCounts>({ total: 0, system: 0, appointment: 0, bill: 0, lease: 0, lock: 0, repair: 0 })
const query = reactive<{ category?: string; isRead?: boolean; page: number; pageSize: number }>({ page: 1, pageSize: 10 })
const categoryMap: Record<string, string> = { system: '系统', appointment: '预约', bill: '账单', lease: '租约', lock: '门锁', repair: '报修' }

async function fetchMessages() {
  loading.value = true
  try {
    const [pageData, counts] = await Promise.all([getMessageList(query), getUnreadCounts()])
    messageList.value = pageData.items
    total.value = pageData.total
    unreadCounts.value = counts
  } finally { loading.value = false }
}

async function handleMarkRead(item: MessageItem) {
  await markMessageRead(item.id); ElMessage.success('已标记为已读'); await fetchMessages()
}

async function handleMarkAllRead() {
  await markAllMessagesRead(); ElMessage.success('全部消息已标记为已读'); await fetchMessages()
}

async function handleClearRead() {
  await ElMessageBox.confirm('确认清空全部已读消息吗？', '清空已读', { type: 'warning', confirmButtonText: '确认清空', cancelButtonText: '取消' })
  await clearReadMessages(); ElMessage.success('已清空已读消息'); await fetchMessages()
}

async function handleDelete(item: MessageItem) {
  await ElMessageBox.confirm(`确认删除消息“${item.title}”吗？`, '删除消息', { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' })
  await deleteMessage(item.id); ElMessage.success('消息已删除'); await fetchMessages()
}

function handleReset() { query.category = undefined; query.isRead = undefined; query.page = 1; void fetchMessages() }
onMounted(fetchMessages)
</script>

<template>
  <div class="page-container">
    <PageHeader title="消息中心" description="查看当前管理账号收到的系统、租约、账单和设备消息。">
      <template #actions><el-button :icon="Check" @click="handleMarkAllRead">全部已读</el-button><el-button :icon="Refresh" @click="fetchMessages">刷新</el-button></template>
    </PageHeader>


    <section class="message-metrics">
      <article><span>全部未读</span><strong>{{ unreadCounts.total }}</strong></article>
      <article><span>系统</span><strong>{{ unreadCounts.system }}</strong></article>
      <article><span>租约 / 账单</span><strong>{{ unreadCounts.lease + unreadCounts.bill }}</strong></article>
      <article><span>门锁 / 报修</span><strong>{{ unreadCounts.lock + unreadCounts.repair }}</strong></article>
    </section>

    <el-card class="surface-card" shadow="never">
      <el-form :model="query" inline>
        <el-form-item label="消息分类"><el-select v-model="query.category" clearable placeholder="全部分类"><el-option v-for="(label, value) in categoryMap" :key="value" :label="label" :value="value" /></el-select></el-form-item>
        <el-form-item label="阅读状态"><el-select v-model="query.isRead" clearable placeholder="全部状态"><el-option label="未读" :value="false" /><el-option label="已读" :value="true" /></el-select></el-form-item>
        <el-form-item><el-button type="primary" @click="query.page = 1; fetchMessages()">查询</el-button><el-button @click="handleReset">重置</el-button></el-form-item>
      </el-form>
    </el-card>

    <el-card class="surface-card" shadow="never">
      <template #header><div class="table-header"><strong class="table-header__title">账号消息</strong><el-button type="danger" link :icon="Delete" @click="handleClearRead">清空已读</el-button></div></template>
      <div v-loading="loading" class="message-list">
        <article v-for="item in messageList" :key="item.id" class="message-item" :class="{ 'message-item--unread': !item.isRead }">
          <span class="message-item__status" />
          <div class="message-item__content"><div><el-tag size="small" effect="plain">{{ categoryMap[item.category] || item.category }}</el-tag><strong>{{ item.title }}</strong></div><p>{{ item.content }}</p><small>{{ formatDateTime(item.createdAt) }}</small></div>
          <div class="message-item__actions"><el-button v-if="!item.isRead" link type="primary" @click="handleMarkRead(item)">标记已读</el-button><el-button link type="danger" @click="handleDelete(item)">删除</el-button></div>
        </article>
        <el-empty v-if="!loading && !messageList.length" description="暂无消息" :image-size="80" />
      </div>
      <div class="pagination-wrapper"><el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @current-change="fetchMessages" @size-change="fetchMessages" /></div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.message-metrics { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #dfe5e2; border-radius: 6px; background: white; }.message-metrics article { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-right: 1px solid #e5eae8; }.message-metrics article:last-child { border: 0; }.message-metrics span { color: #6f7c76; font-size: 12px; }.message-metrics strong { font-size: 22px; }
.message-list { min-height: 220px; }.message-item { display: grid; grid-template-columns: 8px minmax(0, 1fr) auto; gap: 14px; align-items: center; padding: 17px 4px; border-bottom: 1px solid #e7ebe9; }.message-item:last-child { border-bottom: 0; }.message-item__status { width: 7px; height: 7px; border-radius: 50%; background: #cfd7d3; }.message-item--unread .message-item__status { background: #176b4d; }.message-item__content { min-width: 0; }.message-item__content > div { display: flex; align-items: center; gap: 8px; }.message-item__content strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.message-item__content p { margin: 7px 0 5px; color: #5d6b64; font-size: 13px; line-height: 1.55; }.message-item__content small { color: #929d98; }.message-item__actions { display: flex; }
@media (max-width: 760px) { .message-metrics { grid-template-columns: repeat(2, 1fr); }.message-metrics article:nth-child(2) { border-right: 0; }.message-metrics article:nth-child(-n + 2) { border-bottom: 1px solid #e5eae8; }.message-item { grid-template-columns: 8px minmax(0, 1fr); }.message-item__actions { grid-column: 2; }.message-item__content > div { align-items: flex-start; flex-direction: column; } }
</style>
