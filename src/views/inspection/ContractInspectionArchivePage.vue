<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Check, Refresh } from '@element-plus/icons-vue'

import PageHeader from '@/components/PageHeader.vue'
import {
  getContractInspectionComparison,
  lockContractInspection,
  type InspectionComparison,
  type InspectionComparisonItem,
  type InspectionPhoto,
  type InspectionStatus,
} from '@/api/inspection'
import { formatDateTime, maskPhone } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const contractId = String(route.params.contractId || '')

const loading = ref(false)
const locking = ref(false)
const detail = ref<InspectionComparison | null>(null)

const statusMap: Record<InspectionStatus, { label: string; type: 'info' | 'warning' | 'success' }> = {
  DRAFT: { label: '照片尚未提交', type: 'info' },
  SUBMITTED: { label: '照片已提交，等待管理端归档', type: 'warning' },
  LOCKED: { label: '已确认线下验房完成，证据已归档', type: 'success' },
}

const archiveInfo = computed(() => {
  const value = detail.value
  if (!value) return null
  return {
    lockedBy: value.archive?.lockedByName || value.archive?.lockedBy || value.lockedByName || value.lockedBy || '-',
    lockedAt: value.archive?.lockedAt || value.lockedAt || '',
    comment: value.archive?.comment || value.lockComment || '',
  }
})

async function fetchDetail() {
  loading.value = true
  try {
    detail.value = await getContractInspectionComparison(contractId)
  } finally {
    loading.value = false
  }
}

function photosOf(item: InspectionComparisonItem, type: 'moveIn' | 'moveOut'): InspectionPhoto[] {
  if (type === 'moveIn') return item.moveInPhotos || item.checkInPhotos || []
  return item.moveOutPhotos || item.checkoutPhotos || []
}

function rawPhotoUrl(photo: InspectionPhoto) {
  if (typeof photo === 'string') return photo
  return photo.url || photo.imageUrl || photo.photoUrl || photo.fileUrl || ''
}

function photoUrl(photo: InspectionPhoto) {
  const url = rawPhotoUrl(photo).trim()
  if (!url || /^(https?:|data:|blob:)/i.test(url)) return url
  if (url.startsWith('/api/')) return url
  if (url.startsWith('api/')) return `/${url}`
  return `/api${url.startsWith('/') ? '' : '/'}${url}`
}

function photoKey(photo: InspectionPhoto, index: number) {
  if (typeof photo === 'string') return `${photo}-${index}`
  return photo.id || `${rawPhotoUrl(photo)}-${index}`
}

function previewUrls(item: InspectionComparisonItem, type: 'moveIn' | 'moveOut') {
  return photosOf(item, type).map(photoUrl).filter(Boolean)
}

async function handleLock() {
  if (!detail.value || detail.value.status !== 'SUBMITTED') return
  const today = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()).replaceAll('/', '-')
  const { value } = await ElMessageBox.prompt('请输入归档备注', '确认验房完成', {
    inputType: 'textarea',
    inputValue: `${today} 管家已完成现场验房，照片已归档`,
    confirmButtonText: '确认归档',
    cancelButtonText: '取消',
    inputValidator: (text) => Boolean(text?.trim()) || '归档备注不能为空',
  })
  locking.value = true
  try {
    detail.value = await lockContractInspection(contractId, { comment: value.trim() })
    ElMessage.success('验房已完成，证据已归档')
  } finally {
    locking.value = false
  }
}

onMounted(fetchDetail)
</script>

