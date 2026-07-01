<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import DataSourceNotice from '@/components/DataSourceNotice.vue'
import PageHeader from '@/components/PageHeader.vue'
import {
  getUserList,
  getUserDetail,
  updateUserStatus,
  type UserItem,
  type UserRole,
  type UserStatus,
} from '@/api/user'
import type { PageData } from '@/api/types'
import { formatDateTime, maskPhone } from '@/utils/format'

const loading = ref(false)
const userList = ref<UserItem[]>([])
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })
const searchForm = reactive<{ keyword: string; role: UserRole | ''; status: UserStatus | '' }>({
  keyword: '',
  role: '',
  status: '',
})

const drawerVisible = ref(false)
const currentUser = ref<UserItem | null>(null)

const roleOptions: Array<{ label: string; value: UserRole }> = [
  { label: '租客', value: 'TENANT' },
  { label: '管家', value: 'HOUSEKEEPER' },
  { label: '房东', value: 'LANDLORD' },
  { label: '管理员', value: 'ADMIN' },
]
const statusOptions: Array<{ label: string; value: UserStatus }> = [
  { label: '正常', value: 'active' },
  { label: '已禁用', value: 'disabled' },
  { label: '已注销', value: 'cancelled' },
]

const roleMap: Record<UserRole, string> = { TENANT: '租客', HOUSEKEEPER: '管家', LANDLORD: '房东', ADMIN: '管理员' }
const statusMap: Record<UserStatus, { label: string; type: 'success' | 'danger' | 'info' }> = {
  active: { label: '正常', type: 'success' },
  disabled: { label: '已禁用', type: 'danger' },
  cancelled: { label: '已注销', type: 'info' },
}

async function fetchUserList() {
  loading.value = true
  try {
    const data: PageData<UserItem> = await getUserList({
      keyword: searchForm.keyword || undefined,
      role: searchForm.role || undefined,
      status: searchForm.status || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    userList.value = data.items
    pagination.total = data.total
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchUserList()
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.role = ''
  searchForm.status = ''
  pagination.page = 1
  fetchUserList()
}

async function handleToggleStatus(row: UserItem) {
  const targetStatus: UserStatus = row.status === 'active' ? 'disabled' : 'active'
  const actionLabel = targetStatus === 'disabled' ? '禁用' : '启用'
  await ElMessageBox.confirm(`确认${actionLabel}用户「${row.nickname || row.phone}」吗？`, `${actionLabel}用户`, { type: 'warning' })
  await updateUserStatus(row.id, targetStatus)
  ElMessage.success(`用户已${actionLabel}`)
  await fetchUserList()
}

async function openDrawer(row: UserItem) {
  drawerVisible.value = true
  currentUser.value = row
  try {
    currentUser.value = await getUserDetail(row.id)
  } catch {
    currentUser.value = row
  }
}

function canToggle(row: UserItem) {
  return row.status !== 'cancelled'
}

onMounted(fetchUserList)
</script>

<template>
  <div class="page-container">
    <PageHeader title="用户管理" description="管理平台所有用户，查看用户详情、启用或禁用账号。">
      <template #actions>
        <el-button :icon="Refresh" @click="fetchUserList">刷新</el-button>
      </template>
    </PageHeader>
    <DataSourceNotice type="real" detail="列表来自 GET /api/admin/users，支持按角色、状态和关键词筛选，可启用/禁用用户。" />

    <el-card class="surface-card" shadow="never">
      <el-form :model="searchForm" inline @submit.prevent="handleSearch">
        <el-form-item label="角色">
          <el-select v-model="searchForm.role" clearable placeholder="全部角色" style="width: 140px">
            <el-option v-for="opt in roleOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" clearable placeholder="全部状态" style="width: 140px">
            <el-option v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" clearable placeholder="用户ID、手机号或昵称" style="width: 240px" @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="surface-card" shadow="never">
      <template #header>
        <div class="table-header">
          <strong class="table-header__title">用户列表</strong>
          <span class="muted-text">共 {{ pagination.total }} 人</span>
        </div>
      </template>
      <el-table v-loading="loading" :data="userList" border empty-text="暂无用户">
        <el-table-column label="用户ID" width="140" prop="id" />
        <el-table-column label="昵称" min-width="120" prop="nickname">
          <template #default="{ row }">
            <span>{{ row.nickname || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="手机号" width="140">
          <template #default="{ row }">
            <span>{{ maskPhone(row.phone) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <span>{{ roleMap[row.role] || row.role }}</span>
          </template>
        </el-table-column>
        <el-table-column label="认证" width="90">
          <template #default="{ row }">
            <el-tag :type="row.verified ? 'success' : 'info'" size="small">{{ row.verified ? '已认证' : '未认证' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status]?.type" size="small">{{ statusMap[row.status]?.label || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最近登录" width="160">
          <template #default="{ row }">
            <span>{{ formatDateTime(row.lastLoginAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="160">
          <template #default="{ row }">
            <span>{{ formatDateTime(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDrawer(row)">详情</el-button>
            <el-button v-if="canToggle(row)" link :type="row.status === 'active' ? 'danger' : 'success'" @click="handleToggleStatus(row)">
              {{ row.status === 'active' ? '禁用' : '启用' }}
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
          @current-change="fetchUserList"
          @size-change="() => { pagination.page = 1; fetchUserList() }"
        />
      </div>
    </el-card>

    <el-drawer v-model="drawerVisible" title="用户详情" size="520px">
      <template v-if="currentUser">
        <h2 class="detail-title">{{ currentUser.nickname || currentUser.id }}</h2>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="用户ID">{{ currentUser.id }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ currentUser.phone }}</el-descriptions-item>
          <el-descriptions-item label="昵称">{{ currentUser.nickname || '-' }}</el-descriptions-item>
          <el-descriptions-item label="头像">
            <el-avatar v-if="currentUser.avatarUrl" :src="currentUser.avatarUrl" :size="48" />
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="角色">{{ roleMap[currentUser.role] || currentUser.role }}</el-descriptions-item>
          <el-descriptions-item label="认证状态">
            <el-tag :type="currentUser.verified ? 'success' : 'info'" size="small">{{ currentUser.verified ? '已认证' : '未认证' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="账号状态">
            <el-tag :type="statusMap[currentUser.status]?.type" size="small">{{ statusMap[currentUser.status]?.label || currentUser.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="最近登录">{{ formatDateTime(currentUser.lastLoginAt) }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ formatDateTime(currentUser.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="最后更新">{{ formatDateTime(currentUser.updatedAt) }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
.detail-title {
  margin: 0 0 16px;
  font-size: 20px;
}
</style>
