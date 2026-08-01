<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { OfficeBuilding, Plus, Refresh, Search } from '@element-plus/icons-vue'

import PageHeader from '@/components/PageHeader.vue'
import {
  downloadPropertyCertificate,
  getHouseList,
  getPropertyCertificateHistory,
  offlineHouse,
  onlineHouse,
  publishHouse,
  reviewLandlordHouse,
  type HouseItem,
  type LockDeviceView,
  type PropertyCertificateView,
} from '@/api/house'
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
const publishingIds = ref<Set<string>>(new Set())
const offliningIds = ref<Set<string>>(new Set())
const onliningIds = ref<Set<string>>(new Set())
const certificateLoading = ref(false)
const certificateHistory = ref<PropertyCertificateView[]>([])
const certificatePreviewUrl = ref('')
const reviewingIds = ref<Set<string>>(new Set())

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '待审核', value: 'pendingReview' },
  { label: '审核驳回', value: 'rejected' },
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
  pendingReview: { label: '待审核', type: 'warning' },
  rejected: { label: '审核驳回', type: 'danger' },
  available: { label: '可租', type: 'success' },
  reserved: { label: '已被预定', type: 'warning' },
  rented: { label: '已租', type: 'danger' },
  offline: { label: '下架', type: 'info' },
}
const sourceMap: Record<HouseItem['sourceType'], { label: string; type: 'primary' | 'success' }> = {
  PLATFORM: { label: '平台自营', type: 'primary' },
  LANDLORD: { label: '个人房源', type: 'success' },
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
async function openHouseDrawer(house: HouseItem) {
  currentHouse.value = house
  houseDrawerVisible.value = true
  certificateHistory.value = []
  releaseCertificatePreview()
  certificateLoading.value = true
  try {
    certificateHistory.value = await getPropertyCertificateHistory(house.id)
    const current = certificateHistory.value.find((item) => item.current)
    if (current) await showCertificate(current)
  } finally {
    certificateLoading.value = false
  }
}
function openLockDrawer(lock: LockDeviceView) { currentLock.value = lock; lockDrawerVisible.value = true }
function openEditPage(house: HouseItem) {
  router.push(`/houses/${house.id}/edit`)
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
  await ElMessageBox.confirm(`确认下架房源”${house.title}”吗？下架后将不再对外展示。`, '下架房源', {
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

async function handleOnline(house: HouseItem) {
  await ElMessageBox.confirm(`确认重新上架房源”${house.title}”吗？上架后将恢复对外展示。`, '上架房源', {
    type: 'warning',
    confirmButtonText: '确认上架',
    cancelButtonText: '取消',
  })
  onliningIds.value = new Set(onliningIds.value).add(house.id)
  try {
    await onlineHouse(house.id)
    ElMessage.success('房源已上架')
    await fetchHouseList()
  } finally {
    const nextIds = new Set(onliningIds.value)
    nextIds.delete(house.id)
    onliningIds.value = nextIds
  }
}

function releaseCertificatePreview() {
  if (certificatePreviewUrl.value) {
    URL.revokeObjectURL(certificatePreviewUrl.value)
    certificatePreviewUrl.value = ''
  }
}

async function showCertificate(certificate: PropertyCertificateView) {
  const house = currentHouse.value
  if (!house) return
  certificateLoading.value = true
  releaseCertificatePreview()
  try {
    const blob = await downloadPropertyCertificate(house.id, certificate.id)
    certificatePreviewUrl.value = URL.createObjectURL(blob)
  } finally {
    certificateLoading.value = false
  }
}

async function handleApprove(house: HouseItem) {
  await ElMessageBox.confirm(`确认通过房源“${house.title}”的审核吗？通过后将立即对租客公开。`, '审核通过', {
    type: 'warning',
    confirmButtonText: '确认通过',
    cancelButtonText: '取消',
  })
  reviewingIds.value = new Set(reviewingIds.value).add(house.id)
  try {
    await reviewLandlordHouse(house.id, { action: 'APPROVE' })
    ElMessage.success('房源审核已通过')
    houseDrawerVisible.value = false
    await fetchHouseList()
  } finally {
    const nextIds = new Set(reviewingIds.value)
    nextIds.delete(house.id)
    reviewingIds.value = nextIds
  }
}

async function handleReject(house: HouseItem) {
  const { value } = await ElMessageBox.prompt('请填写驳回原因，房东修改后可重新提交。', '驳回房源', {
    type: 'warning',
    inputType: 'textarea',
    inputPlaceholder: '例如：房产证照片模糊，无法核对权属信息',
    inputValidator: (input) => input.trim().length > 0 || '驳回原因不能为空',
    confirmButtonText: '确认驳回',
    cancelButtonText: '取消',
  })
  reviewingIds.value = new Set(reviewingIds.value).add(house.id)
  try {
    await reviewLandlordHouse(house.id, { action: 'REJECT', remark: value.trim() })
    ElMessage.success('房源已驳回')
    houseDrawerVisible.value = false
    await fetchHouseList()
  } finally {
    const nextIds = new Set(reviewingIds.value)
    nextIds.delete(house.id)
    reviewingIds.value = nextIds
  }
}

onMounted(fetchHouseList)
onBeforeUnmount(releaseCertificatePreview)
</script>

<template>
  <div class="page-container">
    <PageHeader title="房源列表" description="统一查看房源基础资料、运营状态和门锁绑定情况。">
      <template #actions>
        <el-button :icon="Refresh" @click="fetchHouseList">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="router.push('/houses/create')">新增房源</el-button>
      </template>
    </PageHeader>


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
        <el-table-column label="房源来源" width="110">
          <template #default="{ row }">
            <el-tag :type="sourceMap[row.sourceType]?.type || 'info'" size="small">
              {{ sourceMap[row.sourceType]?.label || '未知来源' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="房产证" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.propertyCertificate" :type="row.propertyCertificate.auditStatus === 'approved' ? 'success' : row.propertyCertificate.auditStatus === 'rejected' ? 'danger' : 'warning'" size="small">
              {{ row.propertyCertificate.auditStatus === 'approved' ? '已通过' : row.propertyCertificate.auditStatus === 'rejected' ? '已驳回' : '待审核' }}
            </el-tag>
            <span v-else class="muted-text">未上传</span>
          </template>
        </el-table-column>
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
        <el-table-column label="操作" width="270" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openHouseDrawer(row)">查看</el-button>
            <el-button link type="primary" @click="openEditPage(row)">编辑</el-button>
            <el-button
              v-if="row.status === 'pendingReview'"
              link
              type="danger"
              :loading="reviewingIds.has(row.id)"
              @click="openHouseDrawer(row)"
            >
              审核
            </el-button>
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
            <el-button
              v-if="row.status === 'offline'"
              link
              type="success"
              :loading="onliningIds.has(row.id)"
              @click="handleOnline(row)"
            >
              上架
            </el-button>
          </template>
        </el-table-column>
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
          <el-descriptions-item label="房源来源">
            <el-tag :type="sourceMap[currentHouse.sourceType]?.type || 'info'" size="small">
              {{ sourceMap[currentHouse.sourceType]?.label || '未知来源' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="房东 ID">{{ currentHouse.landlordId }}</el-descriptions-item>
          <el-descriptions-item label="审核状态">{{ statusMap[currentHouse.status]?.label || currentHouse.status }}</el-descriptions-item>
          <el-descriptions-item label="房源说明">{{ currentHouse.description || '-' }}</el-descriptions-item>
        </el-descriptions>
        <section class="certificate-section">
          <div class="certificate-section__header">
            <h3>房产证明材料</h3>
            <el-tag v-if="currentHouse.propertyCertificate" :type="currentHouse.propertyCertificate.auditStatus === 'approved' ? 'success' : currentHouse.propertyCertificate.auditStatus === 'rejected' ? 'danger' : 'warning'">
              {{ currentHouse.propertyCertificate.auditStatus === 'approved' ? '已通过' : currentHouse.propertyCertificate.auditStatus === 'rejected' ? '已驳回' : '待审核' }}
            </el-tag>
          </div>
          <div v-loading="certificateLoading" class="certificate-preview">
            <el-image v-if="certificatePreviewUrl" :src="certificatePreviewUrl" fit="contain" :preview-src-list="[certificatePreviewUrl]" />
            <el-empty v-else description="尚未上传房产证" :image-size="72" />
          </div>
          <el-table v-if="certificateHistory.length" :data="certificateHistory" size="small" border>
            <el-table-column prop="originalName" label="文件" min-width="150" show-overflow-tooltip />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">{{ row.auditStatus === 'approved' ? '已通过' : row.auditStatus === 'rejected' ? '已驳回' : '待审核' }}</template>
            </el-table-column>
            <el-table-column label="上传时间" width="165"><template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template></el-table-column>
            <el-table-column label="操作" width="72"><template #default="{ row }"><el-button link type="primary" @click="showCertificate(row)">查看</el-button></template></el-table-column>
          </el-table>
          <el-alert
            v-if="currentHouse.propertyCertificate?.reviewRemark"
            class="certificate-remark"
            type="error"
            :closable="false"
            :title="`驳回原因：${currentHouse.propertyCertificate.reviewRemark}`"
          />
          <div v-if="currentHouse.status === 'pendingReview'" class="certificate-actions">
            <el-button type="danger" plain :loading="reviewingIds.has(currentHouse.id)" @click="handleReject(currentHouse)">驳回</el-button>
            <el-button type="success" :loading="reviewingIds.has(currentHouse.id)" @click="handleApprove(currentHouse)">审核通过并上架</el-button>
          </div>
        </section>
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
.certificate-section { margin-top: 22px; }
.certificate-section__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.certificate-section__header h3 { margin: 0; font-size: 16px; }
.certificate-preview { display: grid; min-height: 220px; place-items: center; overflow: hidden; border: 1px solid #dfe7e3; border-radius: 6px; background: #f7f9f8; }
.certificate-preview .el-image { width: 100%; height: 360px; }
.certificate-section .el-table { margin-top: 12px; }
.certificate-remark { margin-top: 12px; }
.certificate-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
</style>
