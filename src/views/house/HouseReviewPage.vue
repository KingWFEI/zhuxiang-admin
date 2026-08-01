<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { OfficeBuilding, Refresh, Search, View } from '@element-plus/icons-vue'

import PageHeader from '@/components/PageHeader.vue'
import {
  downloadPropertyCertificate,
  getHouseList,
  getPropertyCertificateHistory,
  reviewLandlordHouse,
  type HouseItem,
  type PropertyCertificateView,
} from '@/api/house'
import { formatDateTime, formatFenCurrency } from '@/utils/format'

const loading = ref(false)
const keyword = ref('')
const pendingHouses = ref<HouseItem[]>([])
const reviewingIds = ref<Set<string>>(new Set())
const drawerVisible = ref(false)
const currentHouse = ref<HouseItem | null>(null)
const certificateLoading = ref(false)
const certificateHistory = ref<PropertyCertificateView[]>([])
const certificatePreviewUrl = ref('')

const filteredHouses = computed(() => {
  const value = keyword.value.trim().toLowerCase()
  if (!value) return pendingHouses.value
  return pendingHouses.value.filter((house) =>
    [house.title, house.location, house.address, house.landlordId].some((field) =>
      field?.toLowerCase().includes(value),
    ),
  )
})

async function fetchPendingHouses() {
  loading.value = true
  try {
    const houses = await getHouseList()
    pendingHouses.value = houses.filter((house) => house.status === 'pendingReview')
  } finally {
    loading.value = false
  }
}

