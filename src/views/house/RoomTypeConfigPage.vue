<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Delete, Edit, Plus, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import {
  createHouseRoomType,
  deleteHouseRoomType,
  getHouseRoomTypeDictionary,
  updateHouseRoomType,
  type HouseRoomTypeItem,
  type HouseRoomTypePayload,
} from '@/api/house'

const loading = ref(false)
const saving = ref(false)
const items = ref<HouseRoomTypeItem[]>([])
const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const formRef = ref<FormInstance>()
const form = reactive<HouseRoomTypePayload>({ name: '', sortOrder: 0, enabled: true })
const rules: FormRules = {
  name: [
    { required: true, message: '请输入户型名称', trigger: 'blur' },
    { max: 50, message: '户型名称不能超过50个字符', trigger: 'blur' },
  ],
}

async function load() {
  loading.value = true
  try {
    items.value = await getHouseRoomTypeDictionary()
  } finally {
    loading.value = false
  }
}

function openDialog(item?: HouseRoomTypeItem) {
  editingId.value = item?.id ?? null
  form.name = item?.name ?? ''
  form.sortOrder = item?.sortOrder ?? 0
  form.enabled = item?.enabled ?? true
  dialogVisible.value = true
}

async function save() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    const payload = { ...form, name: form.name.trim() }
    if (editingId.value) {
      await updateHouseRoomType(editingId.value, payload)
      ElMessage.success('户型已更新')
    } else {
      await createHouseRoomType(payload)
      ElMessage.success('户型已新增')
    }
    dialogVisible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function remove(item: HouseRoomTypeItem) {
  try {
    await ElMessageBox.confirm(
      `确定删除户型「${item.name}」吗？已被房源使用的户型不能删除，建议停用。`,
      '确认删除',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  await deleteHouseRoomType(item.id)
  ElMessage.success('户型已删除')
  await load()
}

onMounted(load)
</script>

<template>
  <div class="page-container">
    <PageHeader title="户型配置" description="统一管理平台和房东发布房源时可选的户型，同时作为租客找房筛选选项。">
      <template #actions>
        <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openDialog()">新增户型</el-button>
      </template>
    </PageHeader>

    <el-card shadow="never" v-loading="loading">
      <el-table :data="items" row-key="id">
        <el-table-column prop="name" label="户型名称" min-width="220" />
        <el-table-column prop="sortOrder" label="排序" width="110" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Edit" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" :icon="Delete" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无户型配置" /></template>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑户型' : '新增户型'" width="460px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="88px">
        <el-form-item label="户型名称" prop="name">
          <el-input v-model="form.name" maxlength="50" placeholder="例如：2室1厅1卫" />
        </el-form-item>
        <el-form-item label="排序值">
          <el-input-number v-model="form.sortOrder" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="是否启用"><el-switch v-model="form.enabled" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-container { display: grid; gap: 16px; }
</style>
