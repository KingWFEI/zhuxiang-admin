<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Delete, Edit, Plus, Refresh, Search, Location } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import PageHeader from '@/components/PageHeader.vue'
import {
  searchCommunities,
  createCommunity,
  updateCommunity,
  deleteCommunity,
  getRegionList,
  type CommunityItem,
  type RegionItem,
  type CreateCommunityRequest,
} from '@/api/community'
import { formatDateTime } from '@/utils/format'

const loading = ref(false)
const communityList = ref<CommunityItem[]>([])
const regionList = ref<RegionItem[]>([])
const searchKeyword = ref('')
const dialogVisible = ref(false)
const dialogTitle = ref('新增小区')
const formRef = ref<FormInstance>()
const submitting = ref(false)
const editingId = ref<string | null>(null)

const form = reactive<CreateCommunityRequest>({
  name: '', address: '', regionId: '', latitude: undefined, longitude: undefined,
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入小区名称', trigger: 'blur' }],
}

async function fetchList() {
  loading.value = true
  try {
    communityList.value = await searchCommunities(searchKeyword.value.trim() || undefined)
  } finally {
    loading.value = false
  }
}

async function fetchRegions() {
  try { regionList.value = await getRegionList() } catch { /* ignore */ }
}

function openCreate() {
  dialogTitle.value = '新增小区'
  editingId.value = null
  form.name = ''
  form.address = ''
  form.regionId = ''
  form.latitude = undefined
  form.longitude = undefined
  dialogVisible.value = true
}

function openEdit(row: CommunityItem) {
  dialogTitle.value = '编辑小区'
  editingId.value = row.id
  form.name = row.name
  form.address = row.address
  form.regionId = row.regionId
  form.latitude = row.latitude ?? undefined
  form.longitude = row.longitude ?? undefined
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate()
  submitting.value = true
  try {
    if (editingId.value) {
      await updateCommunity(editingId.value, { ...form })
      ElMessage.success('保存成功')
    } else {
      await createCommunity({ ...form })
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchList()
  } catch { /* validation / network error */ }
  finally { submitting.value = false }
}

async function handleDelete(row: CommunityItem) {
  try {
    await ElMessageBox.confirm(`确定删除小区「${row.name}」吗？`, '删除确认', {
      confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning',
    })
    await deleteCommunity(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch { /* cancelled */ }
}

onMounted(() => {
  fetchList()
  fetchRegions()
})
</script>

<template>
  <div class="page-container">
    <PageHeader title="小区管理" description="管理平台小区信息，供房源选择小区时使用">
      <template #actions>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增小区</el-button>
      </template>
    </PageHeader>

    <div class="toolbar-row">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索小区名称"
        style="width: 280px;"
        :prefix-icon="Search"
        clearable
        @keyup.enter="fetchList"
        @clear="fetchList"
      >
        <template #append><el-button :icon="Search" @click="fetchList" /></template>
      </el-input>
      <el-button :icon="Refresh" @click="fetchList">刷新</el-button>
    </div>

    <el-table :data="communityList" v-loading="loading" stripe>
      <el-table-column prop="name" label="名称" min-width="160" show-overflow-tooltip />
      <el-table-column label="区域" width="140">
        <template #default="{ row }">{{ row.regionName || '-' }}</template>
      </el-table-column>
      <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">{{ row.address || '-' }}</template>
      </el-table-column>
      <el-table-column label="经纬度" width="160">
        <template #default="{ row }">
          <span v-if="row.latitude && row.longitude">
            <el-icon :size="12"><Location /></el-icon>
            {{ row.latitude.toFixed(5) }}, {{ row.longitude.toFixed(5) }}
          </span>
          <span v-else class="muted-text">未设置</span>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" :icon="Delete" @click="handleDelete(row)" />
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px" @closed="formRef?.resetFields()">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="小区名称" />
        </el-form-item>
        <el-form-item label="所属区域">
          <el-select v-model="form.regionId" placeholder="选择区域" clearable style="width: 100%" filterable>
            <el-option v-for="r in regionList" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="form.address" placeholder="详细地址" />
        </el-form-item>
        <el-form-item label="经度">
          <el-input-number v-model="form.latitude" :precision="6" :min="-180" :max="180" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="纬度">
          <el-input-number v-model="form.longitude" :precision="6" :min="-90" :max="90" controls-position="right" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.toolbar-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.muted-text { color: #9CA3AF; }
</style>
