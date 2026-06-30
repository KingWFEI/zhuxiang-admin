<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { OfficeBuilding, Plus, Refresh, Search } from '@element-plus/icons-vue'
import DataSourceNotice from '@/components/DataSourceNotice.vue'
import PageHeader from '@/components/PageHeader.vue'
import { getHouseList, offlineHouse, publishHouse, updateHouse, type HouseItem, type LockDeviceView, type UpdateHouseRequest } from '@/api/house'
import { formatDateTime, formatFenCurrency } from '@/utils/format'

interface EditHouseForm {
  title: string
  location: string
  communityId: string
  landlordId: string
  rentType: string
  price: number | undefined
  deposit: number | undefined
  paymentMethod: string
  address: string
  building: string
  unit: string
  room: string
  roomType: string
  area: number | undefined
  floor: string
  orientation: string
  decoration: string
  availableDate: string
  metro: string
  coverImage: string
  imageUrlsText: string
  description: string
  isSmartLockSupported: boolean
  isSelfViewingSupported: boolean
}

const router = useRouter()
const loading = ref(false)
const houseList = ref<HouseItem[]>([])
const houseDrawerVisible = ref(false)
const currentHouse = ref<HouseItem | null>(null)
const lockDrawerVisible = ref(false)
const currentLock = ref<LockDeviceView | null>(null)
const editDialogVisible = ref(false)
const editingHouse = ref<HouseItem | null>(null)
const updating = ref(false)
const searchForm = reactive({ keyword: '', status: '', rentType: '' })
const pagination = reactive({ page: 1, pageSize: 10 })
const publishingIds = ref<Set<string>>(new Set())
const offliningIds = ref<Set<string>>(new Set())
const editForm = reactive<EditHouseForm>({
  title: '',
  location: '',
  communityId: '',
  landlordId: '',
  rentType: '',
  price: undefined,
  deposit: undefined,
  paymentMethod: '',
  address: '',
  building: '',
  unit: '',
  room: '',
  roomType: '',
  area: undefined,
  floor: '',
  orientation: '',
  decoration: '',
  availableDate: '',
  metro: '',
  coverImage: '',
  imageUrlsText: '',
  description: '',
  isSmartLockSupported: false,
  isSelfViewingSupported: false,
})

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '可租', value: 'available' },
  { label: '已被预定', value: 'reserved' },
  { label: '已租', value: 'rented' },
  { label: '下架', value: 'offline' },
]
const rentTypeOptions = [
  { label: '长租', value: 'long_rent' },
  { label: '短租', value: 'short_rent' },
  { label: '民宿', value: 'homestay' },
  { label: '推荐', value: 'recommended' },
]
const statusMap: Record<string, { label: string; type: 'success' | 'warning' | 'info' | 'danger' }> = {
  draft: { label: '草稿', type: 'info' },
  available: { label: '可租', type: 'success' },
  reserved: { label: '已被预定', type: 'warning' },
  rented: { label: '已租', type: 'danger' },
  offline: { label: '下架', type: 'info' },
}

