<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Delete, Edit, Plus, Refresh, Select, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules, type UploadRequestOptions } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import {
  createAdvertisement,
  deleteAdvertisement,
  getAdvertisements,
  setAdvertisementEnabled,
  searchAdvertisementHouseOptions,
  updateAdvertisement,
  uploadAdvertisementImage,
  type AdvertisementItem,
  type AdvertisementHouseOption,
  type AdvertisementPayload,
  type AdvertisementPosition,
  type AdvertisementStatus,
  type AdvertisementTargetType,
} from '@/api/advertisement'
import { getHouseDetail } from '@/api/house'
import { formatFenCurrency } from '@/utils/format'

const loading = ref(false)
const saving = ref(false)
const imageUploading = ref(false)
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const editingId = ref<string | null>(null)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const items = ref<AdvertisementItem[]>([])
const filters = reactive<{ keyword: string; position?: AdvertisementPosition; status?: AdvertisementStatus }>({ keyword: '' })
const scheduleRange = ref<[string, string] | []>([])
const houseKeyword = ref('')
const houseOptions = ref<AdvertisementHouseOption[]>([])
const selectedHouse = ref<AdvertisementHouseOption | null>(null)
const houseSearching = ref(false)
const houseSearched = ref(false)
let houseSearchTimer: ReturnType<typeof setTimeout> | undefined
const form = reactive<AdvertisementPayload>({
  title: '', description: '', imageUrl: '', imageFileId: null,
  targetType: 'none', targetValue: '', position: 'home_banner',
  enabled: true, sortOrder: 0, startTime: null, endTime: null,
})

const rules: FormRules = {
  title: [{ required: true, message: '请输入广告标题', trigger: 'blur' }],
  imageUrl: [{ required: true, message: '请上传广告图片', trigger: 'change' }],
  position: [{ required: true, message: '请选择广告位置', trigger: 'change' }],
  targetType: [{ required: true, message: '请选择跳转类型', trigger: 'change' }],
}

const targetPlaceholder = computed(() => ({
  house: '', house_list: '', url: '请输入 https:// 开头的完整链接', none: '',
}[form.targetType]))

const statusMeta: Record<AdvertisementStatus, { label: string; type: 'success' | 'warning' | 'info' | 'danger' }> = {
  ACTIVE: { label: '展示中', type: 'success' },
  SCHEDULED: { label: '待生效', type: 'warning' },
  EXPIRED: { label: '已过期', type: 'info' },
  DISABLED: { label: '已停用', type: 'danger' },
}

const positionLabel = (value: AdvertisementPosition) => value === 'home_banner' ? '首页 Banner' : '首页信息流'
const targetLabel = (value: AdvertisementTargetType) => ({ none: '无跳转', house: '房源详情', house_list: '找房列表', url: '外部链接' }[value])
const formatTime = (value: string | null) => value ? value.replace('T', ' ').slice(0, 16) : '不限'

async function load() {
  loading.value = true
  try {
    const result = await getAdvertisements({
      keyword: filters.keyword.trim() || undefined,
      position: filters.position,
      status: filters.status,
      page: page.value,
      pageSize: pageSize.value,
    })
    items.value = result.items
    total.value = result.total
  } finally {
    loading.value = false
  }
}

function search() { page.value = 1; void load() }
function resetFilters() { filters.keyword = ''; filters.position = undefined; filters.status = undefined; search() }

async function openDialog(item?: AdvertisementItem) {
  editingId.value = item?.id ?? null
  form.title = item?.title ?? ''
  form.description = item?.description ?? ''
  form.imageUrl = item?.imageUrl ?? ''
  form.imageFileId = null
  form.targetType = item?.targetType ?? 'none'
  form.targetValue = item?.targetValue ?? ''
  form.position = item?.position ?? 'home_banner'
  form.enabled = item?.enabled ?? true
  form.sortOrder = item?.sortOrder ?? 0
  scheduleRange.value = item?.startTime && item?.endTime ? [item.startTime, item.endTime] : []
  form.startTime = item?.startTime ?? null
  form.endTime = item?.endTime ?? null
  houseKeyword.value = ''
  houseOptions.value = []
  selectedHouse.value = null
  houseSearched.value = false
  dialogVisible.value = true
  if (item?.targetType === 'house' && item.targetValue) {
    try {
      const house = await getHouseDetail(item.targetValue)
      selectedHouse.value = {
        id: house.id,
        title: house.title,
        coverImage: house.coverImage ?? '',
        community: house.community ?? '',
        location: house.location ?? '',
        price: house.price ?? 0,
      }
      houseKeyword.value = house.title
    } catch {
      // 保留原 houseId，避免历史广告因房源已下架而无法编辑其他字段。
    }
  }
}

