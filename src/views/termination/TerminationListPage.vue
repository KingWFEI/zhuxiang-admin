<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'

import PageHeader from '@/components/PageHeader.vue'
import { getLeaseList } from '@/api/lease'
import {
  approveTermination,
  completeTermination,
  confirmTerminationSettlement,
  getTerminationDetail,
  getTerminationList,
  rejectTermination,
  requestTerminationSupplement,
  type TerminationApplication,
  type TerminationStatus,
} from '@/api/termination'
import type { PageData } from '@/api/types'
import { formatDateTime, formatFenCurrency, maskPhone } from '@/utils/format'

const loading = ref(false)
const router = useRouter()
const actionLoading = ref(false)
const drawerVisible = ref(false)
const actionDialogVisible = ref(false)
const actionMode = ref<'reject' | 'supplement' | 'settlement' | ''>('')
const terminationList = ref<TerminationApplication[]>([])
const currentApplication = ref<TerminationApplication | null>(null)
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })
const searchForm = reactive<{ keyword: string; status: TerminationStatus | '' }>({
  keyword: '',
  status: '',
})
const actionForm = reactive({
  rejectReason: '',
  supplementReason: '',
  settlementAmount: 0,
  refundAmount: 0,
  remark: '',
})

const statusOptions: Array<{ label: string; value: TerminationStatus }> = [
  { label: '待审核', value: 'pending_review' },
  { label: '待补充材料', value: 'need_supplement' },
  { label: '待验房', value: 'inspection_pending' },
  { label: '待结算', value: 'settlement_pending' },
  { label: '待退款', value: 'refund_pending' },
  { label: '已完成', value: 'completed' },
  { label: '已驳回', value: 'rejected' },
  { label: '已撤销', value: 'cancelled' },
]

const statusMap: Record<
  TerminationStatus,
  { label: string; type: 'warning' | 'success' | 'info' | 'danger' }
> = {
  pending_review: { label: '待审核', type: 'warning' },
  need_supplement: { label: '待补充材料', type: 'warning' },
  inspection_pending: { label: '待验房', type: 'info' },
  settlement_pending: { label: '待结算', type: 'warning' },
  refund_pending: { label: '待退款', type: 'warning' },
  completed: { label: '已完成', type: 'success' },
  rejected: { label: '已驳回', type: 'danger' },
  cancelled: { label: '已撤销', type: 'info' },
}

const actionTitle = computed(() => {
  if (actionMode.value === 'reject') return '驳回退租申请'
  if (actionMode.value === 'supplement') return '要求补充材料'
  if (actionMode.value === 'settlement') return '确认退租结算'
  return '处理退租申请'
})

