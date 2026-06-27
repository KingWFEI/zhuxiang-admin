<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection, Key, Link, Refresh, Search, Unlock } from '@element-plus/icons-vue'
import DataSourceNotice from '@/components/DataSourceNotice.vue'
import PageHeader from '@/components/PageHeader.vue'
import {
  bindLockRoom,
  getLockByMac,
  getLockDetail,
  getLockUnlockData,
  saveLocalInitializedLock,
  syncLockPlatform,
  unbindLockRoom,
  updateLockBleStatus,
  type LockDetail,
  type LockSummary,
  type UnlockData,
} from '@/api/lock'
import { formatDateTime } from '@/utils/format'

type DialogMode = 'initialize' | 'bind' | 'ble'

const searchMac = ref('')
const loading = ref(false)
const actionLoading = ref(false)
const currentSummary = ref<LockSummary | null>(null)
const currentDetail = ref<LockDetail | null>(null)
const unlockData = ref<UnlockData | null>(null)
const dialogVisible = ref(false)
const unlockDrawerVisible = ref(false)
const dialogMode = ref<DialogMode>('bind')

const initializeForm = reactive({ lockMac: '', lockName: '', lockData: '', battery: 100, rssi: -55 })
const bindForm = reactive({ houseId: '', roomId: '' })
const bleForm = reactive({ battery: 100, rssi: -55 })

const dialogTitle = computed(() => ({ initialize: '录入本地初始化门锁', bind: '绑定门锁到房源', ble: '更新蓝牙状态' })[dialogMode.value])

async function fetchLockDetail(smartLockId: string) {
  currentDetail.value = await getLockDetail(smartLockId)
}

async function handleSearch() {
  if (!searchMac.value.trim()) return ElMessage.warning('请输入门锁 MAC 地址')
  loading.value = true
  try {
    currentSummary.value = await getLockByMac(searchMac.value.trim())
    await fetchLockDetail(currentSummary.value.smartLockId)
  } finally { loading.value = false }
}

function openDialog(mode: DialogMode) {
  dialogMode.value = mode
  if (mode === 'initialize') initializeForm.lockMac = searchMac.value.trim()
  if (mode === 'bind' && currentSummary.value) {
    bindForm.houseId = currentSummary.value.houseId || ''
    bindForm.roomId = currentSummary.value.roomId || ''
  }
  if (mode === 'ble' && currentDetail.value) {
    bleForm.battery = currentDetail.value.battery ?? 100
    bleForm.rssi = currentDetail.value.rssi ?? -55
  }
  dialogVisible.value = true
}

async function handleDialogSubmit() {
  actionLoading.value = true
  try {
    if (dialogMode.value === 'initialize') {
      if (!initializeForm.lockMac || !initializeForm.lockData) return ElMessage.warning('MAC 地址和初始化数据不能为空')
      const result = await saveLocalInitializedLock(initializeForm)
      searchMac.value = result.lockMac
      ElMessage.success('本地门锁记录已保存')
      await handleSearch()
    } else if (dialogMode.value === 'bind') {
      if (!currentSummary.value || !bindForm.houseId) return ElMessage.warning('请输入房源 ID')
      await bindLockRoom(currentSummary.value.smartLockId, { houseId: bindForm.houseId, roomId: bindForm.roomId || undefined })
      ElMessage.success('门锁绑定成功')
      await handleSearch()
    } else {
      if (!currentSummary.value) return
      currentDetail.value = await updateLockBleStatus(currentSummary.value.smartLockId, bleForm)
      ElMessage.success('蓝牙状态已更新')
    }
    dialogVisible.value = false
  } finally { actionLoading.value = false }
}

async function handleSync() {
  if (!currentSummary.value) return
  actionLoading.value = true
  try {
    await syncLockPlatform(currentSummary.value.smartLockId)
    ElMessage.success('已提交开放平台同步')
    await fetchLockDetail(currentSummary.value.smartLockId)
  } finally { actionLoading.value = false }
}

async function handleUnbind() {
  if (!currentSummary.value) return
  await ElMessageBox.confirm('确认解除当前门锁与房源的绑定关系吗？', '解除绑定', {
    type: 'warning', confirmButtonText: '确认解绑', cancelButtonText: '取消',
  })
  actionLoading.value = true
  try {
    await unbindLockRoom(currentSummary.value.smartLockId)
    ElMessage.success('门锁已解除绑定')
    await handleSearch()
  } finally { actionLoading.value = false }
}

async function handleUnlockData() {
  if (!currentSummary.value) return
  unlockData.value = await getLockUnlockData(currentSummary.value.smartLockId)
  unlockDrawerVisible.value = true
}
</script>