function handleTargetTypeChange(value: AdvertisementTargetType) {
  form.targetValue = ''
  selectedHouse.value = null
  houseKeyword.value = ''
  houseOptions.value = []
  houseSearched.value = false
  if (value !== 'house' && houseSearchTimer) clearTimeout(houseSearchTimer)
}

function scheduleHouseSearch(value: string) {
  selectedHouse.value = null
  form.targetValue = ''
  houseOptions.value = []
  houseSearched.value = false
  if (houseSearchTimer) clearTimeout(houseSearchTimer)
  const keyword = value.trim()
  if (!keyword) return
  houseSearchTimer = setTimeout(() => void searchHouses(keyword), 500)
}

async function searchHouses(keyword = houseKeyword.value.trim()) {
  if (!keyword) return
  houseSearching.value = true
  try {
    houseOptions.value = await searchAdvertisementHouseOptions(keyword)
    houseSearched.value = true
  } finally {
    houseSearching.value = false
  }
}

function selectHouse(house: AdvertisementHouseOption) {
  selectedHouse.value = house
  form.targetValue = house.id
  houseKeyword.value = house.title
}

function handleScheduleChange(value: [string, string] | null) {
  form.startTime = value?.[0] ?? null
  form.endTime = value?.[1] ?? null
}

async function handleImageUpload(options: UploadRequestOptions) {
  imageUploading.value = true
  try {
    const result = await uploadAdvertisementImage(options.file as File)
    form.imageUrl = result.url
    form.imageFileId = result.fileId
    options.onSuccess(result)
    ElMessage.success('广告图片上传成功')
  } catch (error) {
    options.onError(error as Error)
  } finally {
    imageUploading.value = false
  }
}

