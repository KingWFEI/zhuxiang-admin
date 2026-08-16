<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Plus, Refresh } from '@element-plus/icons-vue'

import PageHeader from '@/components/PageHeader.vue'
import { getDashboardOverview, type DashboardOverview } from '@/api/dashboard'
import { formatDateTime, formatFenCurrency } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const overview = ref<DashboardOverview | null>(null)
const requestFailed = ref(false)

const houseMetrics = computed(() => overview.value?.house)
const workflow = computed(() => {
  const data = overview.value?.workflow
  return [
    { label: '待生效租约', value: data?.pendingLeaseCount, meta: '合同已完成，尚未到入住日', color: '#3478a5' },
    { label: '待处理报修', value: data?.pendingRepairCount, meta: '待受理至处理中', color: '#c64c4c' },
    {
      label: '今日预约',
      value: data?.todayAppointmentCount,
      meta: data ? `已完成 ${data.todayCompletedAppointmentCount} 单` : '',
      color: '#6d5f9d',
    },
  ]
})
const trendMax = computed(() => Math.max(...(overview.value?.rentalTrend.map((item) => item.rentedCount) || []), 1))
const lockCoverage = computed(() => {
  if (requestFailed.value || !overview.value) return null
  return overview.value.house.totalCount
    ? Math.round((overview.value.house.smartLockBoundCount / overview.value.house.totalCount) * 100)
    : 0
})

function healthText(value: number | null | undefined) {
  return value == null ? '暂未提供' : `${value}%`
}

