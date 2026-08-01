<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'

import PageHeader from '@/components/PageHeader.vue'
import {
  completeAppointment,
  confirmAppointment,
  getAppointmentDetail,
  markAppointmentNoShow,
  rejectAppointment,
  rescheduleAppointment,
  retryAppointmentAccess,
  revokeAppointmentAccess,
  type AppointmentDetail,
} from '@/api/appointment'

const route = useRoute()
const router = useRouter()
const appointmentId = computed(() => String(route.params.appointmentId || ''))
const loading = ref(false)
const operating = ref(false)
const detail = ref<AppointmentDetail | null>(null)

const statusLabels: Record<string, string> = {
  PENDING_CONFIRMATION: '待确认',
  RESCHEDULE_PROPOSED: '待确认改期',
  CONFIRMED: '已确认',
  READY: '可看房',
  IN_PROGRESS: '看房中',
  COMPLETED: '已完成',
  REJECTED: '已拒绝',
  CANCELLED: '已取消',
  EXPIRED: '已过期',
  NO_SHOW: '已爽约',
}

async function fetchDetail() {
  loading.value = true
  try {
    detail.value = await getAppointmentDetail(appointmentId.value)
  } finally {
    loading.value = false
  }
}

async function run(operation: () => Promise<unknown>, message = '操作成功') {
  operating.value = true
  try {
    await operation()
    ElMessage.success(message)
    await fetchDetail()
  } finally {
    operating.value = false
  }
}

async function handleConfirm() {
  const meeting = await ElMessageBox.prompt('请输入见面地点（自助看房可留空）', '确认预约', {
    inputPlaceholder: '见面地点',
    confirmButtonText: '下一步',
    cancelButtonText: '取消',
  }).catch(() => null)
  if (!meeting) return
  const instruction = await ElMessageBox.prompt('请输入看房说明', '确认预约', {
    inputPlaceholder: '看房说明',
    confirmButtonText: '确认',
    cancelButtonText: '取消',
  }).catch(() => null)
  if (!instruction) return
  await run(() =>
    confirmAppointment(appointmentId.value, {
      meetingPoint: meeting.value,
      viewingInstruction: instruction.value,
    }),
  )
}

async function handleReject() {
  const result = await ElMessageBox.prompt('请填写拒绝原因', '拒绝预约', {
    inputPattern: /\S+/,
    inputErrorMessage: '拒绝原因不能为空',
    confirmButtonText: '拒绝',
    cancelButtonText: '取消',
    type: 'warning',
  }).catch(() => null)
  if (result) await run(() => rejectAppointment(appointmentId.value, result.value))
}

async function handleReschedule() {
  const timeResult = await ElMessageBox.prompt(
    '请输入新时间，例如 2026-08-01T10:00:00+08:00',
    '预约改期',
    {
      inputPattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?[+-]\d{2}:\d{2}$/,
      inputErrorMessage: '请输入带时区的 ISO 时间',
      confirmButtonText: '下一步',
      cancelButtonText: '取消',
    },
  ).catch(() => null)
  if (!timeResult) return
  const reasonResult = await ElMessageBox.prompt('请填写改期原因', '预约改期', {
    inputPattern: /\S+/,
    inputErrorMessage: '改期原因不能为空',
    confirmButtonText: '提交',
    cancelButtonText: '取消',
  }).catch(() => null)
  if (!reasonResult) return
  await run(() =>
    rescheduleAppointment(appointmentId.value, timeResult.value, reasonResult.value),
  )
}

