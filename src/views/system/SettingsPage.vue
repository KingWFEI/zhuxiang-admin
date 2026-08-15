<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Refresh, User } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

import PageHeader from '@/components/PageHeader.vue'
import { getSystemOverview, type SystemOverview } from '@/api/system'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const overview = ref<SystemOverview | null>(null)

const roleTagMap: Record<string, 'danger' | 'warning' | 'success' | 'info'> = {
  ADMIN: 'danger',
  HOUSEKEEPER: 'warning',
  LANDLORD: 'success',
  TENANT: 'info',
}

async function loadOverview() {
  loading.value = true
  try {
    overview.value = await getSystemOverview()
  } finally {
    loading.value = false
  }
}

onMounted(loadOverview)
</script>

<template>
  <div class="page-container">
    <PageHeader title="系统管理" description="查看后端内置角色模型与数据库中的实时账号统计。">
      <template #actions>
        <el-button :icon="User" @click="router.push('/users')">账号管理</el-button>
        <el-button :icon="Refresh" :loading="loading" @click="loadOverview">刷新</el-button>
      </template>
    </PageHeader>

    <el-alert
      title="当前系统采用代码内置角色模型"
      type="info"
      :closable="false"
      show-icon
      description="后端没有独立的角色、权限或操作审计配置表，因此此页按真实实现展示角色定义和 user 表统计，不提供无法持久化的角色编辑。账号启停请前往用户管理。"
    />

    <section v-loading="loading" class="metric-grid">
      <article class="metric-card">
        <span class="metric-card__label">全部账号</span>
        <strong class="metric-card__value">{{ overview?.totalAccounts ?? 0 }}</strong>
        <p class="metric-card__meta">包含租客与后台账号</p>
      </article>
      <article class="metric-card">
        <span class="metric-card__label">后台账号</span>
        <strong class="metric-card__value">{{ overview?.backendAccounts ?? 0 }}</strong>
        <p class="metric-card__meta">管理员、管家与房东</p>
      </article>
      <article class="metric-card">
        <span class="metric-card__label">正常后台账号</span>
        <strong class="metric-card__value">{{ overview?.activeBackendAccounts ?? 0 }}</strong>
        <p class="metric-card__meta">状态为 active</p>
      </article>
      <article class="metric-card">
        <span class="metric-card__label">近 30 天登录</span>
        <strong class="metric-card__value">{{ overview?.recentBackendLogins ?? 0 }}</strong>
        <p class="metric-card__meta">按最后登录时间统计</p>
      </article>
    </section>

    <el-card class="surface-card" shadow="never">
      <template #header>
        <div class="table-header">
          <strong class="table-header__title">内置角色与账号分布</strong>
          <span class="muted-text">数据生成于 {{ formatDateTime(overview?.generatedAt) }}</span>
        </div>
      </template>
      <el-table v-loading="loading" :data="overview?.roles || []" border empty-text="暂无角色统计">
        <el-table-column label="角色" width="170">
          <template #default="{ row }">
            <div class="role-cell">
              <el-tag :type="roleTagMap[row.role] || 'info'" effect="plain">{{ row.name }}</el-tag>
              <code>{{ row.role }}</code>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="职责说明" min-width="220" />
        <el-table-column prop="dataScope" label="设计数据范围" min-width="170" />
        <el-table-column label="管理端登录" width="110">
          <template #default="{ row }">
            <el-tag :type="row.managementLoginAllowed ? 'success' : 'info'" size="small">
              {{ row.managementLoginAllowed ? '允许' : '不允许' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="accountCount" label="账号总数" width="100" align="right" />
        <el-table-column prop="activeCount" label="正常" width="90" align="right" />
        <el-table-column prop="disabledCount" label="禁用" width="90" align="right" />
        <el-table-column prop="cancelledCount" label="已注销" width="90" align="right" />
        <el-table-column prop="recentLoginCount" label="近 30 天登录" width="120" align="right" />
      </el-table>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.role-cell {
  display: flex;
  align-items: center;
  gap: 8px;

  code {
    color: #6a7771;
    font-size: 11px;
  }
}
</style>