<template>
  <div class="page-container">
    <PageHeader title="智能门锁操作台" description="通过 MAC 地址定位设备，完成绑定、同步和蓝牙状态维护。">
      <template #actions><el-button :icon="Connection" @click="openDialog('initialize')">录入初始化门锁</el-button></template>
    </PageHeader>
    <DataSourceNotice type="real" detail="本页面全部查询和操作均调用 /admin/locks 真实接口；后端暂未提供门锁分页列表。" />

    <el-card class="surface-card search-workbench" shadow="never">
      <div class="lock-search">
        <div><span>设备定位</span><strong>输入门锁 MAC 地址</strong><small>例如 AA:BB:CC:DD:EE:FF</small></div>
        <el-input v-model="searchMac" size="large" clearable placeholder="门锁 MAC 地址" :prefix-icon="Key" @keyup.enter="handleSearch">
          <template #append><el-button :icon="Search" :loading="loading" @click="handleSearch">查询</el-button></template>
        </el-input>
      </div>
    </el-card>

    <template v-if="currentSummary">
      <section class="lock-overview">
        <article><span>门锁名称</span><strong>{{ currentSummary.lockName || '-' }}</strong><small>{{ currentSummary.lockMac }}</small></article>
        <article><span>业务状态</span><strong>{{ currentSummary.status || '-' }}</strong><small>本地记录 {{ currentSummary.smartLockId }}</small></article>
        <article><span>绑定房源</span><strong>{{ currentSummary.houseName || '未绑定' }}</strong><small>{{ currentSummary.roomName || currentSummary.houseId || '-' }}</small></article>
        <article><span>设备电量</span><strong>{{ currentDetail?.battery == null ? '-' : `${currentDetail.battery}%` }}</strong><small>RSSI {{ currentDetail?.rssi ?? '-' }} dBm</small></article>
      </section>

      <div class="lock-grid">
        <el-card class="surface-card" shadow="never">
          <template #header><div class="table-header"><strong class="table-header__title">设备详情</strong><el-button link type="primary" :icon="Refresh" @click="fetchLockDetail(currentSummary.smartLockId)">刷新详情</el-button></div></template>
          <el-descriptions v-if="currentDetail" :column="2" border>
            <el-descriptions-item label="本地记录 ID">{{ currentDetail.smartLockId }}</el-descriptions-item>
            <el-descriptions-item label="开放平台锁 ID">{{ currentDetail.lockId ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="电子钥匙 ID">{{ currentDetail.keyId ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="电量来源">{{ currentDetail.batterySource || '-' }}</el-descriptions-item>
            <el-descriptions-item label="最近蓝牙同步">{{ formatDateTime(currentDetail.lastBleSyncTime) }}</el-descriptions-item>
            <el-descriptions-item label="最近平台同步">{{ formatDateTime(currentDetail.lastPlatformSyncTime) }}</el-descriptions-item>
            <el-descriptions-item label="平台错误" :span="2">{{ currentDetail.platformErrorMessage || '无' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card class="surface-card actions-panel" shadow="never">
          <template #header><strong class="table-header__title">设备操作</strong></template>
          <el-button type="primary" :icon="Link" @click="openDialog('bind')">绑定房源</el-button>
          <el-button :icon="Connection" @click="openDialog('ble')">更新蓝牙状态</el-button>
          <el-button :icon="Refresh" :loading="actionLoading" @click="handleSync">同步开放平台</el-button>
          <el-button :icon="Unlock" @click="handleUnlockData">获取开锁数据</el-button>
          <el-button type="danger" plain @click="handleUnbind">解除房源绑定</el-button>
        </el-card>
      </div>
    </template>

    <el-empty v-else description="查询门锁后显示设备详情与可用操作" :image-size="92" />

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
.lock-search { display: grid; grid-template-columns: minmax(180px, 0.65fr) minmax(320px, 1.35fr); align-items: center; gap: 32px; }.lock-search > div { display: flex; flex-direction: column; }.lock-search span { color: #176b4d; font-size: 10px; font-weight: 750; }.lock-search strong { margin-top: 5px; font-size: 17px; }.lock-search small { margin-top: 4px; color: #8b9691; }
.lock-overview { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border: 1px solid #dfe5e2; border-radius: 6px; background: white; }.lock-overview article { display: flex; min-width: 0; flex-direction: column; padding: 17px; border-right: 1px solid #e5eae8; }.lock-overview article:last-child { border: 0; }.lock-overview span { color: #7c8882; font-size: 11px; }.lock-overview strong { margin-top: 8px; overflow: hidden; font-size: 18px; text-overflow: ellipsis; white-space: nowrap; }.lock-overview small { margin-top: 5px; overflow: hidden; color: #8d9893; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.lock-grid { display: grid; grid-template-columns: minmax(0, 1fr) 250px; gap: 16px; }.actions-panel :deep(.el-card__body) { display: flex; flex-direction: column; gap: 10px; }.actions-panel .el-button { width: 100%; margin-left: 0; }.dialog-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }.dialog-grid .el-input-number { width: 100%; }.unlock-detail { margin-top: 18px; }code { display: block; max-width: 100%; overflow-wrap: anywhere; white-space: normal; }
@media (max-width: 920px) { .lock-overview { grid-template-columns: repeat(2, 1fr); }.lock-overview article:nth-child(2) { border-right: 0; }.lock-overview article:nth-child(-n + 2) { border-bottom: 1px solid #e5eae8; }.lock-grid { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .lock-search { grid-template-columns: 1fr; gap: 16px; }.lock-overview { grid-template-columns: 1fr; }.lock-overview article { border-right: 0; border-bottom: 1px solid #e5eae8; }.dialog-grid { grid-template-columns: 1fr; gap: 0; } }
</style>
