<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Check } from '@element-plus/icons-vue'
import DataSourceNotice from '@/components/DataSourceNotice.vue'
import PageHeader from '@/components/PageHeader.vue'
import { createHouse, type CreateHouseRequest } from '@/api/house'

interface HouseForm extends Omit<CreateHouseRequest, 'price'> {
  price: number | undefined
  deposit?: number
}

const router = useRouter()
const formRef = ref<FormInstance>()
const submitting = ref(false)
const houseForm = reactive<HouseForm>({
  title: '', coverImage: '', location: '', communityId: '', landlordId: '',
  price: undefined, deposit: undefined, rentType: 'long_rent', address: '', building: '',
  unit: '', room: '', paymentMethod: '押一付一', roomType: '', area: undefined,
  floor: '', orientation: '', decoration: '', availableDate: '', metro: '', description: '',
  isSmartLockSupported: false, isSelfViewingSupported: false,
})

const rules: FormRules<HouseForm> = {
  title: [{ required: true, message: '请输入房源标题', trigger: 'blur' }],
  coverImage: [
    { required: true, message: '请输入封面图片地址', trigger: 'blur' },
    { type: 'url', message: '请输入有效的图片 URL', trigger: 'blur' },
  ],
  location: [{ required: true, message: '请输入区域或商圈', trigger: 'blur' }],
  communityId: [{ required: true, message: '请输入小区 ID', trigger: 'blur' }],
  landlordId: [{ required: true, message: '请输入房东用户 ID', trigger: 'blur' }],
  price: [{ required: true, message: '请输入月租金', trigger: 'change' }],
  rentType: [{ required: true, message: '请选择租赁类型', trigger: 'change' }],
}

async function handleSubmit() {
  if (submitting.value || !(await formRef.value?.validate().catch(() => false))) return
  submitting.value = true
  try {
    const payload: CreateHouseRequest = {
      ...houseForm,
      price: Math.round((houseForm.price as number) * 100),
      deposit:
        houseForm.deposit == null ? undefined : Math.round(houseForm.deposit * 100),
      availableDate: houseForm.availableDate || undefined,
    }
    await createHouse(payload)
    ElMessage.success('房源创建成功')
    await router.push('/houses')
  } finally {
    submitting.value = false
  }
}

function handleReset() {
  formRef.value?.resetFields()
}
</script>