function formatTime(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

onMounted(fetchDetail)
</script>

<template>
  <div v-loading="loading" class="page-container">
    <PageHeader title="预约详情" description="查看预约履约、门锁授权和状态流转记录。">
      <template #actions>
        <el-button @click="router.push({ name: 'AppointmentList' })">返回列表</el-button>
        <el-button @click="fetchDetail">刷新</el-button>
      </template>
    </PageHeader>

    <template v-if="detail">
      <el-card class="surface-card" shadow="never">
        <template #header>
          <div class="card-title">
            <strong>{{ detail.house.title }}</strong>
            <div>
              <el-tag :type="detail.sourceType === 'PLATFORM' ? 'primary' : 'success'">
                {{ detail.sourceLabel }}
              </el-tag>
              <el-tag class="tag-gap" type="info">{{ detail.viewingModeLabel }}</el-tag>
            </div>
          </div>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="预约编号">{{ detail.id }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ statusLabels[detail.status] || detail.status }}</el-descriptions-item>
          <el-descriptions-item label="预约时间">
            {{ formatTime(detail.appointmentStartAt) }} 至 {{ formatTime(detail.appointmentEndAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="确认截止">{{ formatTime(detail.confirmDeadlineAt) }}</el-descriptions-item>
          <el-descriptions-item label="租客">{{ detail.contactName }}（{{ detail.contactPhone }}）</el-descriptions-item>
          <el-descriptions-item label="用户 ID">{{ detail.userId }}</el-descriptions-item>
          <el-descriptions-item label="房源地址" :span="2">{{ detail.house.address || '-' }}</el-descriptions-item>
          <el-descriptions-item label="见面地点">{{ detail.meetingPoint || '-' }}</el-descriptions-item>
          <el-descriptions-item label="接待人">{{ detail.host?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="看房说明" :span="2">{{ detail.viewingInstruction || '-' }}</el-descriptions-item>
          <el-descriptions-item label="租客备注" :span="2">{{ detail.remark || '-' }}</el-descriptions-item>
          <el-descriptions-item label="拒绝/取消原因" :span="2">
            {{ detail.rejectReason || detail.cancelReason || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card v-if="detail.viewingMode === 'SELF_SERVICE_LOCK'" class="surface-card" shadow="never">
        <template #header><strong>门锁授权</strong></template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="授权状态">{{ detail.accessStatus }}</el-descriptions-item>
          <el-descriptions-item label="生效时间">{{ formatTime(detail.accessValidFrom) }}</el-descriptions-item>
          <el-descriptions-item label="失效时间">{{ formatTime(detail.accessValidTo) }}</el-descriptions-item>
        </el-descriptions>
        <div class="actions">
          <el-button :loading="operating" type="primary" @click="run(() => retryAppointmentAccess(detail!.id), '授权重试已提交')">
            重试授权
          </el-button>
          <el-button :loading="operating" type="danger" plain @click="run(() => revokeAppointmentAccess(detail!.id), '授权已撤销')">
            撤销授权
          </el-button>
        </div>
      </el-card>

      <el-card class="surface-card" shadow="never">
        <template #header><strong>预约处理</strong></template>
        <el-alert
          v-if="detail.sourceType === 'LANDLORD'"
          title="个人房源预约由所属房东处理，管理端仅提供查看能力。"
          type="info"
          :closable="false"
        />
        <div v-else class="actions">
          <el-button v-if="detail.availableActions.includes('CONFIRM')" :loading="operating" type="primary" @click="handleConfirm">
            确认预约
          </el-button>
          <el-button v-if="detail.availableActions.includes('REJECT')" :loading="operating" type="danger" plain @click="handleReject">
            拒绝预约
          </el-button>
          <el-button v-if="detail.availableActions.includes('RESCHEDULE')" :loading="operating" @click="handleReschedule">
            建议改期
          </el-button>
          <el-button v-if="detail.availableActions.includes('COMPLETE')" :loading="operating" type="success" @click="run(() => completeAppointment(detail!.id), '已标记完成')">
            标记完成
          </el-button>
          <el-button v-if="detail.availableActions.includes('NO_SHOW')" :loading="operating" type="warning" @click="run(() => markAppointmentNoShow(detail!.id), '已标记爽约')">
            标记爽约
          </el-button>
        </div>
      </el-card>

      <el-card class="surface-card" shadow="never">
        <template #header><strong>状态日志</strong></template>
        <el-timeline>
          <el-timeline-item
            v-for="(log, index) in detail.statusLogs"
            :key="`${log.createdAt}-${index}`"
            :timestamp="formatTime(log.createdAt)"
          >
            <strong>{{ statusLabels[log.toStatus] || log.toStatus }}</strong>
            <span class="log-meta"> · {{ log.operatorRole || 'SYSTEM' }}</span>
            <div v-if="log.reason" class="log-reason">{{ log.reason }}</div>
          </el-timeline-item>
        </el-timeline>
      </el-card>
    </template>
  </div>
</template>

<style scoped lang="scss">
.card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tag-gap {
  margin-left: 8px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
}

.log-meta,
.log-reason {
  color: var(--el-text-color-secondary);
}

.log-reason {
  margin-top: 4px;
}
</style>