function formatWeek(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

async function fetchDashboardData() {
  loading.value = true
  requestFailed.value = false
  try {
    overview.value = await getDashboardOverview()
  } catch {
    overview.value = null
    requestFailed.value = true
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


    <el-alert v-if="requestFailed" title="数据看板接口请求失败，未展示任何模拟或缓存数值。" type="error" :closable="false" show-icon />

    <section class="metric-grid dashboard-metric-grid">
      <article class="metric-card metric-card--billing">
        <div class="billing-card__heading">
          <span class="metric-card__label">本月账单 · 实时</span>
          <span>
            共
            {{
              requestFailed || overview?.workflow.currentMonthBillCount == null
                ? '--'
                : overview.workflow.currentMonthBillCount
            }}
            笔
          </span>
        </div>
        <div class="billing-card__content">
          <div class="billing-card__primary">
            <span>待收账单</span>
            <strong>{{ requestFailed ? '--' : (overview?.workflow.currentMonthOutstandingBillCount ?? 0) }}</strong>
            <small>笔</small>
          </div>
          <dl>
            <div>
              <dt>待收金额</dt>
              <dd>{{ requestFailed ? '--' : formatFenCurrency(overview?.workflow.currentMonthOutstandingAmount ?? 0) }}</dd>
            </div>
            <div>
              <dt>已支付</dt>
              <dd>
                {{
                  requestFailed || overview?.workflow.currentMonthPaidBillCount == null
                    ? '--'
                    : `${overview.workflow.currentMonthPaidBillCount} 笔`
                }}
              </dd>
            </div>
            <div>
              <dt>已收金额</dt>
              <dd>
                {{
                  requestFailed || overview?.workflow.currentMonthReceivedAmount == null
                    ? '--'
                    : formatFenCurrency(overview.workflow.currentMonthReceivedAmount)
                }}
              </dd>
            </div>
          </dl>
        </div>
      </article>
      <article class="metric-card">
        <span class="metric-card__label">房源总量 · 实时</span>
        <strong class="metric-card__value">{{ requestFailed ? '--' : (houseMetrics?.totalCount ?? 0) }}</strong>
        <p class="metric-card__meta">当前管理范围内全部房源</p>
      </article>
      <article class="metric-card">
        <span class="metric-card__label">已绑定门锁 · 实时</span>
        <strong class="metric-card__value">{{ requestFailed ? '--' : (houseMetrics?.smartLockBoundCount ?? 0) }}</strong>
        <p class="metric-card__meta">覆盖率 {{ houseMetrics?.totalCount ? Math.round((houseMetrics.smartLockBoundCount / houseMetrics.totalCount) * 100) : 0 }}%</p>
      </article>
      <article class="metric-card">
        <span class="metric-card__label">累计浏览 · 实时</span>
        <strong class="metric-card__value">{{ requestFailed ? '--' : (houseMetrics?.totalViewCount ?? 0).toLocaleString() }}</strong>
        <p class="metric-card__meta">房源页面累计访问量</p>
      </article>
      <article class="metric-card">
        <span class="metric-card__label">平均月租 · 实时</span>
        <strong class="metric-card__value">{{ requestFailed ? '--' : formatFenCurrency(houseMetrics?.averageRent ?? 0) }}</strong>
        <p class="metric-card__meta">由后端全量房源汇总</p>
      </article>
    </section>

    <section class="workflow-strip">
      <article v-for="item in workflow" :key="item.label" class="workflow-item">
        <span class="workflow-item__dot" :style="{ backgroundColor: item.color }" />
        <div><span>{{ item.label }}</span><strong>{{ item.value ?? '--' }}</strong><small>{{ item.meta }}</small></div>
      </article>
    </section>

    <section class="dashboard-grid">
      <el-card class="surface-card trend-panel" shadow="never">
        <template #header>
          <div class="table-header">
            <div><strong class="table-header__title">近 12 周出租趋势</strong><p>按租约开始日期统计新增生效租约 · 单位：套</p></div>
            <el-tag type="success" effect="plain">实时汇总</el-tag>
          </div>
        </template>
        <div class="trend-chart">
          <div v-for="item in overview?.rentalTrend || []" :key="item.weekStart" class="trend-column">
            <span class="trend-value">{{ item.rentedCount }}</span>
            <i :style="{ height: `${Math.max((item.rentedCount / trendMax) * 100, 3)}%` }" />
            <small>{{ formatWeek(item.weekStart) }}</small>
          </div>
        </div>
      </el-card>

      <el-card class="surface-card health-panel" shadow="never">
        <template #header><strong class="table-header__title">资产健康度</strong></template>
        <div class="health-score"><strong>{{ lockCoverage ?? '--' }}</strong><span v-if="lockCoverage != null">%</span></div>
        <p>智能门锁绑定覆盖率</p>
        <el-progress v-if="lockCoverage != null" :percentage="lockCoverage" :show-text="false" :stroke-width="8" />
        <p v-else>接口不可用，暂未展示</p>
        <div class="health-list">
          <span><i class="is-good" />房源数据完整性 <strong>{{ healthText(overview?.health.houseDataCompletenessRate) }}</strong></span>
          <span><i class="is-warning" />租约续签及时率 <strong>{{ healthText(overview?.health.leaseRenewalTimelinessRate) }}</strong></span>
          <span><i class="is-danger" />报修按时完成率 <strong>{{ healthText(overview?.health.repairOnTimeCompletionRate) }}</strong></span>
        </div>
      </el-card>
    </section>

    <el-card class="surface-card" shadow="never">
      <template #header>
        <div class="table-header">
          <div><strong class="table-header__title">最近录入房源</strong><p>后端汇总接口数据</p></div>
          <el-button link type="primary" :icon="ArrowRight" @click="router.push('/houses')">查看全部</el-button>
        </div>
      </template>
      <el-table :data="overview?.recentHouses || []" empty-text="暂无房源数据">
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
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
  .dashboard-grid { grid-template-columns: 1fr; }
}

.metric-card--billing {
  grid-column: 1 / -1;
  border-color: #ead7b8;
  background: linear-gradient(120deg, #fffaf2, #fff);
}

.billing-card__heading,
.billing-card__content,
.billing-card__primary,
.billing-card__content dl,
.billing-card__content dl div {
  display: flex;
  align-items: center;
}

.billing-card__heading {
  justify-content: space-between;
}

.billing-card__heading > span:last-child {
  color: #8b6b37;
  font-size: 12px;
}

.billing-card__content {
  gap: 40px;
  margin-top: 14px;
}

.billing-card__primary {
  min-width: 180px;
  gap: 7px;
}

.billing-card__primary > span,
.billing-card__content dt {
  color: #68766f;
  font-size: 12px;
}

.billing-card__primary strong {
  color: #a9630e;
  font-size: 30px;
  line-height: 1;
}

.billing-card__primary small {
  align-self: flex-end;
  padding-bottom: 2px;
  color: #7d8983;
}

.billing-card__content dl {
  flex: 1;
  gap: 36px;
  margin: 0;
}

.billing-card__content dl div {
  gap: 10px;
}

.billing-card__content dd {
  margin: 0;
  font-size: 17px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 640px) {
  .billing-card__content,
  .billing-card__content dl {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }

  .workflow-strip { grid-template-columns: 1fr; }
  .workflow-item { border-right: 0; border-bottom: 1px solid #e5eae8; }
  .workflow-item:last-child { border-bottom: 0; }
  .trend-chart { gap: 3px; height: 220px; }
  .trend-value { display: none; }
}
</style>