async function save() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (form.targetType !== 'none' && !form.targetValue?.trim()) {
    ElMessage.warning(form.targetType === 'house' ? '请从搜索结果中选择房源' : '请填写跳转目标')
    return
  }
  saving.value = true
  try {
    const payload: AdvertisementPayload = {
      ...form,
      title: form.title.trim(),
      description: form.description?.trim() || null,
      targetValue: form.targetType === 'none' ? null : form.targetValue?.trim(),
    }
    if (editingId.value) {
      await updateAdvertisement(editingId.value, payload)
      ElMessage.success('广告已更新')
    } else {
      await createAdvertisement(payload)
      ElMessage.success('广告已创建')
    }
    dialogVisible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function toggleEnabled(item: AdvertisementItem, enabled: string | number | boolean) {
  try {
    await setAdvertisementEnabled(item.id, Boolean(enabled))
    ElMessage.success(Boolean(enabled) ? '广告已启用' : '广告已停用')
    await load()
  } catch {
    item.enabled = !Boolean(enabled)
  }
}

async function remove(item: AdvertisementItem) {
  try {
    await ElMessageBox.confirm(`确定删除广告「${item.title}」吗？删除后无法恢复。`, '删除广告', {
      type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消',
    })
  } catch { return }
  await deleteAdvertisement(item.id)
  ElMessage.success('广告已删除')
  if (items.value.length === 1 && page.value > 1) page.value--
  await load()
}

onMounted(load)
</script>

<template>
  <div class="page-container">
    <PageHeader title="广告管理" description="统一配置移动端首页 Banner 与推荐信息流广告，支持定时生效、跳转目标和展示顺序。">
      <template #actions>
        <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openDialog()">新建广告</el-button>
      </template>
    </PageHeader>

    <el-card shadow="never" class="filter-card">
      <el-form inline @submit.prevent="search">
        <el-form-item label="关键词"><el-input v-model="filters.keyword" clearable placeholder="标题或描述" @keyup.enter="search" /></el-form-item>
        <el-form-item label="广告位置">
          <el-select v-model="filters.position" clearable placeholder="全部位置" style="width: 150px">
            <el-option label="首页 Banner" value="home_banner" />
            <el-option label="首页信息流" value="home_feed" />
          </el-select>
        </el-form-item>
        <el-form-item label="展示状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 140px">
            <el-option label="展示中" value="ACTIVE" /><el-option label="待生效" value="SCHEDULED" />
            <el-option label="已过期" value="EXPIRED" /><el-option label="已停用" value="DISABLED" />
          </el-select>
        </el-form-item>
        <el-form-item><el-button type="primary" @click="search">查询</el-button><el-button @click="resetFilters">重置</el-button></el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" v-loading="loading">
      <el-table :data="items" row-key="id">
        <el-table-column label="广告内容" min-width="330">
          <template #default="{ row }">
            <div class="ad-cell"><el-image :src="row.imageUrl" fit="cover" class="ad-thumb"><template #error><div class="image-error">暂无图片</div></template></el-image>
              <div class="ad-copy"><strong>{{ row.title }}</strong><span>{{ row.description || '暂无描述' }}</span></div></div>
          </template>
        </el-table-column>
        <el-table-column label="位置" width="130"><template #default="{ row }"><el-tag effect="plain">{{ positionLabel(row.position) }}</el-tag></template></el-table-column>
        <el-table-column label="跳转" min-width="170"><template #default="{ row }"><div class="target-cell"><span>{{ targetLabel(row.targetType) }}</span><small v-if="row.targetValue">{{ row.targetValue }}</small></div></template></el-table-column>
        <el-table-column label="展示周期" min-width="220"><template #default="{ row }"><div class="time-cell"><span>{{ formatTime(row.startTime) }}</span><span>至 {{ formatTime(row.endTime) }}</span></div></template></el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="75" />
        <el-table-column label="状态" width="105"><template #default="{ row }"><el-tag :type="statusMeta[row.displayStatus].type">{{ statusMeta[row.displayStatus].label }}</el-tag></template></el-table-column>
        <el-table-column label="启用" width="85"><template #default="{ row }"><el-switch :model-value="row.enabled" @change="value => toggleEnabled(row, value)" /></template></el-table-column>
        <el-table-column label="操作" width="150" fixed="right"><template #default="{ row }"><el-button link type="primary" :icon="Edit" @click="openDialog(row)">编辑</el-button><el-button link type="danger" :icon="Delete" @click="remove(row)">删除</el-button></template></el-table-column>
        <template #empty><el-empty description="暂无广告，点击右上角创建第一条广告" /></template>
      </el-table>
      <div class="pagination"><el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" layout="total, sizes, prev, pager, next" @current-change="load" @size-change="search" /></div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑广告' : '新建广告'" width="720px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="form-grid">
          <el-form-item label="广告标题" prop="title"><el-input v-model="form.title" maxlength="100" show-word-limit placeholder="用于运营识别，也会随广告返回移动端" /></el-form-item>
          <el-form-item label="广告位置" prop="position"><el-radio-group v-model="form.position"><el-radio-button value="home_banner">首页 Banner</el-radio-button><el-radio-button value="home_feed">首页信息流</el-radio-button></el-radio-group></el-form-item>
        </div>
        <el-form-item label="广告描述"><el-input v-model="form.description" type="textarea" :rows="2" maxlength="500" show-word-limit placeholder="可选，用一句话说明活动内容" /></el-form-item>
        <el-form-item label="广告图片" prop="imageUrl">
          <el-upload class="image-uploader" :show-file-list="false" accept="image/jpeg,image/png,image/webp" :http-request="handleImageUpload">
            <el-image v-if="form.imageUrl" :src="form.imageUrl" fit="cover" class="upload-preview" />
            <div v-else class="upload-placeholder"><el-icon :size="30"><UploadFilled /></el-icon><span>{{ imageUploading ? '正在上传…' : '点击上传广告图片' }}</span><small>JPG / PNG / WebP，最大 5MB</small></div>
          </el-upload>
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="跳转类型" prop="targetType"><el-select v-model="form.targetType" style="width: 100%" @change="handleTargetTypeChange"><el-option label="无跳转" value="none" /><el-option label="房源详情" value="house" /><el-option label="外部链接" value="url" /></el-select></el-form-item>
          <el-form-item v-if="form.targetType !== 'none' && form.targetType !== 'house'" label="跳转目标"><el-input v-model="form.targetValue" :placeholder="targetPlaceholder" /></el-form-item>
        </div>
        <el-form-item v-if="form.targetType === 'house'" label="选择跳转房源">
          <div class="house-picker">
            <el-input
              v-model="houseKeyword"
              clearable
              placeholder="输入房源名称，停止输入 500ms 后自动搜索"
              :suffix-icon="houseSearching ? Refresh : undefined"
              @input="scheduleHouseSearch"
              @keyup.enter="searchHouses()"
            />
            <div v-if="selectedHouse" class="selected-house">
              <el-icon color="#3b82f6"><Select /></el-icon>
              <span>已选择：{{ selectedHouse.title }}</span>
              <small>{{ selectedHouse.community || selectedHouse.location }} · {{ formatFenCurrency(selectedHouse.price) }}/月</small>
            </div>
            <div v-if="houseOptions.length" class="house-options">
              <button
                v-for="house in houseOptions"
                :key="house.id"
                type="button"
                class="house-option"
                :class="{ selected: form.targetValue === house.id }"
                @click="selectHouse(house)"
              >
                <el-image :src="house.coverImage" fit="cover" class="house-cover"><template #error><div class="image-error">暂无图片</div></template></el-image>
                <span class="house-copy"><strong>{{ house.title }}</strong><small>{{ house.community || house.location || '暂无位置信息' }}</small><em>{{ formatFenCurrency(house.price) }}/月</em></span>
              </button>
            </div>
            <el-empty v-else-if="houseSearched && !houseSearching" :image-size="64" description="没有找到匹配的可展示房源" />
          </div>
        </el-form-item>
        <el-form-item label="展示时间"><el-date-picker v-model="scheduleRange" type="datetimerange" value-format="YYYY-MM-DDTHH:mm:ss" start-placeholder="开始时间（可不设）" end-placeholder="结束时间（可不设）" style="width: 100%" @change="handleScheduleChange" /></el-form-item>
        <div class="form-grid compact"><el-form-item label="排序值"><el-input-number v-model="form.sortOrder" :min="0" :max="9999" /><div class="field-tip">数值越小越靠前</div></el-form-item><el-form-item label="创建后启用"><el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" /></el-form-item></div>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" :loading="saving || imageUploading" @click="save">保存广告</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-container { display: grid; gap: 16px; }
.filter-card :deep(.el-card__body) { padding-bottom: 2px; }
.ad-cell { display: flex; align-items: center; gap: 14px; min-width: 0; }
.ad-thumb { width: 112px; height: 64px; flex: none; border-radius: 10px; background: #f3f6fb; }
.image-error { display: grid; place-items: center; width: 100%; height: 100%; color: #a7b0c0; font-size: 12px; }
.ad-copy, .target-cell, .time-cell { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.ad-copy strong { color: #172033; font-size: 14px; }
.ad-copy span, .target-cell small, .time-cell { color: #7b8496; font-size: 12px; overflow: hidden; text-overflow: ellipsis; }
.target-cell small { white-space: nowrap; }
.pagination { display: flex; justify-content: flex-end; padding-top: 18px; }
.form-grid { display: grid; grid-template-columns: 1.35fr 1fr; gap: 18px; }
.form-grid.compact { grid-template-columns: 1fr 1fr; }
.image-uploader { width: 100%; }
.image-uploader :deep(.el-upload) { width: 100%; overflow: hidden; border: 1px dashed #c8d5e9; border-radius: 14px; background: #f7faff; transition: .2s; }
.image-uploader :deep(.el-upload:hover) { border-color: var(--el-color-primary); }
.upload-preview { width: 100%; height: 220px; display: block; }
.upload-placeholder { height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #4b7ff1; }
.upload-placeholder small { color: #9aa4b5; }
.field-tip { margin-top: 4px; color: #9aa4b5; font-size: 12px; }
.house-picker { display: grid; gap: 10px; width: 100%; }
.selected-house { display: flex; align-items: center; gap: 7px; padding: 10px 12px; color: #2865d8; background: #eef5ff; border: 1px solid #cfe1ff; border-radius: 9px; }
.selected-house small { margin-left: auto; color: #73809a; }
.house-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; max-height: 276px; overflow-y: auto; padding: 2px; }
.house-option { display: flex; align-items: center; gap: 10px; min-width: 0; padding: 9px; text-align: left; color: inherit; background: #fff; border: 1px solid #e2e8f2; border-radius: 11px; cursor: pointer; transition: .18s ease; }
.house-option:hover, .house-option.selected { border-color: #4b83ee; background: #f4f8ff; box-shadow: 0 5px 14px rgb(52 105 203 / 10%); }
.house-cover { width: 72px; height: 52px; flex: none; border-radius: 8px; background: #f3f6fb; }
.house-copy { display: flex; flex-direction: column; min-width: 0; line-height: 1.45; }
.house-copy strong, .house-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.house-copy small { color: #8590a4; }
.house-copy em { color: #3478ed; font-size: 12px; font-style: normal; }
@media (max-width: 760px) { .form-grid { grid-template-columns: 1fr; gap: 0; } }
</style>
