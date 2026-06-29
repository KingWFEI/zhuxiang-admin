<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Delete, Edit, Plus, Refresh } from '@element-plus/icons-vue'
import {
  getFacilityDictionary,
  createFacility,
  updateFacility,
  deleteFacility,
  getHouseTagDictionary,
  createHouseTag,
  updateHouseTag,
  deleteHouseTag,
  type FacilityItem,
  type HouseTagItem,
  type FacilityPayload,
  type UpdateFacilityPayload,
  type HouseTagPayload,
  type UpdateHouseTagPayload,
} from '@/api/house'
import DataSourceNotice from '@/components/DataSourceNotice.vue'
import PageHeader from '@/components/PageHeader.vue'

// ---- state ----
const activeTab = ref('facility')
const loading = ref(false)

const facilityList = ref<FacilityItem[]>([])
const tagList = ref<HouseTagItem[]>([])

// ---- facility dialog ----
const facilityDialogVisible = ref(false)
const facilityDialogTitle = ref('新增设施')
const editingFacilityId = ref<string | null>(null)
const facilityFormRef = ref<FormInstance>()
const facilityForm = reactive<UpdateFacilityPayload>({
  name: '',
  iconKey: null,
  sortOrder: 0,
  enabled: true,
})
const facilitySaving = ref(false)

const facilityRules: FormRules = {
  name: [{ required: true, message: '请输入设施名称', trigger: 'blur' }],
}

// ---- tag dialog ----
const tagDialogVisible = ref(false)
const tagDialogTitle = ref('新增标签')
const editingTagId = ref<string | null>(null)
const tagFormRef = ref<FormInstance>()
const tagForm = reactive<UpdateHouseTagPayload>({
  name: '',
  tagType: '',
  sortOrder: 0,
  enabled: true,
})
const tagSaving = ref(false)

const tagRules: FormRules = {
  name: [{ required: true, message: '请输入标签名称', trigger: 'blur' }],
  tagType: [{ required: true, message: '请选择或输入标签类型', trigger: 'blur' }],
}

const tagTypeOptions = [
  { label: '交通', value: 'traffic' },
  { label: '特色', value: 'feature' },
  { label: '规则', value: 'rule' },
]

const tagTypeLabels: Record<string, string> = {
  traffic: '交通',
  feature: '特色',
  rule: '规则',
}

