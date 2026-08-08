<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getLandlordAuthDetail, getLandlordAuthList, reviewLandlordAuth,
  type LandlordAuthDetail, type LandlordAuthListItem, type LandlordAuthStatus,
} from '@/api/landlordAuth'

const loading = ref(false)
const reviewing = ref(false)
const rows = ref<LandlordAuthListItem[]>([])
const total = ref(0)
const detailVisible = ref(false)
const detail = ref<LandlordAuthDetail | null>(null)
const query = reactive<{ status?: LandlordAuthStatus; keyword: string; page: number; pageSize: number }>({
  status: 'PENDING', keyword: '', page: 1, pageSize: 20,
})
const statusMeta: Record<LandlordAuthStatus, { label: string; type: 'warning' | 'success' | 'danger' | 'info' }> = {
  PENDING: { label: '待审核', type: 'warning' }, APPROVED: { label: '已通过', type: 'success' },
  REJECTED: { label: '已驳回', type: 'danger' }, SUPERSEDED: { label: '已被新申请替代', type: 'info' },
}
const proofLabels: Record<string, string> = {
  PROPERTY_CERTIFICATE: '房产证', PURCHASE_CONTRACT: '购房合同', LEASE_CERTIFICATE: '租赁凭证',
  COURT_DECISION: '法院判决书/继承公证书', OTHER: '其他权属证明',
}

async function load() {
  loading.value = true
  try {
    const result = await getLandlordAuthList({ status: query.status, keyword: query.keyword.trim() || undefined, page: query.page, pageSize: query.pageSize })
    rows.value = result.items
    total.value = result.total
  } finally { loading.value = false }
}
async function openDetail(id: string) {
  detailVisible.value = true
  detail.value = null
  detail.value = await getLandlordAuthDetail(id)
}
async function approve() {
  if (!detail.value) return
  await ElMessageBox.confirm('通过后用户会立即升级为房东并收到通知，确认通过吗？', '通过房东认证', { confirmButtonText: '确认通过', cancelButtonText: '取消', type: 'success' })
  reviewing.value = true
  try {
    detail.value = await reviewLandlordAuth(detail.value.id, 'APPROVED')
    ElMessage.success('房东认证已通过')
    await load()
  } finally { reviewing.value = false }
}
async function reject() {
  if (!detail.value) return
  const result = await ElMessageBox.prompt('请说明材料缺失或不通过原因，用户将收到该内容。', '驳回房东认证', {
    confirmButtonText: '确认驳回', cancelButtonText: '取消', inputType: 'textarea',
    inputValidator: (value) => value.trim().length >= 4 || '请至少填写4个字的驳回原因',
  })
  reviewing.value = true
  try {
    detail.value = await reviewLandlordAuth(detail.value.id, 'REJECTED', result.value.trim())
    ElMessage.success('已驳回并通知用户')
    await load()
  } finally { reviewing.value = false }
}
function search() { query.page = 1; void load() }
onMounted(load)
</script>

