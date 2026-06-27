<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { OfficeBuilding, Plus, Refresh, Search } from '@element-plus/icons-vue'
import DataSourceNotice from '@/components/DataSourceNotice.vue'
import PageHeader from '@/components/PageHeader.vue'
import { getHouseList, type HouseItem, type LockDeviceView } from '@/api/house'
import { formatDateTime, formatFenCurrency } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const houseList = ref<HouseItem[]>([])
const houseDrawerVisible = ref(false)
const currentHouse = ref<HouseItem | null>(null)
const lockDrawerVisible = ref(false)
const currentLock = ref<LockDeviceView | null>(null)
const searchForm = reactive({ keyword: '', status: '', rentType: '' })
const pagination = reactive({ page: 1, pageSize: 10 })

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '可出租', value: 'available' },
  { label: '上架中', value: 'online' },
  { label: '已下架', value: 'offline' },
  { label: '已出租', value: 'rented' },
]
const rentTypeOptions = [
  { label: '长租', value: 'long_rent' },
  { label: '短租', value: 'short_rent' },
  { label: '民宿', value: 'homestay' },
  { label: '推荐', value: 'recommended' },
]
const statusMap: Record<string, { label: string; type: 'success' | 'warning' | 'info' | 'danger' }> = {
  draft: { label: '草稿', type: 'info' },
  available: { label: '可出租', type: 'success' },
  online: { label: '上架中', type: 'success' },
  offline: { label: '已下架', type: 'info' },
  rented: { label: '已出租', type: 'warning' },
  ONLINE: { label: '上架中', type: 'success' },
  OFFLINE: { label: '已下架', type: 'info' },
  RENTED: { label: '已出租', type: 'warning' },
}

const filteredList = computed(() => {
  const keyword = searchForm.keyword.trim().toLowerCase()
  return houseList.value.filter((house) => {
    const matchesKeyword = !keyword || [house.title, house.location, house.address, house.roomType].some((value) => value?.toLowerCase().includes(keyword))
    const matchesStatus = !searchForm.status || house.status.toLowerCase() === searchForm.status
    const matchesRentType = !searchForm.rentType || house.rentType === searchForm.rentType
    return matchesKeyword && matchesStatus && matchesRentType
  })
})

const pagedList = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

async function fetchHouseList() {
  loading.value = true
  try { houseList.value = await getHouseList() } finally { loading.value = false }
}

function handleSearch() { pagination.page = 1 }
function handleReset() { Object.assign(searchForm, { keyword: '', status: '', rentType: '' }); pagination.page = 1 }
function openHouseDrawer(house: HouseItem) { currentHouse.value = house; houseDrawerVisible.value = true }
function openLockDrawer(lock: LockDeviceView) { currentLock.value = lock; lockDrawerVisible.value = true }

onMounted(fetchHouseList)
</script>