async function fetchTerminationList() {
  loading.value = true
  try {
    const data: PageData<TerminationApplication> = await getTerminationList({
      keyword: searchForm.keyword || undefined,
      status: searchForm.status || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    terminationList.value = data.items
    pagination.total = data.total
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchTerminationList()
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.status = ''
  pagination.page = 1
  fetchTerminationList()
}

function handlePageChange(page: number) {
  pagination.page = page
  fetchTerminationList()
}

function handleSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  fetchTerminationList()
}

async function openDrawer(row: TerminationApplication) {
  drawerVisible.value = true
  currentApplication.value = row
  try {
    currentApplication.value = await getTerminationDetail(row.id)
  } catch {
    currentApplication.value = row
  }
}

function openAction(mode: 'reject' | 'supplement' | 'settlement', row: TerminationApplication) {
  currentApplication.value = row
  actionMode.value = mode
  actionForm.rejectReason = ''
  actionForm.supplementReason = ''
  actionForm.settlementAmount = settlementAmountOf(row)
  actionForm.refundAmount = row.refundAmount ?? 0
  actionForm.remark = ''
  actionDialogVisible.value = true
}

async function handleApprove(row: TerminationApplication) {
  await ElMessageBox.confirm(
    '确认审核通过该退租申请吗？通过后将进入后续验房/结算流程。',
    '审核通过',
    {
      type: 'warning',
    },
  )
  actionLoading.value = true
  try {
    await approveTermination(row.id)
    ElMessage.success('已审核通过')
    await fetchTerminationList()
    if (drawerVisible.value) await refreshCurrent(row.id)
  } finally {
    actionLoading.value = false
  }
}

async function handleComplete(row: TerminationApplication) {
  await ElMessageBox.confirm('确认将该退租单标记为已完成吗？', '完成退租', {
    type: 'warning',
  })
  actionLoading.value = true
  try {
    await completeTermination(row.id)
    ElMessage.success('退租单已完成')
    await fetchTerminationList()
    if (drawerVisible.value) await refreshCurrent(row.id)
  } finally {
    actionLoading.value = false
  }
}

async function submitAction() {
  const application = currentApplication.value
  if (!application || !actionMode.value) return

  if (actionMode.value === 'reject' && !actionForm.rejectReason.trim()) {
    ElMessage.warning('请填写驳回原因')
    return
  }
  if (actionMode.value === 'supplement' && !actionForm.supplementReason.trim()) {
    ElMessage.warning('请填写补充材料说明')
    return
  }

  actionLoading.value = true
  try {
    if (actionMode.value === 'reject') {
      await rejectTermination(application.id, { rejectReason: actionForm.rejectReason.trim() })
      ElMessage.success('已驳回申请')
    }
    if (actionMode.value === 'supplement') {
      await requestTerminationSupplement(application.id, {
        supplementReason: actionForm.supplementReason.trim(),
      })
      ElMessage.success('已通知租客补充材料')
    }
    if (actionMode.value === 'settlement') {
      await confirmTerminationSettlement(application.id, {
        settlementAmount: actionForm.settlementAmount,
        refundAmount: actionForm.refundAmount,
        remark: actionForm.remark.trim() || undefined,
      })
      ElMessage.success('结算已确认')
    }
    actionDialogVisible.value = false
    await fetchTerminationList()
    await refreshCurrent(application.id)
  } finally {
    actionLoading.value = false
  }
}

async function refreshCurrent(id: string) {
  try {
    currentApplication.value = await getTerminationDetail(id)
  } catch {
    currentApplication.value = terminationList.value.find((item) => item.id === id) ?? null
  }
}

function canReview(row: TerminationApplication) {
  return row.status === 'pending_review'
}

function canSettle(row: TerminationApplication) {
  return row.status === 'inspection_pending' || row.status === 'settlement_pending'
}

function canComplete(row: TerminationApplication) {
  return row.status === 'refund_pending' || row.status === 'settlement_pending'
}

async function openInspectionArchive(row: TerminationApplication) {
  let contractId = row.contractId

  if (!contractId && row.contractNo) {
    const leases = await getLeaseList({ keyword: row.contractNo, page: 1, pageSize: 20 })
    contractId = leases.items.find((lease) => lease.contractNo === row.contractNo)?.contractId
  }

  if (!contractId) {
    ElMessage.warning('该退租记录缺少合同 ID，暂时无法查看验房记录')
    return
  }

  router.push(`/contracts/${contractId}/inspection`)
}

function statusLabel(status: TerminationStatus) {
  return statusMap[status]?.label || status
}

function settlementAmountOf(row: TerminationApplication) {
  return row.settlementAmount ?? row.totalDeduction ?? 0
}

onMounted(fetchTerminationList)
</script>

<template>
  <div class="page-container">
    <PageHeader title="退租管理" description="处理租客退租申请、补充材料、审核和结算完成。">
      <template #actions>
        <el-button :icon="Refresh" @click="fetchTerminationList">刷新</el-button>
      </template>
    </PageHeader>


    <el-card class="surface-card" shadow="never">
      <el-form :model="searchForm" inline @submit.prevent="handleSearch">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            clearable
            placeholder="退租单号、租客姓名、手机号、房源或合同编号"
            :prefix-icon="Search"
            style="width: 320px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            clearable
            placeholder="全部状态"
            style="width: 160px"
          >
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="surface-card" shadow="never">
      <template #header>
        <div class="table-header">
          <strong class="table-header__title">退租申请列表</strong>
          <span class="muted-text">共 {{ pagination.total }} 条申请</span>
        </div>
      </template>
      <el-table v-loading="loading" :data="terminationList" border empty-text="暂无退租申请">
        <el-table-column label="退租单号" min-width="160">
          <template #default="{ row }">
            <span>{{ row.applicationNo || row.id }}</span>
          </template>
        </el-table-column>
        <el-table-column label="房源" min-width="200">
          <template #default="{ row }">
            <div class="cell-stack">
              <strong>{{ row.houseName || '-' }}</strong>
              <span class="muted-text">{{ row.houseAddress || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="租客" width="130">
          <template #default="{ row }">
            <div class="cell-stack">
              <span>{{ row.tenantName || row.contactName || '-' }}</span>
              <small class="muted-text">{{
                maskPhone(row.tenantPhone || row.contactPhone || '')
              }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="期望退租" width="120" prop="expectedMoveOutDate" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status as TerminationStatus]?.type || 'info'" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="应退金额" width="120">
          <template #default="{ row }">
            <span class="currency-text">{{ formatFenCurrency(row.refundAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="160">
          <template #default="{ row }">
            <span>{{ formatDateTime(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="320" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDrawer(row)">查看</el-button>
            <el-button link type="primary" @click="openInspectionArchive(row)">
              退租验房
            </el-button>
            <el-button
              v-if="canReview(row)"
              link
              type="success"
              :loading="actionLoading"
              @click="handleApprove(row)"
            >
              通过
            </el-button>
            <el-button
              v-if="canReview(row)"
              link
              type="warning"
              @click="openAction('supplement', row)"
            >
              补材料
            </el-button>
            <el-button v-if="canReview(row)" link type="danger" @click="openAction('reject', row)">
              驳回
            </el-button>
            <el-button
              v-if="canSettle(row)"
              link
              type="primary"
              @click="openAction('settlement', row)"
            >
              结算
            </el-button>
            <el-button
              v-if="canComplete(row)"
              link
              type="success"
              :loading="actionLoading"
              @click="handleComplete(row)"
            >
              完成
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <el-drawer v-model="drawerVisible" title="退租详情" size="min(640px, 92vw)">
      <template v-if="currentApplication">
        <h2 class="detail-title">
          {{ currentApplication.applicationNo || currentApplication.id }}
        </h2>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="当前状态">
            <el-tag :type="statusMap[currentApplication.status]?.type || 'info'">
              {{ statusLabel(currentApplication.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="房源">
            {{
              currentApplication.houseName || '-'
            }}
          </el-descriptions-item>
          <el-descriptions-item label="合同编号">
            {{
              currentApplication.contractNo || '-'
            }}
          </el-descriptions-item>
          <el-descriptions-item label="租客">
            {{ currentApplication.tenantName || currentApplication.contactName || '-' }}（{{
              maskPhone(currentApplication.tenantPhone || currentApplication.contactPhone || '')
            }}）
          </el-descriptions-item>
          <el-descriptions-item label="期望退租日期">
            {{
              currentApplication.expectedMoveOutDate || '-'
            }}
          </el-descriptions-item>
          <el-descriptions-item label="是否已搬离">
            {{
              currentApplication.hasMovedOut ? '是' : '否'
            }}
          </el-descriptions-item>
          <el-descriptions-item label="退租原因">
            {{
              currentApplication.reason || '-'
            }}
          </el-descriptions-item>
          <el-descriptions-item label="备注">
            {{
              currentApplication.remark || '-'
            }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentApplication.rejectReason" label="驳回原因">
            {{ currentApplication.rejectReason }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentApplication.supplementReason" label="补充材料说明">
            {{ currentApplication.supplementReason }}
          </el-descriptions-item>
          <el-descriptions-item label="结算金额">
            {{
              formatFenCurrency(settlementAmountOf(currentApplication))
            }}
          </el-descriptions-item>
          <el-descriptions-item label="应退金额">
            {{
              formatFenCurrency(currentApplication.refundAmount)
            }}
          </el-descriptions-item>
          <el-descriptions-item label="申请时间">
            {{
              formatDateTime(currentApplication.createdAt)
            }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="currentApplication.attachments?.length" class="attachment-list">
          <h3>补充材料</h3>
          <el-image
            v-for="item in currentApplication.attachments"
            :key="item.url"
            :src="item.url"
            :preview-src-list="currentApplication.attachments.map((attachment) => attachment.url)"
            fit="cover"
            class="attachment-image"
          />
        </div>
        <div class="drawer-actions">
          <el-button type="primary" @click="openInspectionArchive(currentApplication)">
            退租验房
          </el-button>
        </div>
      </template>
    </el-drawer>

    <el-dialog v-model="actionDialogVisible" :title="actionTitle" width="460px">
      <el-form label-position="top">
        <el-form-item v-if="actionMode === 'reject'" label="驳回原因" required>
          <el-input
            v-model="actionForm.rejectReason"
            type="textarea"
            :rows="4"
            placeholder="请输入驳回原因"
          />
        </el-form-item>
        <el-form-item v-if="actionMode === 'supplement'" label="补充材料说明" required>
          <el-input
            v-model="actionForm.supplementReason"
            type="textarea"
            :rows="4"
            placeholder="例如：请补充水电表照片、房屋现状照片"
          />
        </el-form-item>
        <template v-if="actionMode === 'settlement'">
          <el-form-item label="结算扣款金额">
            <el-input-number
              v-model="actionForm.settlementAmount"
              :min="0"
              :step="100"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="应退金额">
            <el-input-number
              v-model="actionForm.refundAmount"
              :min="0"
              :step="100"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="结算备注">
            <el-input
              v-model="actionForm.remark"
              type="textarea"
              :rows="3"
              placeholder="可填写扣款说明或退款备注"
            />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="actionDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submitAction">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.cell-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong {
    font-size: 13px;
  }

  span,
  small {
    font-size: 12px;
  }
}

.detail-title {
  margin: 0 0 16px;
  font-size: 20px;
  letter-spacing: 0;
}

.attachment-list {
  margin-top: 20px;

  h3 {
    margin: 0 0 12px;
    font-size: 16px;
  }
}

.attachment-image {
  width: 96px;
  height: 96px;
  margin: 0 10px 10px 0;
  border-radius: 8px;
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