<template>
  <section class="page-card">
    <header class="page-header">
      <div><h2>房东认证审核</h2><p>核验申请人的身份、房源权属证明和联系方式</p></div>
      <el-button @click="load">刷新</el-button>
    </header>
    <div class="filters">
      <el-select v-model="query.status" clearable placeholder="全部状态" style="width: 180px" @change="search">
        <el-option v-for="(item, key) in statusMeta" :key="key" :label="item.label" :value="key" />
      </el-select>
      <el-input v-model="query.keyword" clearable placeholder="申请编号、姓名或手机号" style="width: 280px" @keyup.enter="search" />
      <el-button type="primary" @click="search">查询</el-button>
    </div>
    <el-table v-loading="loading" :data="rows" stripe>
      <el-table-column prop="applicationNo" label="申请编号" min-width="190" />
      <el-table-column label="申请人" min-width="150"><template #default="{ row }"><strong>{{ row.applicantName }}</strong><div class="muted">{{ row.userNickname || '-' }}</div></template></el-table-column>
      <el-table-column prop="contactPhone" label="联系电话" width="140" />
      <el-table-column label="证明材料" width="100"><template #default="{ row }">{{ row.proofCount }} 份</template></el-table-column>
      <el-table-column label="状态" width="150"><template #default="{ row }"><el-tag :type="statusMeta[row.status].type">{{ statusMeta[row.status].label }}</el-tag></template></el-table-column>
      <el-table-column prop="createdAt" label="提交时间" min-width="180" />
      <el-table-column fixed="right" label="操作" width="100"><template #default="{ row }"><el-button link type="primary" @click="openDetail(row.id)">查看审核</el-button></template></el-table-column>
    </el-table>
    <el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" class="pagination" layout="total, sizes, prev, pager, next" :total="total" @change="load" />
  </section>

  <el-drawer v-model="detailVisible" title="房东认证详情" size="720px">
    <div v-if="detail" class="detail">
      <div class="detail-status"><div><span>申请编号</span><strong>{{ detail.applicationNo }}</strong></div><el-tag :type="statusMeta[detail.status].type" size="large">{{ statusMeta[detail.status].label }}</el-tag></div>
      <el-descriptions title="个人信息" :column="2" border>
        <el-descriptions-item label="姓名">{{ detail.realName }}</el-descriptions-item><el-descriptions-item label="身份证号">{{ detail.idCardMasked }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ detail.contactPhone }}</el-descriptions-item><el-descriptions-item label="微信号">{{ detail.contactWechat || '-' }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ detail.contactEmail || '-' }}</el-descriptions-item><el-descriptions-item label="方便联系时间">{{ detail.preferredContactTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系地址" :span="2">{{ detail.contactAddress || '-' }}</el-descriptions-item>
      </el-descriptions>
      <h3>身份证照片</h3>
      <div class="image-grid">
        <figure><el-image :src="detail.idCardFrontUrl" :preview-src-list="[detail.idCardFrontUrl, detail.idCardBackUrl]" fit="cover" /><figcaption>身份证人像面</figcaption></figure>
        <figure><el-image :src="detail.idCardBackUrl" :preview-src-list="[detail.idCardFrontUrl, detail.idCardBackUrl]" fit="cover" /><figcaption>身份证国徽面</figcaption></figure>
      </div>
      <h3>房源权属证明</h3>
      <div class="proof-grid"><figure v-for="proof in detail.proofs" :key="proof.id"><el-image :src="proof.fileUrl" :preview-src-list="detail.proofs.map(item => item.fileUrl)" fit="cover" /><figcaption>{{ proofLabels[proof.proofType] || proof.proofType }}</figcaption></figure></div>
      <el-alert v-if="detail.rejectReason" :title="`驳回原因：${detail.rejectReason}`" type="error" :closable="false" show-icon />
      <div v-if="detail.status === 'PENDING'" class="review-actions"><el-button type="danger" plain :loading="reviewing" @click="reject">驳回</el-button><el-button type="success" :loading="reviewing" @click="approve">通过认证</el-button></div>
    </div>
    <el-skeleton v-else :rows="8" animated />
  </el-drawer>
</template>

<style scoped>
.page-card{padding:24px;border-radius:14px;background:#fff}.page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}.page-header h2{margin:0 0 6px;color:#18231f}.page-header p,.muted{margin:0;color:#8a9691;font-size:13px}.filters{display:flex;gap:12px;margin-bottom:18px}.pagination{justify-content:flex-end;margin-top:20px}.detail{display:grid;gap:22px;padding:0 4px 28px}.detail-status{display:flex;align-items:center;justify-content:space-between;padding:18px;border-radius:12px;background:#f4f8f6}.detail-status div{display:grid;gap:5px}.detail-status span{color:#7d8984;font-size:13px}.detail h3{margin:2px 0 -8px}.image-grid,.proof-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}figure{margin:0;overflow:hidden;border:1px solid #e5ebe8;border-radius:12px;background:#fafcfb}figure .el-image{width:100%;height:180px;display:block}figcaption{padding:10px 12px;color:#53605a;text-align:center}.review-actions{position:sticky;bottom:0;display:flex;justify-content:flex-end;padding:16px 0 0;background:#fff}
</style>
