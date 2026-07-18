<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Check, Delete, Plus, Refresh } from '@element-plus/icons-vue'

import PageHeader from '@/components/PageHeader.vue'
import {
  getHouseInspectionTemplate,
  updateHouseInspectionTemplate,
  type InspectionTemplate,
  type InspectionTemplateItem,
  type InspectionTemplateRoom,
} from '@/api/inspection'

const route = useRoute()
const router = useRouter()
const houseId = String(route.params.houseId || '')

const loading = ref(false)
const saving = ref(false)
const template = reactive<InspectionTemplate>({ rooms: [] })

const defaultRooms: InspectionTemplateRoom[] = [
  {
    roomCode: 'living_room',
    roomName: '客厅',
    items: [
      { itemCode: 'living_wall', itemName: '墙面', enabled: true, required: true, minPhotoCount: 2, instruction: '拍摄墙面整体和明显瑕疵' },
      { itemCode: 'living_floor', itemName: '地面', enabled: true, required: true, minPhotoCount: 2, instruction: '拍摄地面整体和破损污渍' },
      { itemCode: 'living_door_window', itemName: '门窗', enabled: true, required: false, minPhotoCount: 1, instruction: '拍摄门窗开合和损坏情况' },
      { itemCode: 'living_air_conditioner', itemName: '空调', enabled: true, required: false, minPhotoCount: 1, instruction: '拍摄空调外观和遥控器' },
    ],
  },
  {
    roomCode: 'bedroom',
    roomName: '卧室',
    items: [
      { itemCode: 'bedroom_wall', itemName: '墙面', enabled: true, required: true, minPhotoCount: 2, instruction: '拍摄墙面整体和明显瑕疵' },
      { itemCode: 'bedroom_floor', itemName: '地面', enabled: true, required: true, minPhotoCount: 2, instruction: '拍摄地面整体和破损污渍' },
      { itemCode: 'bedroom_bed', itemName: '床', enabled: true, required: false, minPhotoCount: 1, instruction: '拍摄床架、床垫和明显损坏' },
      { itemCode: 'bedroom_wardrobe', itemName: '衣柜', enabled: true, required: false, minPhotoCount: 1, instruction: '拍摄衣柜外观和内部' },
    ],
  },
  {
    roomCode: 'kitchen',
    roomName: '厨房',
    items: [
      { itemCode: 'kitchen_wall', itemName: '墙面', enabled: true, required: true, minPhotoCount: 1, instruction: '拍摄墙面和油污破损' },
      { itemCode: 'kitchen_floor', itemName: '地面', enabled: true, required: true, minPhotoCount: 1, instruction: '拍摄地面和排水区域' },
      { itemCode: 'kitchen_fridge', itemName: '冰箱', enabled: true, required: false, minPhotoCount: 1, instruction: '拍摄冰箱外观和内部' },
      { itemCode: 'kitchen_door_window', itemName: '门窗', enabled: true, required: false, minPhotoCount: 1, instruction: '拍摄门窗开合和损坏情况' },
    ],
  },
  {
    roomCode: 'bathroom',
    roomName: '卫生间',
    items: [
      { itemCode: 'bathroom_wall', itemName: '墙面', enabled: true, required: true, minPhotoCount: 1, instruction: '拍摄墙面、瓷砖和渗水情况' },
      { itemCode: 'bathroom_floor', itemName: '地面', enabled: true, required: true, minPhotoCount: 1, instruction: '拍摄地面、地漏和破损情况' },
      { itemCode: 'bathroom_door_window', itemName: '门窗', enabled: true, required: false, minPhotoCount: 1, instruction: '拍摄门窗开合和损坏情况' },
    ],
  },
  {
    roomCode: 'balcony',
    roomName: '阳台',
    items: [
      { itemCode: 'balcony_wall', itemName: '墙面', enabled: true, required: false, minPhotoCount: 1, instruction: '拍摄墙面整体和明显瑕疵' },
      { itemCode: 'balcony_floor', itemName: '地面', enabled: true, required: false, minPhotoCount: 1, instruction: '拍摄地面和排水区域' },
      { itemCode: 'balcony_door_window', itemName: '门窗', enabled: true, required: false, minPhotoCount: 1, instruction: '拍摄门窗开合和损坏情况' },
    ],
  },
]

function cloneTemplate(source: InspectionTemplateRoom[]) {
  return source.map((room) => ({
    ...room,
    items: room.items.map((item) => ({ ...item })),
  }))
}

function setTemplate(data: InspectionTemplate | null) {
  template.rooms = data?.rooms?.length ? cloneTemplate(data.rooms) : cloneTemplate(defaultRooms)
}

