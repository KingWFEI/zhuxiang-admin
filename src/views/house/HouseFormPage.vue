<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Check, Plus, Delete, Picture } from '@element-plus/icons-vue'
import DataSourceNotice from '@/components/DataSourceNotice.vue'
import PageHeader from '@/components/PageHeader.vue'
import {
  createHouse,
  getFacilityDictionary,
  getHouseTagDictionary,
  uploadHouseImage,
  type CreateHouseRequest,
  type FacilityItem,
  type HouseTagItem,
} from '@/api/house'

interface ImageItem {
  uid: string
  url: string
  fileId: string
}

interface HouseForm extends Omit<CreateHouseRequest, 'price' | 'imageUrls'> {
  price: number | undefined
  deposit?: number
}

const UPLOAD_LIMITS = {
  maxSize: 5 * 1024 * 1024,
  accept: '.jpg,.jpeg,.png,.webp',
  acceptLabel: 'JPG、PNG、WebP',
  maxTotal: 20,
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
  facilityIds: [],
  tagIds: [],
})

const images = ref<ImageItem[]>([])
const coverUploading = ref(false)
const extraUploading = ref(false)

const facilities = ref<FacilityItem[]>([])
const tags = ref<HouseTagItem[]>([])
const facilityLoading = ref(false)
const tagLoading = ref(false)

const hasCover = computed(() => images.value.length > 0)
const coverUrl = computed(() => images.value[0]?.url ?? '')
const canAddMore = computed(() => images.value.length < UPLOAD_LIMITS.maxTotal)

function generateUid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function validateFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext ?? '')) {
    return `仅支持 ${UPLOAD_LIMITS.acceptLabel} 格式`
  }
  if (file.size > UPLOAD_LIMITS.maxSize) {
    return '文件大小不能超过 5MB'
  }
  return null
}

async function handleCoverUpload(file: File) {
  const error = validateFile(file)
  if (error) { ElMessage.error(error); return }
  coverUploading.value = true
  try {
    const result = await uploadHouseImage(file)
    const item = { uid: generateUid(), url: result.url, fileId: result.fileId }
    if (images.value.length > 0) {
      images.value[0] = item
    } else {
      images.value.push(item)
    }
    houseForm.coverImage = result.url
    ElMessage.success('封面上传成功')
  } catch {
    // request interceptor already shows error message
  } finally {
    coverUploading.value = false
  }
}

async function handleExtraUpload(file: File) {
  const error = validateFile(file)
  if (error) { ElMessage.error(error); return }
  extraUploading.value = true
  try {
    const result = await uploadHouseImage(file)
    images.value.push({ uid: generateUid(), url: result.url, fileId: result.fileId })
    ElMessage.success('图片上传成功')
  } catch {
    // request interceptor already shows error message
  } finally {
    extraUploading.value = false
  }
}

function removeImage(index: number) {
  images.value.splice(index, 1)
  if (index === 0) {
    houseForm.coverImage = coverUrl.value
  }
}

function onCoverFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) handleCoverUpload(file)
  input.value = ''
}

function onExtraFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) handleExtraUpload(file)
  input.value = ''
}

const rules: FormRules<HouseForm> = {
  title: [{ required: true, message: '请输入房源标题', trigger: 'blur' }],
  location: [{ required: true, message: '请输入区域或商圈', trigger: 'blur' }],
  communityId: [{ required: true, message: '请输入小区 ID', trigger: 'blur' }],
  landlordId: [{ required: true, message: '请输入房东用户 ID', trigger: 'blur' }],
  price: [{ required: true, message: '请输入月租金', trigger: 'change' }],
  rentType: [{ required: true, message: '请选择租赁类型', trigger: 'change' }],
}

function validateImages(): boolean {
  if (images.value.length === 0) {
    ElMessage.error('请至少上传一张封面图片')
    return false
  }
  return true
}

