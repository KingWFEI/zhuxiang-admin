<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection, Link, Refresh, Search, Unlock } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import {
  bindLockRoom,
  getLockDetail,
  getLockList,
  getLockUnlockData,
  saveLocalInitializedLock,
  syncLockPlatform,
  unbindLockRoom,
  updateLockBleStatus,
  type LockDetail,
  type UnlockData,
} from '@/api/lock'
import { formatDateTime } from '@/utils/format'

type DialogMode = 'initialize' | 'bind' | 'ble'

const loading = ref(false)
const actionLoading = ref(false)
const lockList = ref<LockDetail[]>([])
const keyword = ref('')
const currentLock = ref<LockDetail | null>(null)
const detailVisible = ref(false)
const unlockDrawerVisible = ref(false)
const unlockData = ref<UnlockData | null>(null)
const dialogVisible = ref(false)
const dialogMode = ref<DialogMode>('bind')

const initializeForm = reactive({ lockMac: '', lockName: '', lockData: '', battery: 100, rssi: -55 })
const bindForm = reactive({ houseId: '', roomId: '' })
const bleForm = reactive({ battery: 100, rssi: -55 })

const dialogTitle = computed(() => ({ initialize: '录入本地初始化门锁', bind: '绑定门锁到房源', ble: '更新蓝牙状态' })[dialogMode.value])

const filteredLocks = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return lockList.value
  return lockList.value.filter((lock) =>
    [lock.lockName, lock.lockMac, lock.smartLockId, lock.houseName, lock.roomName, lock.status]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(kw)),
  )
})

const statusMap: Record<string, { label: string; type: 'success' | 'warning' | 'info' | 'danger' | '' }> = {
  online: { label: '在线', type: 'success' },
  offline: { label: '离线', type: 'info' },
  bound: { label: '已绑定', type: 'success' },
  unbound: { label: '未绑定', type: 'warning' },
}

function getStatusLabel(status: string) {
  return statusMap[status]?.label || status || '-'
}

function getStatusType(status: string) {
  return statusMap[status]?.type || 'info'
}

async function fetchLockList() {
  loading.value = true
  try {
    lockList.value = await getLockList()
  } finally {
    loading.value = false
  }
}

async function openDetail(lock: LockDetail) {
  currentLock.value = lock
  detailVisible.value = true
}

async function refreshDetail() {
  if (!currentLock.value) return
  currentLock.value = await getLockDetail(currentLock.value.smartLockId)
}

function openDialog(mode: DialogMode) {
  dialogMode.value = mode
  if (mode === 'initialize') {
    initializeForm.lockMac = ''
    initializeForm.lockName = ''
    initializeForm.lockData = ''
    initializeForm.battery = 100
    initializeForm.rssi = -55
  }
  if (mode === 'bind' && currentLock.value) {
    bindForm.houseId = currentLock.value.houseId || ''
    bindForm.roomId = currentLock.value.roomId || ''
  }
  if (mode === 'ble' && currentLock.value) {
    bleForm.battery = currentLock.value.battery ?? 100
    bleForm.rssi = currentLock.value.rssi ?? -55
  }
  dialogVisible.value = true
}

async function handleDialogSubmit() {
  actionLoading.value = true
  try {
    if (dialogMode.value === 'initialize') {
      if (!initializeForm.lockMac || !initializeForm.lockData) return ElMessage.warning('MAC 地址和初始化数据不能为空')
      await saveLocalInitializedLock(initializeForm)
      ElMessage.success('本地门锁记录已保存')
      await fetchLockList()
    } else if (dialogMode.value === 'bind') {
      if (!currentLock.value || !bindForm.houseId) return ElMessage.warning('请输入房源 ID')
      await bindLockRoom(currentLock.value.smartLockId, { houseId: bindForm.houseId, roomId: bindForm.roomId || undefined })
      ElMessage.success('门锁绑定成功')
      await refreshDetail()
      await fetchLockList()
    } else {
      if (!currentLock.value) return
      currentLock.value = await updateLockBleStatus(currentLock.value.smartLockId, bleForm)
      ElMessage.success('蓝牙状态已更新')
      await fetchLockList()
    }
    dialogVisible.value = false
  } finally { actionLoading.value = false }
}

