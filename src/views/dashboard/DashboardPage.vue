<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Plus, Refresh } from '@element-plus/icons-vue'
import DataSourceNotice from '@/components/DataSourceNotice.vue'
import PageHeader from '@/components/PageHeader.vue'
import { getHouseList, type HouseItem } from '@/api/house'
import { formatDateTime, formatFenCurrency } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const houseList = ref<HouseItem[]>([])
const houseRequestFailed = ref(false)

const houseMetrics = computed(() => {
  const total = houseList.value.length
  const lockBound = houseList.value.filter((house) => house.smartLockBound).length
  const totalViews = houseList.value.reduce((sum, house) => sum + (house.viewCount || 0), 0)
  const averageRent = total
    ? Math.round(houseList.value.reduce((sum, house) => sum + (house.price || 0), 0) / total)
    : 0
  return { total, lockBound, totalViews, averageRent }
})

const recentHouses = computed(() => houseList.value.slice(0, 5))
const mockWorkflow = [
  { label: '待确认租约', value: 8, change: '较昨日 +2', color: '#3478a5' },
  { label: '本月待收账单', value: 23, change: '合计 ¥68,420', color: '#c47b1f' },
  { label: '待处理报修', value: 5, change: '其中紧急 1 单', color: '#c64c4c' },
  { label: '今日预约', value: 12, change: '已完成 7 单', color: '#6d5f9d' },
]

const mockTrend = [42, 54, 48, 67, 72, 63, 81, 76, 88, 92, 85, 96]

async function fetchDashboardData() {
  loading.value = true
  houseRequestFailed.value = false
  try {
    houseList.value = await getHouseList()
  } catch {
    houseList.value = []
    houseRequestFailed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchDashboardData)
</script>

<template>
  <div v-loading="loading" class="page-container">
    <PageHeader title="数据看板" description="聚合房源资产与日常运营状态，快速定位需要处理的业务。">
      <template #actions>
        <el-button :icon="Refresh" @click="fetchDashboardData">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="router.push('/houses/create')">新增房源</el-button>
      </template>
    </PageHeader>

    <DataSourceNotice
      type="mixed"
      detail="房源总量、门锁绑定、浏览量和平均租金来自真实接口；租约、账单、报修及趋势为模拟数据。"
    />
    <el-alert v-if="houseRequestFailed" title="房源接口暂时不可用，真实指标未展示。" type="error" :closable="false" show-icon />

    <section class="metric-grid">
      <article class="metric-card">
        <span class="metric-card__label">房源总量 · 实时</span>
        <strong class="metric-card__value">{{ houseRequestFailed ? '--' : houseMetrics.total }}</strong>
        <p class="metric-card__meta">当前管理范围内全部房源</p>
      </article>
      <article class="metric-card">
        <span class="metric-card__label">已绑定门锁 · 实时</span>
        <strong class="metric-card__value">{{ houseRequestFailed ? '--' : houseMetrics.lockBound }}</strong>
        <p class="metric-card__meta">覆盖率 {{ houseMetrics.total ? Math.round((houseMetrics.lockBound / houseMetrics.total) * 100) : 0 }}%</p>
      </article>
      <article class="metric-card">
        <span class="metric-card__label">累计浏览 · 实时</span>
        <strong class="metric-card__value">{{ houseRequestFailed ? '--' : houseMetrics.totalViews.toLocaleString() }}</strong>
        <p class="metric-card__meta">房源页面累计访问量</p>
      </article>
      <article class="metric-card">
        <span class="metric-card__label">平均月租 · 实时</span>
        <strong class="metric-card__value">{{ houseRequestFailed ? '--' : formatFenCurrency(houseMetrics.averageRent) }}</strong>
        <p class="metric-card__meta">按当前房源列表计算</p>
      </article>
    </section>

    <section class="workflow-strip">
      <article v-for="item in mockWorkflow" :key="item.label" class="workflow-item">
        <span class="workflow-item__dot" :style="{ backgroundColor: item.color }" />
        <div><span>{{ item.label }}</span><strong>{{ item.value }}</strong><small>{{ item.change }} · 模拟</small></div>
      </article>
    </section>

    <section class="dashboard-grid">
      <el-card class="surface-card trend-panel" shadow="never">
        <template #header>
          <div class="table-header">
            <div><strong class="table-header__title">近 12 周出租趋势</strong><p>模拟数据 · 单位：套</p></div>
            <el-tag type="info" effect="plain">模拟数据</el-tag>
          </div>
        </template>
        <div class="trend-chart">
          <div v-for="(value, index) in mockTrend" :key="index" class="trend-column">
            <span class="trend-value">{{ value }}</span>
            <i :style="{ height: `${value}%` }" />
            <small>W{{ index + 1 }}</small>
          </div>
        </div>
      </el-card>

      <el-card class="surface-card health-panel" shadow="never">
        <template #header><strong class="table-header__title">资产健康度</strong></template>
        <div class="health-score"><strong>{{ houseMetrics.total ? Math.round((houseMetrics.lockBound / houseMetrics.total) * 100) : 0 }}</strong><span>%</span></div>
        <p>智能门锁绑定覆盖率</p>
        <el-progress :percentage="houseMetrics.total ? Math.round((houseMetrics.lockBound / houseMetrics.total) * 100) : 0" :show-text="false" :stroke-width="8" />
        <div class="health-list">
          <span><i class="is-good" />房源数据完整性 <strong>92%</strong></span>
          <span><i class="is-warning" />租约续签及时率 <strong>78% · 模拟</strong></span>
          <span><i class="is-danger" />报修按时完成率 <strong>85% · 模拟</strong></span>
        </div>
      </el-card>
    </section>

    <el-card class="surface-card" shadow="never">
      <template #header>
        <div class="table-header">
          <div><strong class="table-header__title">最近录入房源</strong><p>真实接口数据</p></div>
          <el-button link type="primary" :icon="ArrowRight" @click="router.push('/houses')">查看全部</el-button>
        </div>
      </template>
      <el-table :data="recentHouses" empty-text="暂无房源数据">
        <el-table-column prop="title" label="房源" min-width="210" show-overflow-tooltip />
        <el-table-column prop="location" label="区域" min-width="110" />
        <el-table-column prop="roomType" label="户型" width="120" />
        <el-table-column label="月租" width="130"><template #default="{ row }"><span class="currency-text">{{ formatFenCurrency(row.price) }}</span></template></el-table-column>
        <el-table-column label="门锁" width="100"><template #default="{ row }"><el-tag :type="row.smartLockBound ? 'success' : 'info'" size="small">{{ row.smartLockBound ? '已绑定' : '未绑定' }}</el-tag></template></el-table-column>
        <el-table-column label="录入时间" width="170"><template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template></el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.workflow-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid #dfe5e2;
  border-radius: 6px;
  background: white;
}