async function handleSubmit() {
  if (submitting.value) return
  if (!validateImages()) return
  if (!validateFacilityTags()) return
  if (!(await formRef.value?.validate().catch(() => false))) return

  submitting.value = true
  try {
    const imageUrls = images.value.map((img) => img.url)
    const payload: CreateHouseRequest = {
      ...houseForm,
      coverImage: coverUrl.value,
      imageUrls,
      price: Math.round((houseForm.price as number) * 100),
      deposit: houseForm.deposit == null ? undefined : Math.round(houseForm.deposit * 100),
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
  images.value = []
  houseForm.coverImage = ''
  houseForm.facilityIds = []
  houseForm.tagIds = []
}

function validateFacilityTags(): boolean {
  if (houseForm.facilityIds.length === 0) {
    ElMessage.error('请至少选择一项设施')
    return false
  }
  if (houseForm.tagIds.length === 0) {
    ElMessage.error('请至少选择一个标签')
    return false
  }
  return true
}

async function fetchDictionaries() {
  facilityLoading.value = true
  tagLoading.value = true
  try {
    const [facData, tagData] = await Promise.all([getFacilityDictionary(), getHouseTagDictionary()])
    facilities.value = facData.filter(f => f.enabled)
    tags.value = tagData.filter(t => t.enabled)
  } finally {
    facilityLoading.value = false
    tagLoading.value = false
  }
}

onMounted(fetchDictionaries)
</script>

<template>
  <div class="page-container">
    <PageHeader title="新增房源" description="录入房源基础资料，创建后默认以草稿状态进入资产列表。">
      <template #actions><el-button :icon="ArrowLeft" @click="router.back()">返回</el-button></template>
    </PageHeader>
    <DataSourceNotice type="real" detail="图片通过 /api/admin/files/house-images/upload 上传；表单以元录入，提交时转换为分。" />

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
            <template #header><strong class="table-header__title">封面图片</strong></template>
            <div class="cover-upload-area" :class="{ 'has-cover': hasCover }">
              <template v-if="hasCover">
                <div class="cover-preview--uploaded">
                  <el-image :src="coverUrl" fit="cover" :preview-src-list="[coverUrl]" preview-teleported />
                  <span class="cover-badge">封面</span>
                </div>
                <div class="cover-actions">
                  <label class="upload-btn upload-btn--outline" :class="{ 'is-loading': coverUploading }">
                    <el-icon><Picture /></el-icon>
                    <span>{{ coverUploading ? '上传中...' : '重新上传封面' }}</span>
                    <input type="file" :accept="UPLOAD_LIMITS.accept" hidden @change="onCoverFileChange" :disabled="coverUploading" />
                  </label>
                </div>
              </template>
              <template v-else>
                <label class="upload-btn upload-btn--dashed" :class="{ 'is-loading': coverUploading }">
                  <el-icon :size="28"><Plus /></el-icon>
                  <span>{{ coverUploading ? '上传中...' : '上传封面图片' }}</span>
                  <small>支持 {{ UPLOAD_LIMITS.acceptLabel }}，不超过 5MB</small>
                  <input type="file" :accept="UPLOAD_LIMITS.accept" hidden @change="onCoverFileChange" :disabled="coverUploading" />
                </label>
              </template>
            </div>
          </el-card>

          <el-card class="surface-card" shadow="never">
            <template #header>
              <div class="card-header-row">
                <strong class="table-header__title">房源图片</strong>
                <span class="image-count">{{ images.length }}/{{ UPLOAD_LIMITS.maxTotal }}</span>
              </div>
            </template>
            <div class="image-grid">
              <div v-for="(img, idx) in images" :key="img.uid" class="image-grid__item">
                <div class="image-grid__preview">
                  <el-image :src="img.url" fit="cover" :preview-src-list="images.map(i => i.url)" :initial-index="idx" preview-teleported />
                  <span v-if="idx === 0" class="image-grid__badge">封面</span>
                  <button type="button" class="image-grid__remove" @click="removeImage(idx)" title="移除图片">
                    <el-icon :size="14"><Delete /></el-icon>
                  </button>
                </div>
              </div>
              <label v-if="canAddMore" class="image-grid__add" :class="{ 'is-loading': extraUploading }">
                <el-icon :size="24"><Plus /></el-icon>
                <span>{{ extraUploading ? '上传中...' : '添加图片' }}</span>
                <input type="file" :accept="UPLOAD_LIMITS.accept" hidden @change="onExtraFileChange" :disabled="extraUploading" />
              </label>
            </div>
            <p v-if="images.length === 0" class="image-hint">第一张上传的图片将作为封面，最多可上传 {{ UPLOAD_LIMITS.maxTotal }} 张</p>
            <p v-else class="image-hint">支持 {{ UPLOAD_LIMITS.acceptLabel }}，单张不超过 5MB，共 {{ UPLOAD_LIMITS.maxTotal }} 张</p>
          </el-card>

          <el-card class="surface-card" shadow="never">
            <template #header><strong class="table-header__title">配套设施</strong></template>
            <div v-loading="facilityLoading" class="check-group">
              <el-checkbox-group v-model="houseForm.facilityIds">
                <el-checkbox v-for="f in facilities" :key="f.id" :value="f.id" :label="f.id">{{ f.name }}</el-checkbox>
              </el-checkbox-group>
              <el-empty v-if="!facilityLoading && !facilities.length" description="暂无可用设施" :image-size="48" />
            </div>
          </el-card>

          <el-card class="surface-card" shadow="never">
            <template #header><strong class="table-header__title">房源标签</strong></template>
            <div v-loading="tagLoading" class="check-group">
              <el-checkbox-group v-model="houseForm.tagIds">
                <el-checkbox v-for="t in tags" :key="t.id" :value="t.id" :label="t.id">{{ t.name }}</el-checkbox>
              </el-checkbox-group>
              <el-empty v-if="!tagLoading && !tags.length" description="暂无可用标签" :image-size="48" />
            </div>
          </el-card>

          <el-card class="surface-card" shadow="never">
            <template #header><strong class="table-header__title">房源归属</strong></template>
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

// Cover upload
.cover-upload-area {
  display: flex; flex-direction: column; gap: 12px;
}
.cover-preview--uploaded {
  position: relative; width: 100%; aspect-ratio: 16 / 10; border-radius: 5px; overflow: hidden; background: #f6f8f7;
  .el-image { width: 100%; height: 100%; }
  .cover-badge {
    position: absolute; top: 8px; left: 8px; padding: 2px 8px; border-radius: 3px;
    background: rgba(0,0,0,.55); color: #fff; font-size: 11px; line-height: 1.6;
  }
}
.cover-actions { display: flex; justify-content: center; }

.upload-btn {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  cursor: pointer; transition: border-color .2s, background .2s;
  input { display: none; }
  &.is-loading { pointer-events: none; opacity: .7; }
}
.upload-btn--dashed {
  width: 100%; aspect-ratio: 16 / 10; border: 2px dashed #ccd5d1; border-radius: 5px;
  background: #f6f8f7; color: #86928c; font-size: 13px;
  small { font-size: 11px; color: #a8b2ad; }
  &:hover { border-color: #0052d9; color: #0052d9; }
}
.upload-btn--outline {
  flex-direction: row; padding: 6px 14px; border: 1px solid #ccd5d1; border-radius: 5px;
  background: #fff; color: #555; font-size: 12px;
  &:hover { border-color: #0052d9; color: #0052d9; }
}

// Image grid
.card-header-row { display: flex; align-items: center; justify-content: space-between; }
.image-count { font-size: 12px; color: #86928c; }
.image-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
}
.image-grid__item, .image-grid__add {
  aspect-ratio: 1; border-radius: 5px; overflow: hidden;
}
.image-grid__preview {
  position: relative; width: 100%; height: 100%; background: #f6f8f7;
  .el-image { width: 100%; height: 100%; }
}
.image-grid__badge {
  position: absolute; top: 4px; left: 4px; padding: 1px 6px; border-radius: 2px;
  background: rgba(0,0,0,.5); color: #fff; font-size: 10px; line-height: 1.6;
}
.image-grid__remove {
  position: absolute; top: 4px; right: 4px; display: flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border: none; border-radius: 3px; background: rgba(0,0,0,.45); color: #fff;
  cursor: pointer; opacity: 0; transition: opacity .2s;
  &:hover { background: rgba(0,0,0,.65); }
}
.image-grid__preview:hover .image-grid__remove { opacity: 1; }
.image-grid__add {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  border: 2px dashed #ccd5d1; background: #f6f8f7; color: #86928c; cursor: pointer;
  font-size: 12px; transition: border-color .2s, color .2s;
  &:hover { border-color: #0052d9; color: #0052d9; }
  &.is-loading { pointer-events: none; opacity: .7; }
  input { display: none; }
}
.image-hint { margin: 8px 0 0; color: #a8b2ad; font-size: 11px; line-height: 1.5; }

.check-group { min-height: 40px; .el-checkbox { display: flex; margin-bottom: 8px; } }
.switch-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 0; border-bottom: 1px solid #e6ebe9; }.switch-row:last-child { border-bottom: 0; }.switch-row div { display: flex; flex-direction: column; }.switch-row strong { font-size: 13px; }.switch-row span { margin-top: 4px; color: #86928c; font-size: 11px; line-height: 1.4; }.form-actions { display: flex; justify-content: flex-end; gap: 8px; }
@media (max-width: 1050px) { .form-layout { grid-template-columns: 1fr; }.form-aside { display: grid; grid-template-columns: 1fr 1fr; }.form-actions { grid-column: 1 / -1; } }
@media (max-width: 640px) { .form-grid--two, .form-aside { grid-template-columns: 1fr; }.span-two { grid-column: auto; }.form-actions { grid-column: auto; }.form-actions .el-button { flex: 1; } }
</style>
