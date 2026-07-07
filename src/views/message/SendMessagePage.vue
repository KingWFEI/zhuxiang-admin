<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'

import PageHeader from '@/components/PageHeader.vue'
import { sendMessage, type SendMessageRequest } from '@/api/message'
import { getUserList, type UserItem, type UserRole, type UserStatus } from '@/api/user'
import { maskPhone } from '@/utils/format'

const router = useRouter()
const formRef = ref<FormInstance>()
const submitting = ref(false)

const form = reactive<SendMessageRequest>({
  userIds: [],
  title: '',
  content: '',
  actionType: 'none',
  actionTarget: '',
})

const actionTypeOptions = [
  { label: '无操作', value: 'none' },
  { label: '跳转页面', value: 'navigate' },
  { label: '打开链接', value: 'link' },
]

const rules: FormRules = {
  title: [{ required: true, message: '请输入消息标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入消息内容', trigger: 'blur' }],
}

const userLoading = ref(false)
const userList = ref<UserItem[]>([])
const userPagination = reactive({ page: 1, pageSize: 20, total: 0 })
const userSearch = reactive<{ keyword: string; role: UserRole | ''; status: UserStatus | '' }>({
  keyword: '',
  role: '',
  status: 'active',
})

const roleOptions: Array<{ label: string; value: UserRole }> = [
  { label: '租客', value: 'TENANT' },
  { label: '管家', value: 'HOUSEKEEPER' },
  { label: '房东', value: 'LANDLORD' },
  { label: '管理员', value: 'ADMIN' },
]
const roleMap: Record<UserRole, string> = { TENANT: '租客', HOUSEKEEPER: '管家', LANDLORD: '房东', ADMIN: '管理员' }

const selectedIds = computed(() => new Set(form.userIds))

async function fetchUsers() {
  userLoading.value = true
  try {
    const data = await getUserList({
      keyword: userSearch.keyword || undefined,
      role: userSearch.role || undefined,
      status: userSearch.status || undefined,
      page: userPagination.page,
      pageSize: userPagination.pageSize,
    })
    userList.value = data.items
    userPagination.total = data.total
  } finally {
    userLoading.value = false
  }
}

function handleUserSearch() {
  userPagination.page = 1
  fetchUsers()
}

function handleSelectAll() {
  const allSelected = userList.value.every(u => selectedIds.value.has(u.id))
  if (allSelected) {
    form.userIds = form.userIds.filter(id => !userList.value.some(u => u.id === id))
  } else {
    const existing = new Set(form.userIds)
    userList.value.forEach(u => existing.add(u.id))
    form.userIds = [...existing]
  }
}

function handleToggleUser(id: string) {
  const idx = form.userIds.indexOf(id)
  if (idx >= 0) {
    form.userIds.splice(idx, 1)
  } else {
    form.userIds.push(id)
  }
}

function handleRemoveSelected(id: string) {
  form.userIds = form.userIds.filter(u => u !== id)
}

function isAllSelected() {
  return userList.value.length > 0 && userList.value.every(u => selectedIds.value.has(u.id))
}

async function handleSubmit() {
  if (submitting.value) return
  if (form.userIds.length === 0) {
    ElMessage.warning('请至少选择一位目标用户')
    return
  }
  if (!(await formRef.value?.validate().catch(() => false))) return
  submitting.value = true
  try {
    const count = await sendMessage({ ...form })
    ElMessage.success(`发送成功，已向 ${count} 位用户发送消息`)
    await router.push('/messages')
  } finally {
    submitting.value = false
  }
}

onMounted(fetchUsers)
</script>

<template>
  <div class="page-container">
    <PageHeader title="发送系统消息" description="选择目标用户并推送系统消息，支持设置后续动作。" />


    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="send-form" @submit.prevent="handleSubmit">
      <el-card shadow="never">
        <template #header><strong>消息内容</strong></template>

        <el-form-item label="消息标题" prop="title">
          <el-input v-model="form.title" placeholder="如：系统维护通知" maxlength="100" show-word-limit />
        </el-form-item>

        <el-form-item label="消息内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="4" placeholder="请输入消息正文" maxlength="500" show-word-limit />
        </el-form-item>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="card-header-row">
            <strong>目标用户</strong>
            <el-tag type="warning" size="small">已选 {{ form.userIds.length }} 人</el-tag>
          </div>
        </template>

        <div v-if="form.userIds.length" class="selected-tags">
          <el-tag v-for="id in form.userIds" :key="id" closable @close="handleRemoveSelected(id)">{{ id }}</el-tag>
        </div>

        <el-form :model="userSearch" inline class="user-search-form">
          <el-form-item label="角色">
            <el-select v-model="userSearch.role" clearable placeholder="全部角色" style="width: 130px">
              <el-option v-for="opt in roleOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="关键词">
            <el-input v-model="userSearch.keyword" clearable placeholder="ID/手机号/昵称" style="width: 200px" @keyup.enter="handleUserSearch" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleUserSearch">查询</el-button>
          </el-form-item>
        </el-form>

        <el-table v-loading="userLoading" :data="userList" border max-height="360" @selection-change="() => {}">
          <el-table-column width="50">
            <template #header>
              <el-checkbox :model-value="isAllSelected()" :indeterminate="form.userIds.length > 0 && !isAllSelected()" @change="handleSelectAll" />
            </template>
            <template #default="{ row }">
              <el-checkbox :model-value="selectedIds.has(row.id)" @change="handleToggleUser(row.id)" />
            </template>
          </el-table-column>
          <el-table-column label="用户ID" width="140" prop="id" />
          <el-table-column label="昵称" min-width="110">
            <template #default="{ row }">{{ row.nickname || '-' }}</template>
          </el-table-column>
          <el-table-column label="手机号" width="140">
            <template #default="{ row }">{{ maskPhone(row.phone) }}</template>
          </el-table-column>
          <el-table-column label="角色" width="90">
            <template #default="{ row }">{{ roleMap[row.role] || row.role }}</template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : row.status === 'disabled' ? 'danger' : 'info'" size="small">
                {{ row.status === 'active' ? '正常' : row.status === 'disabled' ? '禁用' : '注销' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="userPagination.page"
            v-model:page-size="userPagination.pageSize"
            :total="userPagination.total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            @current-change="fetchUsers"
            @size-change="() => { userPagination.page = 1; fetchUsers() }"
          />
        </div>
      </el-card>

      <el-card shadow="never">
        <template #header><strong>后续动作</strong></template>

        <el-form-item label="动作类型">
          <el-select v-model="form.actionType">
            <el-option v-for="opt in actionTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>

        <el-form-item v-if="form.actionType !== 'none'" label="动作目标">
          <el-input v-model="form.actionTarget" placeholder="页面路径或链接地址" />
        </el-form-item>
      </el-card>

      <div class="form-actions">
        <el-button @click="router.push('/messages')">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">发送消息</el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped lang="scss">
.send-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.user-search-form {
  margin-bottom: 12px;
  :deep(.el-form-item) { margin-bottom: 0; }
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