async function handleSync() {
  if (!currentLock.value) return
  actionLoading.value = true
  try {
    await syncLockPlatform(currentLock.value.smartLockId)
    ElMessage.success('已提交开放平台同步')
    await refreshDetail()
    await fetchLockList()
  } finally { actionLoading.value = false }
}

async function handleUnbind() {
  if (!currentLock.value) return
  await ElMessageBox.confirm('确认解除当前门锁与房源的绑定关系吗？', '解除绑定', {
    type: 'warning', confirmButtonText: '确认解绑', cancelButtonText: '取消',
  })
  actionLoading.value = true
  try {
    await unbindLockRoom(currentLock.value.smartLockId)
    ElMessage.success('门锁已解除绑定')
    await refreshDetail()
    await fetchLockList()
  } finally { actionLoading.value = false }
}

async function handleUnlockData() {
  if (!currentLock.value) return
  unlockData.value = await getLockUnlockData(currentLock.value.smartLockId)
  unlockDrawerVisible.value = true
}

onMounted(fetchLockList)
</script>

<template>
  <div class="page-container">
    <PageHeader title="智能门锁" description="查看所有门锁设备，管理绑定、同步和蓝牙状态。">
      <template #actions>
        <el-button :icon="Refresh" @click="fetchLockList">刷新</el-button>
        <el-button type="primary" :icon="Connection" @click="openDialog('initialize')">录入初始化门锁</el-button>
      </template>
    </PageHeader>

    <el-card class="surface-card" shadow="never">
      <el-form inline @submit.prevent>
        <el-form-item label="关键词">
          <el-input
            v-model="keyword"
            clearable
            placeholder="门锁名称、MAC、ID、房源名称、房间号"
            :prefix-icon="Search"
            style="width: 340px"
          />
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="surface-card" shadow="never">
      <template #header>
        <div class="table-header">
          <strong class="table-header__title">门锁列表</strong>
          <span class="muted-text">共 {{ lockList.length }} 台设备</span>
        </div>
      </template>
      <el-table v-loading="loading" :data="filteredLocks" border empty-text="暂无门锁设备">
        <el-table-column label="门锁名称" min-width="140">
          <template #default="{ row }">
            <span>{{ row.lockName || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="MAC 地址" width="155">
          <template #default="{ row }">
            <code class="mac-text">{{ row.lockMac }}</code>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="绑定房源" min-width="150">
          <template #default="{ row }">
            <div class="cell-stack">
              <span>{{ row.houseName || '未绑定' }}</span>
              <small v-if="row.roomName" class="muted-text">{{ row.roomName }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="电量" width="80">
          <template #default="{ row }">
            <span>{{ row.battery != null ? row.battery + '%' : '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="蓝牙信号" width="100">
          <template #default="{ row }">
            <span>{{ row.rssi != null ? row.rssi + ' dBm' : '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="最近蓝牙同步" width="170">
          <template #default="{ row }">
            <span class="muted-text">{{ formatDateTime(row.lastBleSyncTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer v-model="detailVisible" title="门锁详情" size="min(560px, 92vw)">
      <template v-if="currentLock">
        <h2 class="detail-title">{{ currentLock.lockName || currentLock.smartLockId }}</h2>

        <section class="detail-actions">
          <el-button type="primary" :icon="Link" @click="openDialog('bind')">绑定房源</el-button>
          <el-button :icon="Connection" @click="openDialog('ble')">更新蓝牙状态</el-button>
          <el-button :icon="Refresh" :loading="actionLoading" @click="handleSync">同步开放平台</el-button>
          <el-button :icon="Unlock" @click="handleUnlockData">获取开锁数据</el-button>
          <el-button type="danger" plain @click="handleUnbind">解除房源绑定</el-button>
        </section>

        <el-descriptions :column="1" border class="detail-descriptions">
          <el-descriptions-item label="本地记录 ID">{{ currentLock.smartLockId }}</el-descriptions-item>
          <el-descriptions-item label="门锁名称">{{ currentLock.lockName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="MAC 地址"><code>{{ currentLock.lockMac }}</code></el-descriptions-item>
          <el-descriptions-item label="业务状态">
            <el-tag :type="getStatusType(currentLock.status)" size="small">{{ getStatusLabel(currentLock.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="TTLock lockId">{{ currentLock.lockId ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="电子钥匙 keyId">{{ currentLock.keyId ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="绑定房源">{{ currentLock.houseName || '未绑定' }}</el-descriptions-item>
          <el-descriptions-item label="房间">{{ currentLock.roomName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="电量">{{ currentLock.battery != null ? currentLock.battery + '%' : '-' }}</el-descriptions-item>
          <el-descriptions-item label="电量来源">{{ currentLock.batterySource || '-' }}</el-descriptions-item>
          <el-descriptions-item label="蓝牙信号">{{ currentLock.rssi != null ? currentLock.rssi + ' dBm' : '-' }}</el-descriptions-item>
          <el-descriptions-item label="最近蓝牙同步">{{ formatDateTime(currentLock.lastBleSyncTime) }}</el-descriptions-item>
          <el-descriptions-item label="最近平台同步">{{ formatDateTime(currentLock.lastPlatformSyncTime) }}</el-descriptions-item>
          <el-descriptions-item label="平台错误">{{ currentLock.platformErrorMessage || '无' }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="min(520px, 92vw)" destroy-on-close>
      <el-form v-if="dialogMode === 'initialize'" :model="initializeForm" label-position="top">
        <el-form-item label="门锁 MAC"><el-input v-model="initializeForm.lockMac" /></el-form-item>
        <el-form-item label="门锁名称"><el-input v-model="initializeForm.lockName" /></el-form-item>
        <el-form-item label="SDK 初始化数据"><el-input v-model="initializeForm.lockData" type="textarea" :rows="4" /></el-form-item>
        <div class="dialog-grid"><el-form-item label="电量"><el-input-number v-model="initializeForm.battery" :min="0" :max="100" /></el-form-item><el-form-item label="RSSI"><el-input-number v-model="initializeForm.rssi" :min="-120" :max="0" /></el-form-item></div>
      </el-form>
      <el-form v-else-if="dialogMode === 'bind'" :model="bindForm" label-position="top">
        <el-form-item label="房源 ID"><el-input v-model="bindForm.houseId" /></el-form-item>
        <el-form-item label="房间 ID（整套房源可不填）"><el-input v-model="bindForm.roomId" /></el-form-item>
      </el-form>
      <el-form v-else :model="bleForm" label-position="top">
        <div class="dialog-grid"><el-form-item label="电量（0-100）"><el-input-number v-model="bleForm.battery" :min="0" :max="100" /></el-form-item><el-form-item label="RSSI（dBm）"><el-input-number v-model="bleForm.rssi" :min="-120" :max="0" /></el-form-item></div>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" :loading="actionLoading" @click="handleDialogSubmit">确认提交</el-button></template>
    </el-dialog>

    <el-drawer v-model="unlockDrawerVisible" title="蓝牙开锁数据" size="min(520px, 92vw)">
      <el-alert title="该数据属于敏感设备凭证，请勿复制到非受控环境。" type="warning" :closable="false" show-icon />
      <el-descriptions v-if="unlockData" :column="1" border class="unlock-detail">
        <el-descriptions-item label="门锁">{{ unlockData.lockName }}</el-descriptions-item>
        <el-descriptions-item label="MAC">{{ unlockData.lockMac }}</el-descriptions-item>
        <el-descriptions-item label="房间">{{ unlockData.roomName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ unlockData.status }}</el-descriptions-item>
        <el-descriptions-item label="开锁数据"><code>{{ unlockData.lockData }}</code></el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
.cell-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
  span { font-size: 13px; }
  small { font-size: 11px; }
}
.mac-text {
  font-size: 12px;
}
.detail-title {
  margin: 0 0 16px;
  font-size: 20px;
  letter-spacing: 0;
}
.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.detail-descriptions {
  margin-top: 0;
}
.dialog-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  .el-input-number {
    width: 100%;
  }
}
.unlock-detail {
  margin-top: 18px;
}
code {
  display: block;
  max-width: 100%;
  overflow-wrap: anywhere;
  white-space: normal;
}
@media (max-width: 640px) {
  .dialog-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .detail-actions {
    flex-direction: column;
    .el-button {
      width: 100%;
      margin-left: 0;
    }
  }
}
</style>