function releaseCertificatePreview() {
  if (!certificatePreviewUrl.value) return
  URL.revokeObjectURL(certificatePreviewUrl.value)
  certificatePreviewUrl.value = ''
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

async function openReviewDrawer(house: HouseItem) {
  currentHouse.value = house
  drawerVisible.value = true
  certificateHistory.value = []
  releaseCertificatePreview()
  certificateLoading.value = true
  try {
    certificateHistory.value = await getPropertyCertificateHistory(house.id)
    const current =
      certificateHistory.value.find((certificate) => certificate.current) ??
      certificateHistory.value[0]
    if (current) await showCertificate(current)
  } finally {
    certificateLoading.value = false
  }
}

function setReviewing(houseId: string, reviewing: boolean) {
  const next = new Set(reviewingIds.value)
  if (reviewing) next.add(houseId)
  else next.delete(houseId)
  reviewingIds.value = next
}

async function approveHouse(house: HouseItem) {
  await ElMessageBox.confirm(
    `确认通过房源“${house.title}”的审核吗？通过后将立即在租客端公开。`,
    '审核通过',
    {
      type: 'warning',
      confirmButtonText: '审核通过并上架',
      cancelButtonText: '取消',
    },
  )
  setReviewing(house.id, true)
  try {
    await reviewLandlordHouse(house.id, { action: 'APPROVE' })
    ElMessage.success('房源审核已通过并上架')
    if (currentHouse.value?.id === house.id) drawerVisible.value = false
    await fetchPendingHouses()
  } finally {
    setReviewing(house.id, false)
  }
}

async function rejectHouse(house: HouseItem) {
  const { value } = await ElMessageBox.prompt(
    '请填写具体驳回原因，房东修改材料或房源信息后可以重新提交。',
    '驳回房源',
    {
      type: 'warning',
      inputType: 'textarea',
      inputPlaceholder: '例如：房产证照片模糊，无法核对房屋权属信息',
      inputValidator: (input) => input.trim().length > 0 || '驳回原因不能为空',
      confirmButtonText: '确认驳回',
      cancelButtonText: '取消',
    },
  )
  setReviewing(house.id, true)
  try {
    await reviewLandlordHouse(house.id, {
      action: 'REJECT',
      remark: value.trim(),
    })
    ElMessage.success('房源已驳回，原因将展示给房东')
    if (currentHouse.value?.id === house.id) drawerVisible.value = false
    await fetchPendingHouses()
  } finally {
    setReviewing(house.id, false)
  }
}

onMounted(fetchPendingHouses)
onBeforeUnmount(releaseCertificatePreview)
</script>

<template>
  <div class="page-container">
    <PageHeader
      title="房源审核"
      description="核验房东提交的房产证明和房源资料；审核通过后房源才会在租客端公开。"
    >
      <template #actions>
        <el-button :icon="Refresh" :loading="loading" @click="fetchPendingHouses">
          刷新队列
        </el-button>
      </template>
    </PageHeader>

    <section class="review-overview">
      <div class="review-overview__number">{{ pendingHouses.length }}</div>
      <div>
        <strong>待审核房源</strong>
        <p>包括首次发布及下架后重新提交的房源</p>
      </div>
    </section>

    <el-card class="surface-card" shadow="never">
      <div class="toolbar">
        <el-input
          v-model="keyword"
          clearable
          :prefix-icon="Search"
          placeholder="搜索房源标题、位置或房东 ID"
        />
        <span class="muted-text">当前显示 {{ filteredHouses.length }} 条</span>
      </div>

      <el-table
        v-loading="loading"
        :data="filteredHouses"
        border
        empty-text="暂无待审核房源"
      >
        <el-table-column label="房源" min-width="260">
          <template #default="{ row }">
            <div class="house-cell">
              <el-image class="house-cover" :src="row.coverImage" fit="cover">
                <template #error>
                  <div class="image-fallback">
                    <el-icon><OfficeBuilding /></el-icon>
                  </div>
                </template>
              </el-image>
              <div class="house-copy">
                <strong>{{ row.title }}</strong>
                <span>{{ row.location || '-' }} {{ row.address || '' }}</span>
                <small>ID {{ row.id }}</small>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="房东" min-width="170">
          <template #default="{ row }">
            <span class="id-text">{{ row.landlordId || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="租金 / 押金" width="190">
          <template #default="{ row }">
            <div class="money-cell">
              <strong>{{ formatFenCurrency(row.price) }}</strong>
              <span>押金 {{ formatFenCurrency(row.deposit) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="付款方式" width="120">
          <template #default="{ row }">{{ row.paymentMethod || '-' }}</template>
        </el-table-column>
        <el-table-column label="房产证明" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.propertyCertificate" type="warning" size="small">待核验</el-tag>
            <el-tag v-else type="danger" size="small">缺少材料</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="175">
          <template #default="{ row }">
            {{ formatDateTime(row.propertyCertificate?.submittedAt || row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="View" @click="openReviewDrawer(row)">
              查看材料
            </el-button>
            <el-button
              link
              type="danger"
              :loading="reviewingIds.has(row.id)"
              @click="rejectHouse(row)"
            >
              驳回
            </el-button>
            <el-button
              link
              type="success"
              :loading="reviewingIds.has(row.id)"
              @click="approveHouse(row)"
            >
              通过
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer
      v-model="drawerVisible"
      title="审核房源资料"
      size="min(680px, 94vw)"
      destroy-on-close
    >
      <template v-if="currentHouse">
        <div class="drawer-heading">
          <el-image class="drawer-cover" :src="currentHouse.coverImage" fit="cover" />
          <div>
            <el-tag type="warning" size="small">待审核</el-tag>
            <h2>{{ currentHouse.title }}</h2>
            <p>{{ currentHouse.location || '-' }} {{ currentHouse.address || '' }}</p>
          </div>
        </div>

        <el-descriptions :column="2" border>
          <el-descriptions-item label="房东 ID" :span="2">
            {{ currentHouse.landlordId || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="月租">
            {{ formatFenCurrency(currentHouse.price) }}
          </el-descriptions-item>
          <el-descriptions-item label="押金">
            {{ formatFenCurrency(currentHouse.deposit) }}
          </el-descriptions-item>
          <el-descriptions-item label="付款方式">
            {{ currentHouse.paymentMethod || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="户型面积">
            {{ currentHouse.roomType || '-' }} / {{ currentHouse.area || '-' }}㎡
          </el-descriptions-item>
          <el-descriptions-item label="门牌信息" :span="2">
            {{ currentHouse.building || '' }} {{ currentHouse.unit || '' }}
            {{ currentHouse.room || '' }}
          </el-descriptions-item>
          <el-descriptions-item label="房源说明" :span="2">
            {{ currentHouse.description || '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <section class="certificate-section">
          <div class="section-heading">
            <div>
              <h3>房产证明材料</h3>
              <p>请核对证件内容、房屋地址与发布人权属信息。</p>
            </div>
            <el-tag
              v-if="currentHouse.propertyCertificate"
              type="warning"
              effect="plain"
            >
              待核验
            </el-tag>
          </div>

          <div v-loading="certificateLoading" class="certificate-preview">
            <el-image
              v-if="certificatePreviewUrl"
              :src="certificatePreviewUrl"
              fit="contain"
              :preview-src-list="[certificatePreviewUrl]"
              preview-teleported
            />
            <el-empty v-else description="未读取到房产证明材料" :image-size="76" />
          </div>

          <el-table
            v-if="certificateHistory.length"
            :data="certificateHistory"
            size="small"
            border
          >
            <el-table-column prop="originalName" label="历史文件" min-width="180" show-overflow-tooltip />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                {{
                  row.auditStatus === 'approved'
                    ? '已通过'
                    : row.auditStatus === 'rejected'
                      ? '已驳回'
                      : '待审核'
                }}
              </template>
            </el-table-column>
            <el-table-column label="提交时间" width="170">
              <template #default="{ row }">
                {{ formatDateTime(row.submittedAt || row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="70">
              <template #default="{ row }">
                <el-button link type="primary" @click="showCertificate(row)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>

        <div class="drawer-actions">
          <el-button
            type="danger"
            plain
            :loading="reviewingIds.has(currentHouse.id)"
            @click="rejectHouse(currentHouse)"
          >
            驳回并填写原因
          </el-button>
          <el-button
            type="success"
            :loading="reviewingIds.has(currentHouse.id)"
            :disabled="!currentHouse.propertyCertificate"
            @click="approveHouse(currentHouse)"
          >
            审核通过并上架
          </el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
.review-overview {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 22px;
  border: 1px solid #dce8e2;
  border-radius: 8px;
  background: linear-gradient(120deg, #f4fbf7, #fff);
}

.review-overview__number {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border-radius: 8px;
  background: #176b4d;
  color: #fff;
  font-size: 24px;
  font-weight: 700;
}

.review-overview strong {
  color: #1d2a25;
  font-size: 16px;
}

.review-overview p,
.section-heading p,
.drawer-heading p {
  margin: 4px 0 0;
  color: #74817b;
  font-size: 12px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.toolbar .el-input {
  width: min(420px, 100%);
}

.house-cell,
.drawer-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.house-cover {
  width: 68px;
  height: 50px;
  flex: none;
  border-radius: 5px;
  background: #edf1ef;
}

.image-fallback {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: #8a9690;
}

.house-copy,
.money-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.house-copy strong,
.house-copy span,
.house-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.house-copy span,
.money-cell span {
  margin-top: 3px;
  color: #6f7c76;
  font-size: 12px;
}

.house-copy small,
.id-text {
  margin-top: 2px;
  color: #929e98;
  font-size: 11px;
}

.drawer-heading {
  margin-bottom: 18px;
  align-items: flex-start;
}

.drawer-cover {
  width: 144px;
  height: 94px;
  flex: none;
  border-radius: 7px;
  background: #edf1ef;
}

.drawer-heading h2 {
  margin: 8px 0 0;
  font-size: 20px;
}

.certificate-section {
  margin-top: 24px;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.section-heading h3 {
  margin: 0;
  font-size: 16px;
}

.certificate-preview {
  display: grid;
  min-height: 320px;
  place-items: center;
  overflow: hidden;
  border: 1px solid #dfe7e3;
  border-radius: 7px;
  background: #f7f9f8;
}

.certificate-preview .el-image {
  width: 100%;
  height: 420px;
}

.certificate-section .el-table {
  margin-top: 12px;
}

.drawer-actions {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin: 24px -20px -20px;
  padding: 16px 20px;
  border-top: 1px solid #e3e9e6;
  background: rgb(255 255 255 / 96%);
}

@media (max-width: 720px) {
  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .drawer-heading {
    flex-direction: column;
  }

  .drawer-cover {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
  }
}
</style>
