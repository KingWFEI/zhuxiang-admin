<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Delete, Edit, Plus, Refresh, Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import { createAdminRegion, deleteAdminRegion, importAdminRegions, listAdminRegions, updateAdminRegion, type RegionItem, type RegionLevel, type RegionPayload } from '@/api/region'

const loading = ref(false)
const saving = ref(false)
const items = ref<RegionItem[]>([])
const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const formRef = ref<FormInstance>()
const importVisible = ref(false)
const importing = ref(false)
const importText = ref('[\n  { "name": "成都市", "code": "510100", "level": "city", "sortOrder": 1 },\n  { "name": "锦江区", "code": "510104", "level": "district", "parentCode": "510100", "sortOrder": 1 }\n]')
const form = reactive<RegionPayload>({ name: '', code: '', level: 'city', parentId: null, sortOrder: 0, enabled: true })
const rules: FormRules = { name: [{ required: true, message: '请输入区域名称', trigger: 'blur' }] }
const cities = computed(() => items.value.filter(item => item.level === 'city' && item.enabled))
type TreeRegion = RegionItem & { children?: TreeRegion[] }
const treeItems = computed<TreeRegion[]>(() => {
  const nodes = new Map<string, TreeRegion>()
  items.value.forEach(item => nodes.set(item.id, { ...item }))
  const roots: TreeRegion[] = []
  nodes.forEach(node => {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined
    if (parent) (parent.children ??= []).push(node)
    else roots.push(node)
  })
  const sort = (list: TreeRegion[]) => {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'zh-CN'))
    list.forEach(item => { if (item.children) sort(item.children) })
  }
  sort(roots)
  return roots
})
const parentName = (id: string) => items.value.find(item => item.id === id)?.name || '-'
const levelName = (level: RegionLevel) => ({ city: '城市', district: '区县', business_area: '商圈' }[level])

async function load() { loading.value = true; try { items.value = await listAdminRegions() } finally { loading.value = false } }
function openDialog(item?: RegionItem) {
  editingId.value = item?.id ?? null
  form.name = item?.name ?? ''; form.code = item?.code ?? ''; form.level = item?.level ?? 'city'
  form.parentId = item?.parentId || null; form.sortOrder = item?.sortOrder ?? 0; form.enabled = item?.enabled ?? true
  dialogVisible.value = true
}
async function save() {
  if (!formRef.value || !(await formRef.value.validate().catch(() => false))) return
  saving.value = true
  try {
    const payload = { ...form, name: form.name.trim(), parentId: form.level === 'city' ? null : form.parentId }
    if (editingId.value) await updateAdminRegion(editingId.value, payload)
    else await createAdminRegion(payload)
    ElMessage.success('区域配置已保存'); dialogVisible.value = false; await load()
  } finally { saving.value = false }
}
async function remove(item: RegionItem) {
  try { await ElMessageBox.confirm(`确定停用「${item.name}」吗？`, '停用确认', { type: 'warning', confirmButtonText: '停用', cancelButtonText: '取消' }) } catch { return }
  await deleteAdminRegion(item.id); ElMessage.success('已停用'); await load()
}
onMounted(load)
async function importJson() {
  let data: unknown
  try { data = JSON.parse(importText.value) } catch { ElMessage.error('JSON 格式不正确'); return }
  if (!Array.isArray(data)) { ElMessage.error('JSON 顶层必须是数组'); return }
  importing.value = true
  try {
    const result = await importAdminRegions(data as RegionPayload[])
    ElMessage.success(`导入完成：新增 ${result.created} 条，更新 ${result.updated} 条`)
    importVisible.value = false; await load()
  } finally { importing.value = false }
}
</script>

<template>
  <div class="page-container">
    <PageHeader title="行政区域配置" description="配置城市、区县和商圈层级，供找房区域筛选及本地回退使用。">
      <template #actions><el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button><el-button :icon="Upload" @click="importVisible = true">JSON导入</el-button><el-button type="primary" :icon="Plus" @click="openDialog()">新增区域</el-button></template>
    </PageHeader>
    <el-card shadow="never" v-loading="loading">
      <el-table :data="treeItems" row-key="id" stripe default-expand-all>
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column label="层级" width="110"><template #default="{ row }"><el-tag>{{ levelName(row.level) }}</el-tag></template></el-table-column>
        <el-table-column label="层级关系" min-width="180"><template #default="{ row }">{{ row.parentId ? parentName(row.parentId) : '顶级城市' }}</template></el-table-column>
        <el-table-column prop="code" label="行政编码" width="140" />
        <el-table-column prop="sortOrder" label="排序" width="90" />
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="150" fixed="right"><template #default="{ row }"><el-button link type="primary" :icon="Edit" @click="openDialog(row)">编辑</el-button><el-button link type="danger" :icon="Delete" @click="remove(row)">停用</el-button></template></el-table-column>
        <template #empty><el-empty description="暂无区域配置" /></template>
      </el-table>
    </el-card>
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑区域' : '新增区域'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="名称" prop="name"><el-input v-model="form.name" maxlength="50" placeholder="例如：成都市、锦江区" /></el-form-item>
        <el-form-item label="层级"><el-radio-group v-model="form.level"><el-radio-button value="city">城市</el-radio-button><el-radio-button value="district">区县</el-radio-button><el-radio-button value="business_area">商圈</el-radio-button></el-radio-group></el-form-item>
        <el-form-item v-if="form.level !== 'city'" label="上级区域" required><el-select v-model="form.parentId" placeholder="请选择上级城市" style="width: 100%"><el-option v-for="city in cities" :key="city.id" :label="city.name" :value="city.id" /></el-select></el-form-item>
        <el-form-item label="行政编码"><el-input v-model="form.code" maxlength="20" placeholder="可填高德 adcode" /></el-form-item>
        <el-form-item label="排序值"><el-input-number v-model="form.sortOrder" :min="0" :max="9999" /></el-form-item>
        <el-form-item label="是否启用"><el-switch v-model="form.enabled" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></template>
    </el-dialog>
    <el-dialog v-model="importVisible" title="JSON批量导入区域" width="680px">
      <el-alert type="info" :closable="false" show-icon title="支持 parentCode 建立层级；城市不填写 parentCode，区县/商圈填写上级区域的 code。重复 code 或同名同层级区域会更新。" />
      <el-input v-model="importText" type="textarea" :rows="16" spellcheck="false" style="margin-top: 12px" />
      <template #footer><el-button @click="importVisible = false">取消</el-button><el-button type="primary" :loading="importing" @click="importJson">开始导入</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>.page-container { display: grid; gap: 16px; }</style>