<template>
  <div class="page-container">
    <PageHeader title="新增房源" description="录入房源基础资料，创建后默认以草稿状态进入资产列表。">
      <template #actions><el-button :icon="ArrowLeft" @click="router.back()">返回</el-button></template>
    </PageHeader>
    <DataSourceNotice type="real" detail="提交数据将调用 POST /admin/houses；表单以元录入，提交时转换为分。" />

    <el-form ref="formRef" :model="houseForm" :rules="rules" label-position="top" @submit.prevent="handleSubmit">
      <div class="form-layout">
        <div class="form-main">
          <el-card class="surface-card" shadow="never">
            <template #header><strong class="table-header__title">基础信息</strong></template>
            <div class="form-grid form-grid--two">
              <el-form-item label="房源标题" prop="title" class="span-two"><el-input v-model="houseForm.title" maxlength="80" show-word-limit placeholder="例如：中央公园旁精装两居" /></el-form-item>
              <el-form-item label="租赁类型" prop="rentType"><el-select v-model="houseForm.rentType"><el-option label="长租" value="long_rent" /><el-option label="短租" value="short_rent" /><el-option label="民宿" value="homestay" /><el-option label="推荐" value="recommended" /></el-select></el-form-item>
              <el-form-item label="月租金（元）" prop="price"><el-input-number v-model="houseForm.price" :min="0" :max="1000000" :step="100" controls-position="right" /></el-form-item>
              <el-form-item label="押金（元）"><el-input-number v-model="houseForm.deposit" :min="0" :max="1000000" :step="100" controls-position="right" /></el-form-item>
              <el-form-item label="付款方式"><el-select v-model="houseForm.paymentMethod" allow-create filterable><el-option label="押一付一" value="押一付一" /><el-option label="押一付三" value="押一付三" /><el-option label="半年付" value="半年付" /></el-select></el-form-item>
              <el-form-item label="户型"><el-input v-model="houseForm.roomType" placeholder="例如：2室1厅1卫" /></el-form-item>
              <el-form-item label="面积（㎡）"><el-input-number v-model="houseForm.area" :min="0" :precision="1" controls-position="right" /></el-form-item>
            </div>
          </el-card>

          <el-card class="surface-card" shadow="never">
            <template #header><strong class="table-header__title">位置与房间</strong></template>
            <div class="form-grid form-grid--two">
              <el-form-item label="区域或商圈" prop="location"><el-input v-model="houseForm.location" placeholder="例如：渝北区 · 中央公园" /></el-form-item>
              <el-form-item label="小区 ID" prop="communityId"><el-input v-model="houseForm.communityId" placeholder="后端暂未提供小区选择接口" /></el-form-item>
              <el-form-item label="详细地址" class="span-two"><el-input v-model="houseForm.address" placeholder="街道及门牌信息" /></el-form-item>
              <el-form-item label="楼栋"><el-input v-model="houseForm.building" /></el-form-item>
              <el-form-item label="单元"><el-input v-model="houseForm.unit" /></el-form-item>
              <el-form-item label="房号"><el-input v-model="houseForm.room" /></el-form-item>
              <el-form-item label="楼层"><el-input v-model="houseForm.floor" placeholder="例如：12/28层" /></el-form-item>
              <el-form-item label="朝向"><el-select v-model="houseForm.orientation" clearable><el-option v-for="item in ['朝南','朝北','朝东','朝西','南北通透']" :key="item" :label="item" :value="item" /></el-select></el-form-item>
              <el-form-item label="装修"><el-select v-model="houseForm.decoration" clearable><el-option v-for="item in ['精装修','简装修','毛坯','豪华装修']" :key="item" :label="item" :value="item" /></el-select></el-form-item>
            </div>
          </el-card>

          <el-card class="surface-card" shadow="never">
            <template #header><strong class="table-header__title">租住说明</strong></template>
            <div class="form-grid form-grid--two">
              <el-form-item label="可入住日期"><el-date-picker v-model="houseForm.availableDate" type="date" value-format="YYYY-MM-DD" /></el-form-item>
              <el-form-item label="地铁交通"><el-input v-model="houseForm.metro" placeholder="例如：距 10 号线 500m" /></el-form-item>
              <el-form-item label="房源描述" class="span-two"><el-input v-model="houseForm.description" type="textarea" :rows="5" maxlength="1000" show-word-limit /></el-form-item>
            </div>
          </el-card>
        </div>

        <aside class="form-aside">
          <el-card class="surface-card" shadow="never">
            <template #header><strong class="table-header__title">封面与归属</strong></template>
            <el-form-item label="封面图片 URL" prop="coverImage"><el-input v-model="houseForm.coverImage" placeholder="https://..." /></el-form-item>
            <div class="cover-preview"><el-image v-if="houseForm.coverImage" :src="houseForm.coverImage" fit="cover"><template #error><span>图片无法加载</span></template></el-image><span v-else>封面预览</span></div>
            <el-form-item label="房东用户 ID" prop="landlordId"><el-input v-model="houseForm.landlordId" placeholder="后端暂未提供房东选择接口" /></el-form-item>
          </el-card>
          <el-card class="surface-card" shadow="never">
            <template #header><strong class="table-header__title">智能能力</strong></template>
            <div class="switch-row"><div><strong>支持智能门锁</strong><span>后续可在门锁操作台绑定设备</span></div><el-switch v-model="houseForm.isSmartLockSupported" /></div>
            <div class="switch-row"><div><strong>支持自助看房</strong><span>标记房源可配置自助看房</span></div><el-switch v-model="houseForm.isSelfViewingSupported" /></div>
          </el-card>
          <div class="form-actions"><el-button @click="handleReset">重置</el-button><el-button type="primary" :icon="Check" :loading="submitting" @click="handleSubmit">创建房源</el-button></div>
        </aside>
      </div>
    </el-form>
  </div>
</template>

<style scoped lang="scss">
.form-layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
.form-main, .form-aside { display: flex; min-width: 0; flex-direction: column; gap: 16px; }
.form-grid { display: grid; gap: 0 18px; }.form-grid--two { grid-template-columns: repeat(2, minmax(0, 1fr)); }.span-two { grid-column: 1 / -1; }
.el-select, .el-input-number, .el-date-editor { width: 100%; }
.cover-preview { display: grid; width: 100%; aspect-ratio: 16 / 10; margin: -4px 0 18px; place-items: center; overflow: hidden; color: #8c9892; border: 1px dashed #ccd5d1; border-radius: 5px; background: #f6f8f7; font-size: 12px; }
.cover-preview .el-image { width: 100%; height: 100%; }.switch-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 0; border-bottom: 1px solid #e6ebe9; }.switch-row:last-child { border-bottom: 0; }.switch-row div { display: flex; flex-direction: column; }.switch-row strong { font-size: 13px; }.switch-row span { margin-top: 4px; color: #86928c; font-size: 11px; line-height: 1.4; }.form-actions { display: flex; justify-content: flex-end; gap: 8px; }
@media (max-width: 1050px) { .form-layout { grid-template-columns: 1fr; }.form-aside { display: grid; grid-template-columns: 1fr 1fr; }.form-actions { grid-column: 1 / -1; } }
@media (max-width: 640px) { .form-grid--two, .form-aside { grid-template-columns: 1fr; }.span-two { grid-column: auto; }.form-actions { grid-column: auto; }.form-actions .el-button { flex: 1; } }
</style>