async function fetchTemplate() {
  loading.value = true
  try {
    setTemplate(await getHouseInspectionTemplate(houseId))
  } finally {
    loading.value = false
  }
}

function addItem(room: InspectionTemplateRoom) {
  const next = room.items.length + 1
  room.items.push({
    itemCode: `${room.roomCode}_custom_${Date.now()}`,
    itemName: `自定义验收项 ${next}`,
    enabled: true,
    required: false,
    minPhotoCount: 1,
    instruction: '',
  })
}

function removeItem(room: InspectionTemplateRoom, index: number) {
  room.items.splice(index, 1)
}

function validateTemplate() {
  for (const room of template.rooms) {
    if (!room.roomCode.trim() || !room.roomName.trim()) return '请填写完整的房间编码和名称'
    for (const item of room.items) {
      if (!item.itemCode.trim() || !item.itemName.trim()) return `${room.roomName} 有验收项未填写编码或名称`
      if (item.minPhotoCount < 0) return `${room.roomName}-${item.itemName} 的最少照片数量不能小于 0`
    }
  }
  return ''
}

async function handleSave() {
  const error = validateTemplate()
  if (error) {
    ElMessage.warning(error)
    return
  }
  saving.value = true
  try {
    await updateHouseInspectionTemplate(houseId, {
      rooms: template.rooms.map((room) => ({
        roomCode: room.roomCode.trim(),
        roomName: room.roomName.trim(),
        items: room.items.map((item: InspectionTemplateItem) => ({
          itemCode: item.itemCode.trim(),
          itemName: item.itemName.trim(),
          enabled: item.enabled,
          required: item.required,
          minPhotoCount: Math.max(0, Number(item.minPhotoCount || 0)),
          instruction: item.instruction?.trim() || '',
        })),
      })),
    })
    ElMessage.success('退租验收标准已保存')
  } finally {
    saving.value = false
  }
}

onMounted(fetchTemplate)
</script>

<template>
  <div class="page-container">
    <PageHeader title="退租验收标准" description="配置房源退租时需要留存的房间、设施、照片数量和验收说明。">
      <template #actions>
        <el-button :icon="ArrowLeft" @click="router.back()">返回</el-button>
        <el-button :icon="Refresh" :loading="loading" @click="fetchTemplate">刷新</el-button>
        <el-button type="primary" :icon="Check" :loading="saving" @click="handleSave">保存标准</el-button>
      </template>
    </PageHeader>

    <el-alert
      class="page-alert"
      type="info"
      show-icon
      :closable="false"
      title="保存后只影响后续租约。已有租约应使用后端保存的验收快照展示历史标准。"
    />

    <div v-loading="loading" class="room-list">
      <el-card v-for="room in template.rooms" :key="room.roomCode" class="surface-card" shadow="never">
        <template #header>
          <div class="room-header">
            <div class="room-title">
              <strong>{{ room.roomName }}</strong>
              <span>{{ room.roomCode }}</span>
            </div>
            <el-button :icon="Plus" @click="addItem(room)">添加验收项</el-button>
          </div>
        </template>

        <el-table :data="room.items" border empty-text="暂无验收项">
          <el-table-column label="启用" width="80" align="center">
            <template #default="{ row }"><el-switch v-model="row.enabled" /></template>
          </el-table-column>
          <el-table-column label="必拍" width="80" align="center">
            <template #default="{ row }"><el-switch v-model="row.required" /></template>
          </el-table-column>
          <el-table-column label="验收项编码" min-width="160">
            <template #default="{ row }"><el-input v-model="row.itemCode" /></template>
          </el-table-column>
          <el-table-column label="验收项" min-width="140">
            <template #default="{ row }"><el-input v-model="row.itemName" /></template>
          </el-table-column>
          <el-table-column label="最少照片" width="130">
            <template #default="{ row }"><el-input-number v-model="row.minPhotoCount" :min="0" :max="20" controls-position="right" /></template>
          </el-table-column>
          <el-table-column label="验收说明" min-width="260">
            <template #default="{ row }"><el-input v-model="row.instruction" type="textarea" :rows="2" maxlength="200" /></template>
          </el-table-column>
          <el-table-column label="操作" width="80" fixed="right" align="center">
            <template #default="{ $index }">
              <el-button link type="danger" :icon="Delete" @click="removeItem(room, $index)" />
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-alert {
  margin-bottom: 16px;
}
.room-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 240px;
}
.room-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.room-title {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  strong {
    font-size: 15px;
  }
  span {
    color: #84918b;
    font-size: 12px;
  }
}
</style>