.workflow-item {
  display: flex;
  gap: 11px;
  padding: 16px 18px;
  border-right: 1px solid #e5eae8;
}

.workflow-item:last-child { border-right: 0; }
.workflow-item__dot { width: 8px; height: 8px; margin-top: 5px; border-radius: 50%; }
.workflow-item div { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; width: 100%; }
.workflow-item span { color: #68766f; font-size: 12px; }
.workflow-item strong { grid-row: 1 / 3; grid-column: 2; font-size: 24px; }
.workflow-item small { color: #8b9791; font-size: 11px; }

.dashboard-grid { display: grid; grid-template-columns: minmax(0, 1.8fr) minmax(260px, 0.8fr); gap: 16px; }
.table-header p { margin: 4px 0 0; color: #87928d; font-size: 11px; }
.trend-chart { display: flex; align-items: flex-end; gap: 10px; height: 260px; padding-top: 24px; }
.trend-column { position: relative; display: flex; flex: 1; height: 100%; min-width: 18px; flex-direction: column; justify-content: flex-end; align-items: center; }
.trend-column i { width: min(28px, 75%); min-height: 8px; border-radius: 3px 3px 0 0; background: #2f8061; }
.trend-column small { margin-top: 8px; color: #8a9690; font-size: 9px; }
.trend-value { margin-bottom: 4px; color: #66736d; font-size: 9px; }
.health-panel { min-width: 0; }
.health-score { margin-top: 6px; color: #176b4d; }
.health-score strong { font-size: 54px; line-height: 1; }
.health-score span { font-size: 18px; }
.health-panel > :deep(.el-card__body) > p { margin: 8px 0 22px; color: #7c8882; font-size: 12px; }
.health-list { display: flex; flex-direction: column; gap: 14px; margin-top: 24px; }
.health-list span { display: flex; align-items: center; color: #627069; font-size: 12px; }
.health-list strong { margin-left: auto; color: #26332e; }
.health-list i { width: 7px; height: 7px; margin-right: 8px; border-radius: 50%; }
.is-good { background: #2e7d5b; }.is-warning { background: #c47b1f; }.is-danger { background: #c64c4c; }

@media (max-width: 1100px) {
  .workflow-strip { grid-template-columns: repeat(2, 1fr); }
  .workflow-item:nth-child(2) { border-right: 0; }
  .workflow-item:nth-child(-n + 2) { border-bottom: 1px solid #e5eae8; }
  .dashboard-grid { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .workflow-strip { grid-template-columns: 1fr; }
  .workflow-item { border-right: 0; border-bottom: 1px solid #e5eae8; }
  .workflow-item:last-child { border-bottom: 0; }
  .trend-chart { gap: 3px; height: 220px; }
  .trend-value { display: none; }
}
</style>