// ---- fetch ----
async function fetchAll() {
  loading.value = true
  try {
    const [facilities, tags] = await Promise.all([
      getFacilityDictionary(),
      getHouseTagDictionary(),
    ])
    facilityList.value = facilities
    tagList.value = tags
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)

// ---- facility CRUD ----
function openFacilityDialog(item?: FacilityItem) {
  if (item) {
    facilityDialogTitle.value = '编辑设施'
    editingFacilityId.value = item.id
    facilityForm.name = item.name
    facilityForm.iconKey = item.iconKey
    facilityForm.sortOrder = item.sortOrder ?? 0
    facilityForm.enabled = item.enabled
  } else {
    facilityDialogTitle.value = '新增设施'
    editingFacilityId.value = null
    facilityForm.name = ''
    facilityForm.iconKey = null
    facilityForm.sortOrder = 0
    facilityForm.enabled = true
  }
  facilityDialogVisible.value = true
}

async function handleFacilitySave() {
  const valid = await facilityFormRef.value?.validate().catch(() => false)
  if (!valid) return
  facilitySaving.value = true
  try {
    if (editingFacilityId.value) {
      await updateFacility(editingFacilityId.value, { ...facilityForm })
      ElMessage.success('设施已更新')
    } else {
      const payload: FacilityPayload = { ...facilityForm }
      await createFacility(payload)
      ElMessage.success('设施已新增')
    }
    facilityDialogVisible.value = false
    await fetchAll()
  } finally {
    facilitySaving.value = false
  }
}

async function handleFacilityDelete(item: FacilityItem) {
  try {
    await ElMessageBox.confirm(
      `确定要删除设施「${item.name}」吗？若设施仍被房源引用，删除将失败。建议先停用而非删除。`,
      '确认删除',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await deleteFacility(item.id)
    ElMessage.success('设施已删除')
    await fetchAll()
  } catch {
    // 409 conflict handled by interceptor
  }
}

// ---- tag CRUD ----
function openTagDialog(item?: HouseTagItem) {
  if (item) {
    tagDialogTitle.value = '编辑标签'
    editingTagId.value = item.id
    tagForm.name = item.name
    tagForm.tagType = item.tagType ?? ''
    tagForm.sortOrder = item.sortOrder ?? 0
    tagForm.enabled = item.enabled
  } else {
    tagDialogTitle.value = '新增标签'
    editingTagId.value = null
    tagForm.name = ''
    tagForm.tagType = ''
    tagForm.sortOrder = 0
    tagForm.enabled = true
  }
  tagDialogVisible.value = true
}

async function handleTagSave() {
  const valid = await tagFormRef.value?.validate().catch(() => false)
  if (!valid) return
  tagSaving.value = true
  try {
    if (editingTagId.value) {
      await updateHouseTag(editingTagId.value, { ...tagForm })
      ElMessage.success('标签已更新')
    } else {
      const payload: HouseTagPayload = {
        name: tagForm.name,
        tagType: tagForm.tagType,
        sortOrder: tagForm.sortOrder,
        enabled: tagForm.enabled,
      }
      await createHouseTag(payload)
      ElMessage.success('标签已新增')
    }
    tagDialogVisible.value = false
    await fetchAll()
  } finally {
    tagSaving.value = false
  }
}

async function handleTagDelete(item: HouseTagItem) {
  try {
    await ElMessageBox.confirm(
      `确定要删除标签「${item.name}」吗？若标签仍被房源引用，删除将失败。建议先停用而非删除。`,
      '确认删除',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await deleteHouseTag(item.id)
    ElMessage.success('标签已删除')
    await fetchAll()
  } catch {
    // 409 conflict handled by interceptor
  }
}
</script>

<template>
  <div class="page-container">
    <PageHeader title="设施与标签配置" description="管理设施字典和房源标签字典，可新增、编辑、停用或删除配置项。">
      <template #actions>
        <el-button :icon="Refresh" @click="fetchAll" :loading="loading">刷新</el-button>
      </template>
    </PageHeader>
    <DataSourceNotice type="real" detail="设施字典与标签字典来自后端接口，删除受房源引用保护（409 冲突）。" />

    <el-tabs v-model="activeTab" class="dict-tabs">
      <!-- ===================== 设施字典 ===================== -->
      <el-tab-pane label="设施字典" name="facility">
        <div class="tab-toolbar">
          <span class="muted-text">共 {{ facilityList.length }} 项</span>
          <el-button type="primary" :icon="Plus" @click="openFacilityDialog()">新增设施</el-button>
        </div>
        <el-card class="surface-card" shadow="never">
          <el-table v-loading="loading" :data="facilityList" border empty-text="暂无设施数据">
            <el-table-column prop="name" label="设施名称" min-width="140" />
            <el-table-column prop="iconKey" label="图标 Key" width="140">
              <template #default="{ row }">{{ row.iconKey || '-' }}</template>
            </el-table-column>
            <el-table-column prop="sortOrder" label="排序" width="80" sortable />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
                  {{ row.enabled ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="id" label="ID" width="140" />
            <el-table-column label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" :icon="Edit" @click="openFacilityDialog(row)">编辑</el-button>
                <el-button link type="danger" :icon="Delete" @click="handleFacilityDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- ===================== 标签字典 ===================== -->
      <el-tab-pane label="标签字典" name="tag">
        <div class="tab-toolbar">
          <span class="muted-text">共 {{ tagList.length }} 项</span>
          <el-button type="primary" :icon="Plus" @click="openTagDialog()">新增标签</el-button>
        </div>
        <el-card class="surface-card" shadow="never">
          <el-table v-loading="loading" :data="tagList" border empty-text="暂无标签数据">
            <el-table-column prop="name" label="标签名称" min-width="140" />
            <el-table-column label="类型" width="100">
              <template #default="{ row }">
                {{ tagTypeLabels[row.tagType ?? ''] || row.tagType || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="sortOrder" label="排序" width="80" sortable />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
                  {{ row.enabled ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="id" label="ID" width="160" />
            <el-table-column label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" :icon="Edit" @click="openTagDialog(row)">编辑</el-button>
                <el-button link type="danger" :icon="Delete" @click="handleTagDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- ===================== 设施弹窗 ===================== -->
    <el-dialog v-model="facilityDialogVisible" :title="facilityDialogTitle" width="480px" destroy-on-close>
      <el-form ref="facilityFormRef" :model="facilityForm" :rules="facilityRules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="facilityForm.name" placeholder="例如：Wi-Fi" maxlength="32" />
        </el-form-item>
        <el-form-item label="图标 Key">
          <el-input v-model="facilityForm.iconKey" placeholder="例如：wifi" maxlength="32" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="facilityForm.sortOrder" :min="0" :max="9999" controls-position="right" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="facilityForm.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="facilityDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="facilitySaving" @click="handleFacilitySave">保存</el-button>
      </template>
    </el-dialog>

    <!-- ===================== 标签弹窗 ===================== -->
    <el-dialog v-model="tagDialogVisible" :title="tagDialogTitle" width="480px" destroy-on-close>
      <el-form ref="tagFormRef" :model="tagForm" :rules="tagRules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="tagForm.name" placeholder="例如：近地铁" maxlength="32" />
        </el-form-item>
        <el-form-item label="类型" prop="tagType">
          <el-select v-model="tagForm.tagType" placeholder="选择或输入类型" filterable allow-create style="width: 100%">
            <el-option v-for="opt in tagTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="tagForm.sortOrder" :min="0" :max="9999" controls-position="right" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="tagForm.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="tagDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="tagSaving" @click="handleTagSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.dict-tabs {
  margin-top: 18px;
}

.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.muted-text {
  color: #84918b;
  font-size: 13px;
}
</style>