<template>
  <div class="page-container">
    <PageHeader title="退租验房归档" description="查看租客退租照片和入住照片对比，确认线下验房完成后归档证据。">
      <template #actions>
        <el-button :icon="ArrowLeft" @click="router.back()">返回</el-button>
        <el-button :icon="Refresh" :loading="loading" @click="fetchDetail">刷新</el-button>
        <el-button
          v-if="detail?.status === 'SUBMITTED'"
          type="primary"
          :icon="Check"
          :loading="locking"
          @click="handleLock"
        >
          确认验房完成
        </el-button>
        <el-button v-else-if="detail?.status === 'LOCKED'" type="success" disabled>已归档，不可重复操作</el-button>
      </template>
    </PageHeader>

    <div v-loading="loading" class="inspection-page">
      <template v-if="detail">
        <el-card class="surface-card" shadow="never">
          <template #header>
            <div class="summary-header">
              <strong>验房概况</strong>
              <el-tag :type="statusMap[detail.status]?.type || 'info'">
                {{ statusMap[detail.status]?.label || detail.status }}
              </el-tag>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="合同编号">{{ detail.contractNo || detail.contractId }}</el-descriptions-item>
            <el-descriptions-item label="房源">{{ detail.houseName || detail.houseId || '-' }}</el-descriptions-item>
            <el-descriptions-item label="房源地址">{{ detail.houseAddress || '-' }}</el-descriptions-item>
            <el-descriptions-item label="租客">
              {{ detail.tenantName || '-' }}
              <span v-if="detail.tenantPhone">（{{ maskPhone(detail.tenantPhone) }}）</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-alert
          v-if="detail.status === 'LOCKED'"
          class="archive-alert"
          type="success"
          show-icon
          :closable="false"
          title="验房已完成"
        >
          <div class="archive-detail">
            <span>归档人：{{ archiveInfo?.lockedBy || '-' }}</span>
            <span>归档时间：{{ formatDateTime(archiveInfo?.lockedAt) }}</span>
            <span>备注：{{ archiveInfo?.comment || '-' }}</span>
          </div>
        </el-alert>

        <el-card class="surface-card" shadow="never">
          <template #header><strong>照片证据</strong></template>
          <div class="room-list">
            <section v-for="room in detail.rooms" :key="room.roomCode" class="room-section">
              <h3>{{ room.roomName }}</h3>
              <el-table :data="room.items" border empty-text="暂无验收项">
                <el-table-column label="验收项" width="150">
                  <template #default="{ row }">
                    <div class="item-name">
                      <strong>{{ row.itemName }}</strong>
                      <span>{{ row.itemCode }}</span>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="入住照片" min-width="260">
                  <template #default="{ row }">
                    <div class="photo-block">
                      <span class="photo-count">{{ photosOf(row, 'moveIn').length }} 张</span>
                      <div class="photo-grid">
                        <el-image
                          v-for="(photo, index) in photosOf(row, 'moveIn')"
                          :key="photoKey(photo, index)"
                          :src="photoUrl(photo)"
                          fit="cover"
                          :preview-src-list="previewUrls(row, 'moveIn')"
                          :initial-index="index"
                          preview-teleported
                        />
                      </div>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="退租照片" min-width="260">
                  <template #default="{ row }">
                    <div class="photo-block">
                      <div class="photo-meta">
                        <span class="photo-count">{{ photosOf(row, 'moveOut').length }} 张</span>
                        <small v-if="row.tenantUploadedAt">上传：{{ formatDateTime(row.tenantUploadedAt) }}</small>
                      </div>
                      <div class="photo-grid">
                        <el-image
                          v-for="(photo, index) in photosOf(row, 'moveOut')"
                          :key="photoKey(photo, index)"
                          :src="photoUrl(photo)"
                          fit="cover"
                          :preview-src-list="previewUrls(row, 'moveOut')"
                          :initial-index="index"
                          preview-teleported
                        />
                      </div>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="现场备注" min-width="180">
                  <template #default="{ row }">{{ row.siteRemark || '-' }}</template>
                </el-table-column>
              </el-table>
            </section>
          </div>
        </el-card>
      </template>
      <el-empty v-else-if="!loading" description="暂无退租验房记录" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.inspection-page {
  min-height: 320px;
}
.summary-header,
.photo-meta,
.archive-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.summary-header {
  justify-content: space-between;
}
.archive-alert {
  margin: 16px 0;
}
.archive-detail {
  margin-top: 6px;
  line-height: 1.6;
}
.room-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.room-section {
  h3 {
    margin: 0 0 10px;
    font-size: 16px;
    letter-spacing: 0;
  }
}
.item-name {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
  span {
    color: #84918b;
    font-size: 12px;
  }
}
.photo-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.photo-count {
  color: #55615c;
  font-size: 13px;
}
.photo-meta small {
  color: #84918b;
}
.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 8px;
  max-width: 360px;
  .el-image {
    width: 72px;
    height: 72px;
    overflow: hidden;
    border-radius: 4px;
    background: #f6f8f7;
  }
}
</style>