<template>
  <div class="page-container">
    <PageHeader title="房源列表" description="统一查看房源基础资料、运营状态和门锁绑定情况。">
      <template #actions>
        <el-button :icon="Refresh" @click="fetchHouseList">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="router.push('/houses/create')">新增房源</el-button>
      </template>
    </PageHeader>
    <DataSourceNotice type="real" detail="列表和门锁绑定摘要来自 GET /admin/houses；筛选和分页当前在前端执行。" />

    <el-card class="surface-card" shadow="never">
      <el-form :model="searchForm" inline @submit.prevent="handleSearch">
        <el-form-item label="关键词"><el-input v-model="searchForm.keyword" clearable placeholder="标题、区域、地址或户型" :prefix-icon="Search" @keyup.enter="handleSearch" /></el-form-item>
        <el-form-item label="状态"><el-select v-model="searchForm.status" clearable placeholder="全部状态"><el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item label="租赁类型"><el-select v-model="searchForm.rentType" clearable placeholder="全部类型"><el-option v-for="item in rentTypeOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item><el-button type="primary" @click="handleSearch">查询</el-button><el-button @click="handleReset">重置</el-button></el-form-item>
      </el-form>
    </el-card>

    <el-card class="surface-card" shadow="never">
      <template #header><div class="table-header"><strong class="table-header__title">房源资产</strong><span class="muted-text">共 {{ filteredList.length }} 套</span></div></template>
      <el-table v-loading="loading" :data="pagedList" border empty-text="暂无房源数据">
        <el-table-column label="房源" min-width="260" fixed="left">
          <template #default="{ row }">
            <div class="house-cell">
              <el-image class="house-cover" :src="row.coverImage" fit="cover"><template #error><div class="image-fallback"><el-icon><OfficeBuilding /></el-icon></div></template></el-image>
              <div><strong>{{ row.title }}</strong><span>{{ row.location || '-' }} · {{ row.roomType || '户型未填' }}</span><small>ID {{ row.id }}</small></div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="月租" width="130"><template #default="{ row }"><span class="currency-text">{{ formatFenCurrency(row.price) }}</span></template></el-table-column>
        <el-table-column prop="area" label="面积(㎡)" width="100" />
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="statusMap[row.status]?.type || 'info'" size="small">{{ statusMap[row.status]?.label || row.status }}</el-tag></template></el-table-column>
        <el-table-column label="智能门锁" width="150">
          <template #default="{ row }">
            <el-button
              v-if="row.smartLockBound && row.lockDevice"
              link
              type="primary"
              @click="openLockDrawer(row.lockDevice)"
            >
              {{ row.lockDevice.lockName || '已绑定' }}
            </el-button>
            <el-tooltip
              v-else-if="row.smartLockBound"
              content="房源已绑定门锁，但接口未返回门锁摘要"
              placement="top"
            >
              <el-tag type="success" size="small">已绑定</el-tag>
            </el-tooltip>
            <el-tag v-else :type="row.isSmartLockSupported ? 'warning' : 'info'" size="small">
              {{ row.isSmartLockSupported ? '待绑定' : '不支持' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="viewCount" label="浏览" width="90" sortable />
        <el-table-column prop="favoriteCount" label="收藏" width="90" sortable />
        <el-table-column label="录入时间" width="175"><template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template></el-table-column>
        <el-table-column label="操作" width="100" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openHouseDrawer(row)">查看</el-button></template></el-table-column>
      </el-table>
      <div class="pagination-wrapper"><el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize" :total="filteredList.length" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" /></div>
    </el-card>

    <el-drawer v-model="houseDrawerVisible" title="房源详情" size="min(560px, 92vw)">
      <template v-if="currentHouse">
        <el-image class="detail-cover" :src="currentHouse.coverImage" fit="cover" />
        <h2 class="detail-title">{{ currentHouse.title }}</h2>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="房源 ID">{{ currentHouse.id }}</el-descriptions-item>
          <el-descriptions-item label="位置">{{ currentHouse.location }} {{ currentHouse.address }}</el-descriptions-item>
          <el-descriptions-item label="房间">{{ currentHouse.building }} {{ currentHouse.unit }} {{ currentHouse.room }}</el-descriptions-item>
          <el-descriptions-item label="户型面积">{{ currentHouse.roomType || '-' }} · {{ currentHouse.area || '-' }}㎡</el-descriptions-item>
          <el-descriptions-item label="月租押金">{{ formatFenCurrency(currentHouse.price) }} / 押金 {{ formatFenCurrency(currentHouse.deposit) }}</el-descriptions-item>
          <el-descriptions-item label="付款方式">{{ currentHouse.paymentMethod || '-' }}</el-descriptions-item>
          <el-descriptions-item label="房东 ID">{{ currentHouse.landlordId }}</el-descriptions-item>
          <el-descriptions-item label="房源说明">{{ currentHouse.description || '-' }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>

    <el-drawer v-model="lockDrawerVisible" title="绑定门锁" size="420px">
      <el-descriptions v-if="currentLock" :column="1" border>
        <el-descriptions-item label="门锁名称">{{ currentLock.lockName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="品牌">{{ currentLock.lockBrand || '-' }}</el-descriptions-item>
        <el-descriptions-item label="序列号">{{ currentLock.lockSn || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ currentLock.lockStatus || '-' }}</el-descriptions-item>
        <el-descriptions-item label="电量"><el-progress v-if="currentLock.batteryLevel != null" :percentage="currentLock.batteryLevel" :status="currentLock.batteryLevel < 20 ? 'exception' : undefined" /><span v-else>-</span></el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
.house-cell { display: flex; align-items: center; gap: 11px; min-width: 0; }
.house-cover { width: 64px; height: 48px; flex: none; border-radius: 4px; background: #edf1ef; }
.image-fallback { display: grid; width: 100%; height: 100%; place-items: center; color: #8a9690; }
.house-cell > div:last-child { display: flex; min-width: 0; flex-direction: column; }
.house-cell strong, .house-cell span, .house-cell small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.house-cell strong { font-size: 13px; }.house-cell span { margin-top: 3px; color: #66736d; font-size: 12px; }.house-cell small { margin-top: 2px; color: #9aa49f; font-size: 10px; }
.detail-cover { width: 100%; aspect-ratio: 16 / 9; border-radius: 6px; background: #eef2f0; }.detail-title { margin: 16px 0; font-size: 20px; letter-spacing: 0; }
</style>