const filteredList = computed(() => {
  const keyword = searchForm.keyword.trim().toLowerCase()
  return houseList.value.filter((house) => {
    const matchesKeyword = !keyword || [house.title, house.location, house.address, house.roomType].some((value) => value?.toLowerCase().includes(keyword))
    const matchesStatus = !searchForm.status || house.status === searchForm.status
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
function openEditDialog(house: HouseItem) {
  editingHouse.value = house
  Object.assign(editForm, {
    title: house.title || '',
    location: house.location || '',
    communityId: house.communityId || '',
    landlordId: house.landlordId || '',
    rentType: house.rentType || '',
    price: house.price == null ? undefined : house.price / 100,
    deposit: house.deposit == null ? undefined : house.deposit / 100,
    paymentMethod: house.paymentMethod || '',
    address: house.address || '',
    building: house.building || '',
    unit: house.unit || '',
    room: house.room || '',
    roomType: house.roomType || '',
    area: house.area ?? undefined,
    floor: house.floor || '',
    orientation: house.orientation || '',
    decoration: house.decoration || '',
    availableDate: house.availableDate || '',
    metro: house.metro || '',
    coverImage: house.coverImage || '',
    imageUrlsText: (house.imageUrls || []).join('\n'),
    description: house.description || '',
    isSmartLockSupported: house.isSmartLockSupported,
    isSelfViewingSupported: house.isSelfViewingSupported,
  })
  editDialogVisible.value = true
}

function buildUpdatePayload(): UpdateHouseRequest {
  const imageUrls = editForm.imageUrlsText
    .split(/[\n,，]/)
    .map((url) => url.trim())
    .filter(Boolean)
  const payload: UpdateHouseRequest = {
    title: editForm.title.trim(),
    location: editForm.location.trim(),
    communityId: editForm.communityId.trim(),
    landlordId: editForm.landlordId.trim(),
    rentType: editForm.rentType,
    price: editForm.price == null ? undefined : Math.round(editForm.price * 100),
    deposit: editForm.deposit == null ? undefined : Math.round(editForm.deposit * 100),
    paymentMethod: editForm.paymentMethod.trim(),
    address: editForm.address.trim(),
    building: editForm.building.trim(),
    unit: editForm.unit.trim(),
    room: editForm.room.trim(),
    roomType: editForm.roomType.trim(),
    area: editForm.area,
    floor: editForm.floor.trim(),
    orientation: editForm.orientation.trim(),
    decoration: editForm.decoration.trim(),
    availableDate: editForm.availableDate,
    metro: editForm.metro.trim(),
    coverImage: editForm.coverImage.trim(),
    imageUrls: imageUrls.length ? imageUrls : undefined,
    description: editForm.description.trim(),
    isSmartLockSupported: editForm.isSmartLockSupported,
    isSelfViewingSupported: editForm.isSelfViewingSupported,
  }

  Object.keys(payload).forEach((key) => {
    const value = payload[key as keyof UpdateHouseRequest]
    if (value === '' || value == null) delete payload[key as keyof UpdateHouseRequest]
  })
  return payload
}

async function handleUpdateHouse() {
  if (!editingHouse.value || updating.value) return
  const payload = buildUpdatePayload()
  if (!Object.keys(payload).length) return ElMessage.warning('请至少填写一项修改内容')

  updating.value = true
  try {
    await updateHouse(editingHouse.value.id, payload)
    ElMessage.success('房源已更新')
    editDialogVisible.value = false
    await fetchHouseList()
  } finally {
    updating.value = false
  }
}

async function handlePublish(house: HouseItem) {
  await ElMessageBox.confirm(`确认发布房源“${house.title}”吗？`, '发布房源', {
    type: 'warning',
    confirmButtonText: '确认发布',
    cancelButtonText: '取消',
  })
  publishingIds.value = new Set(publishingIds.value).add(house.id)
  try {
    await publishHouse(house.id)
    ElMessage.success('房源已发布')
    await fetchHouseList()
  } finally {
    const nextIds = new Set(publishingIds.value)
    nextIds.delete(house.id)
    publishingIds.value = nextIds
  }
}

async function handleOffline(house: HouseItem) {
  await ElMessageBox.confirm(`确认下架房源“${house.title}”吗？下架后将不再对外展示。`, '下架房源', {
    type: 'warning',
    confirmButtonText: '确认下架',
    cancelButtonText: '取消',
  })
  offliningIds.value = new Set(offliningIds.value).add(house.id)
  try {
    await offlineHouse(house.id)
    ElMessage.success('房源已下架')
    await fetchHouseList()
  } finally {
    const nextIds = new Set(offliningIds.value)
    nextIds.delete(house.id)
    offliningIds.value = nextIds
  }
}

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
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openHouseDrawer(row)">查看</el-button>
            <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
            <el-button
              v-if="row.status === 'draft'"
              link
              type="success"
              :loading="publishingIds.has(row.id)"
              @click="handlePublish(row)"
            >
              发布
            </el-button>
            <el-button
              v-if="row.status === 'draft' || row.status === 'available'"
              link
              type="warning"
              :loading="offliningIds.has(row.id)"
              @click="handleOffline(row)"
            >
              下架
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper"><el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize" :total="filteredList.length" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" /></div>
    </el-card>

    <el-dialog v-model="editDialogVisible" title="编辑房源" width="min(760px, 92vw)">
      <el-form :model="editForm" label-position="top">
        <div class="edit-form-grid">
          <el-form-item label="房源标题"><el-input v-model="editForm.title" maxlength="80" show-word-limit /></el-form-item>
          <el-form-item label="租赁类型">
            <el-select v-model="editForm.rentType" clearable>
              <el-option v-for="item in rentTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="月租金（元）"><el-input-number v-model="editForm.price" :min="0" :max="1000000" :step="100" controls-position="right" /></el-form-item>
          <el-form-item label="押金（元）"><el-input-number v-model="editForm.deposit" :min="0" :max="1000000" :step="100" controls-position="right" /></el-form-item>
          <el-form-item label="区域或商圈"><el-input v-model="editForm.location" /></el-form-item>
          <el-form-item label="小区 ID"><el-input v-model="editForm.communityId" /></el-form-item>
          <el-form-item label="详细地址" class="span-two"><el-input v-model="editForm.address" /></el-form-item>
          <el-form-item label="楼栋"><el-input v-model="editForm.building" /></el-form-item>
          <el-form-item label="单元"><el-input v-model="editForm.unit" /></el-form-item>
          <el-form-item label="房号"><el-input v-model="editForm.room" /></el-form-item>
          <el-form-item label="楼层"><el-input v-model="editForm.floor" /></el-form-item>
          <el-form-item label="户型"><el-input v-model="editForm.roomType" /></el-form-item>
          <el-form-item label="面积（㎡）"><el-input-number v-model="editForm.area" :min="0" :precision="1" controls-position="right" /></el-form-item>
          <el-form-item label="朝向"><el-input v-model="editForm.orientation" /></el-form-item>
          <el-form-item label="装修"><el-input v-model="editForm.decoration" /></el-form-item>
          <el-form-item label="可入住日期"><el-date-picker v-model="editForm.availableDate" type="date" value-format="YYYY-MM-DD" clearable /></el-form-item>
          <el-form-item label="付款方式"><el-input v-model="editForm.paymentMethod" /></el-form-item>
          <el-form-item label="地铁信息"><el-input v-model="editForm.metro" /></el-form-item>
          <el-form-item label="房东用户 ID"><el-input v-model="editForm.landlordId" /></el-form-item>
          <el-form-item label="封面图 URL" class="span-two"><el-input v-model="editForm.coverImage" /></el-form-item>
          <el-form-item label="房源图片 URL 列表" class="span-two">
            <el-input v-model="editForm.imageUrlsText" type="textarea" :rows="3" placeholder="多个图片 URL 可换行或用逗号分隔" />
          </el-form-item>
          <el-form-item label="房源说明" class="span-two"><el-input v-model="editForm.description" type="textarea" :rows="4" maxlength="1000" show-word-limit /></el-form-item>
          <el-form-item label="智能能力" class="span-two">
            <div class="edit-switches">
              <el-checkbox v-model="editForm.isSmartLockSupported">支持智能门锁</el-checkbox>
              <el-checkbox v-model="editForm.isSelfViewingSupported">支持自助看房</el-checkbox>
            </div>
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="updating" @click="handleUpdateHouse">保存</el-button>
      </template>
    </el-dialog>

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
.edit-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
.edit-form-grid .span-two { grid-column: 1 / -1; }
.edit-form-grid :deep(.el-select), .edit-form-grid :deep(.el-input-number), .edit-form-grid :deep(.el-date-editor) { width: 100%; }
.edit-switches { display: flex; flex-wrap: wrap; gap: 16px; }
@media (max-width: 640px) { .edit-form-grid { grid-template-columns: 1fr; }.edit-form-grid .span-two { grid-column: auto; } }
</style>
