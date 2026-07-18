<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Check, Link, Refresh, Upload, View } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import PdfComponentMapper from './components/PdfComponentMapper.vue'
import {
  generateTemplateTestFile,
  getContractFieldDefinitions,
  getContractTemplate,
  getTemplateAuditLogs,
  getTemplateComponents,
  getTemplateEditUrl,
  getTemplatePreview,
  publishContractTemplate,
  saveComponentMappings,
  syncTemplateComponents,
  validateContractTemplate,
  type ComponentMappingPayload,
  type ContractFieldDefinition,
  type ContractTemplateDetail,
  type MappingMode,
  type TemplateAuditLog,
  type TemplateComponent,
  type TemplateValidationResult,
} from '@/api/contractTemplate'

const route = useRoute()
const router = useRouter()
const templateId = computed(() => String(route.params.templateId || ''))
const loading = ref(false)
const syncing = ref(false)
const saving = ref(false)
const validating = ref(false)
const publishing = ref(false)
const generating = ref(false)
const detail = ref<ContractTemplateDetail | null>(null)
const components = ref<TemplateComponent[]>([])
const fields = ref<ContractFieldDefinition[]>([])
const auditLogs = ref<TemplateAuditLog[]>([])
const previewUrl = ref('')
const selectedComponentId = ref<string | null>(null)
const validation = ref<TemplateValidationResult | null>(null)
const validationDrawerVisible = ref(false)
const activeTab = ref('mapping')
const filters = reactive({ keyword: '', state: 'ALL' })

const selected = computed(() => components.value.find((item) => item.componentId === selectedComponentId.value) || null)
const readonly = computed(() => detail.value?.status === 'ACTIVE' || detail.value?.status === 'INACTIVE')
const fieldGroups = computed(() => {
  const map = new Map<string, ContractFieldDefinition[]>()
  for (const field of fields.value) map.set(field.category, [...(map.get(field.category) || []), field])
  return [...map.entries()].map(([label, options]) => ({ label, options }))
})
const visibleComponents = computed(() => components.value.filter((item) => {
  const keyword = filters.keyword.trim().toLowerCase()
  const matchesKeyword = !keyword || [item.componentName, item.componentKey, item.componentId]
    .some((value) => value?.toLowerCase().includes(keyword))
  const matchesState = filters.state === 'ALL'
    || (filters.state === 'UNMAPPED' && !item.mappingMode)
    || (filters.state === 'ERROR' && item.validationErrors.length > 0)
    || (filters.state === 'MAPPED' && Boolean(item.mappingMode))
    || (filters.state === 'SIGNATURE' && (item.componentType === 6 || item.mappingMode === 'SIGNATURE'))
  return matchesKeyword && matchesState
}))
const mappedCount = computed(() => components.value.filter((item) => item.mappingMode).length)
const requiredUnmappedCount = computed(() => components.value.filter((item) => item.required && !item.mappingMode && item.componentType !== 23).length)

const componentTypeLabels: Record<number, string> = {
  1: '单行文本', 2: '数字', 3: '日期', 6: '签名区', 8: '多行文本', 9: '复选',
  10: '单选', 11: '图片', 14: '下拉框', 15: '勾选框', 16: '身份证', 17: '备注区域',
  18: '动态表格', 19: '手机号', 21: '签署日期', 23: '人民币大写',
}
const mappingLabels: Record<MappingMode, string> = {
  SYSTEM_FIELD: '系统字段', FIXED_VALUE: '固定值', DERIVED: '派生字段', USER_INPUT: '用户填写',
  SIGNATURE: '签名控件', IGNORE: '忽略',
}

async function load() {
  loading.value = true
  try {
    const [template, componentRows, definitions, logs] = await Promise.all([
      getContractTemplate(templateId.value),
      getTemplateComponents(templateId.value),
      getContractFieldDefinitions(),
      getTemplateAuditLogs(templateId.value),
    ])
    detail.value = template
    components.value = componentRows
    fields.value = definitions
    auditLogs.value = logs
    selectedComponentId.value ||= componentRows[0]?.componentId || null
    try {
      previewUrl.value = (await getTemplatePreview(templateId.value)).fileUrl
    } catch {
      previewUrl.value = ''
    }
  } finally {
    loading.value = false
  }
}

function normalizeMapping(item: TemplateComponent): ComponentMappingPayload {
  return {
    componentId: item.componentId,
    mappingMode: item.mappingMode || 'IGNORE',
    businessFieldCode: item.mappingMode === 'SYSTEM_FIELD' || item.mappingMode === 'DERIVED'
      ? item.businessFieldCode : null,
    fixedValue: item.mappingMode === 'FIXED_VALUE' ? item.fixedValue : null,
    editable: item.mappingMode === 'USER_INPUT' ? item.editable : false,
  }
}

function applySuggestedMode(item: TemplateComponent) {
  if (item.componentType === 6) item.mappingMode = 'SIGNATURE'
  else if (item.componentType === 23) item.mappingMode = 'DERIVED'
}

async function saveMappings() {
  saving.value = true
  try {
    components.value = await saveComponentMappings(templateId.value, components.value.map(normalizeMapping))
    ElMessage.success('字段映射已保存')
  } finally {
    saving.value = false
  }
}

async function syncComponents() {
  syncing.value = true
  try {
    components.value = await syncTemplateComponents(templateId.value)
    selectedComponentId.value = components.value[0]?.componentId || null
    validation.value = null
    ElMessage.success(`已同步 ${components.value.length} 个控件`)
    await loadPreview()
  } finally {
    syncing.value = false
  }
}

async function loadPreview() {
  previewUrl.value = (await getTemplatePreview(templateId.value)).fileUrl
}

async function openEditor() {
  const link = await getTemplateEditUrl(templateId.value)
  const opened = window.open(link.longUrl || link.url, '_blank', 'noopener,noreferrer')
  if (!opened) ElMessage.warning('浏览器拦截了新窗口，请允许弹窗后重试')
}

async function runValidation(showDrawer = true) {
  validating.value = true
  try {
    validation.value = await validateContractTemplate(templateId.value)
    if (showDrawer) validationDrawerVisible.value = true
    if (validation.value.passed) ElMessage.success('模板校验通过')
  } finally {
    validating.value = false
  }
}

async function generateTest() {
  generating.value = true
  try {
    const file = await generateTemplateTestFile(templateId.value)
    window.open(file.fileUrl, '_blank', 'noopener,noreferrer')
    ElMessage.success('测试合同已生成')
  } finally {
    generating.value = false
  }
}

async function publishTemplate() {
  await runValidation(false)
  if (!validation.value?.passed) {
    validationDrawerVisible.value = true
    return
  }
  try {
    await ElMessageBox.confirm('发布后该版本将锁定，并成为新合同默认模板。确定发布吗？', '发布模板', {
      type: 'warning', confirmButtonText: '确认发布', cancelButtonText: '取消',
    })
  } catch {
    return
  }
  publishing.value = true
  try {
    detail.value = await publishContractTemplate(templateId.value)
    ElMessage.success('模板已发布')
  } finally {
    publishing.value = false
  }
}

onMounted(load)
</script>

<template>
  <div v-loading="loading" class="page-container">
    <PageHeader
      :title="detail ? `${detail.templateName} · V${detail.version}` : '合同模板配置'"
      description="同步 e签宝控件，配置可信数据来源，校验通过后生成测试合同并发布。"
    >
      <template #actions>
        <el-button :icon="ArrowLeft" @click="router.push('/contracts/templates')">返回列表</el-button>
        <el-button v-if="!readonly" :icon="Link" @click="openEditor">e签宝编辑</el-button>
        <el-button :icon="Refresh" :loading="syncing" @click="syncComponents">同步控件</el-button>
        <el-button :icon="Check" :loading="validating" @click="runValidation()">校验</el-button>
        <el-button :icon="View" :loading="generating" @click="generateTest">测试合同</el-button>
        <el-button v-if="!readonly" type="primary" :icon="Upload" :loading="publishing" @click="publishTemplate">发布模板</el-button>
      </template>
    </PageHeader>

    <el-alert v-if="readonly" title="该版本已发布或下线，映射配置已锁定。如需修改，请从列表复制为新版本。" type="info" :closable="false" show-icon />

    <div class="metric-grid compact-metrics">
      <div class="metric-card"><span class="metric-card__label">控件总数</span><strong class="metric-card__value">{{ components.length }}</strong></div>
      <div class="metric-card"><span class="metric-card__label">已处理</span><strong class="metric-card__value">{{ mappedCount }}</strong></div>
      <div class="metric-card"><span class="metric-card__label">必填未映射</span><strong class="metric-card__value" :class="{ danger: requiredUnmappedCount }">{{ requiredUnmappedCount }}</strong></div>
      <div class="metric-card"><span class="metric-card__label">模板状态</span><strong class="metric-card__value status-value">{{ detail?.status || '-' }}</strong></div>
    </div>

    <el-tabs v-model="activeTab" class="template-tabs">
      <el-tab-pane label="控件映射" name="mapping">
        <div class="mapping-layout">
          <PdfComponentMapper
            :file-url="previewUrl"
            :components="components"
            :selected-component-id="selectedComponentId"
            @select="selectedComponentId = $event"
          />

          <el-card class="surface-card mapping-panel" shadow="never">
            <template #header>
              <div class="panel-header"><strong>控件与数据来源</strong><el-button v-if="!readonly" type="primary" :loading="saving" @click="saveMappings">保存全部</el-button></div>
            </template>
            <div class="mapping-filters">
              <el-input v-model="filters.keyword" clearable placeholder="搜索名称、Key 或 ID" />
              <el-select v-model="filters.state" style="width: 135px">
                <el-option label="全部控件" value="ALL" /><el-option label="未映射" value="UNMAPPED" />
                <el-option label="已映射" value="MAPPED" /><el-option label="有错误" value="ERROR" />
                <el-option label="签名控件" value="SIGNATURE" />
              </el-select>
            </div>

            <div class="component-list">
              <button
                v-for="item in visibleComponents"
                :key="item.componentId"
                type="button"
                class="component-item"
                :class="{ active: item.componentId === selectedComponentId, error: item.required && !item.mappingMode }"
                @click="selectedComponentId = item.componentId; applySuggestedMode(item)"
              >
                <span><strong>{{ item.componentName }}</strong><small>{{ item.componentKey || '未设置 componentKey' }}</small></span>
                <el-tag v-if="item.mappingMode" size="small" type="success">{{ mappingLabels[item.mappingMode] }}</el-tag>
                <el-tag v-else size="small" :type="item.required ? 'danger' : 'info'">{{ item.required ? '必填未映射' : '未处理' }}</el-tag>
              </button>
            </div>

            <div v-if="selected" class="mapping-editor">
              <h3>{{ selected.componentName }}</h3>
              <div class="component-meta">
                <span>Key：{{ selected.componentKey || '-' }}</span>
                <span>类型：{{ componentTypeLabels[selected.componentType] || selected.componentType }}</span>
                <span>第 {{ selected.pageNum || 1 }} 页</span>
                <span>{{ selected.required ? '必填' : '可选' }}</span>
              </div>
              <el-form label-position="top" :disabled="readonly">
                <el-form-item label="数据来源">
                  <el-select v-model="selected.mappingMode" placeholder="请选择处理方式" @change="applySuggestedMode(selected)">
                    <el-option label="系统业务字段" value="SYSTEM_FIELD" /><el-option label="固定值" value="FIXED_VALUE" />
                    <el-option label="派生字段" value="DERIVED" /><el-option label="用户填写" value="USER_INPUT" />
                    <el-option label="签名控件" value="SIGNATURE" /><el-option v-if="!selected.required" label="忽略" value="IGNORE" />
                  </el-select>
                </el-form-item>
                <el-form-item v-if="selected.mappingMode === 'SYSTEM_FIELD' || selected.mappingMode === 'DERIVED'" label="业务字段">
                  <el-select v-model="selected.businessFieldCode" filterable placeholder="选择受信任的数据字段">
                    <el-option-group v-for="group in fieldGroups" :key="group.label" :label="group.label">
                      <el-option
                        v-for="field in group.options"
                        :key="field.fieldCode"
                        :label="field.displayName"
                        :value="field.fieldCode"
                        :disabled="!field.supportedComponentTypes.includes(selected.componentType)"
                      >
                        <span>{{ field.displayName }}</span><span class="field-code">{{ field.fieldCode }}</span>
                      </el-option>
                    </el-option-group>
                  </el-select>
                </el-form-item>
                <el-form-item v-if="selected.mappingMode === 'FIXED_VALUE'" label="固定内容"><el-input v-model="selected.fixedValue" type="textarea" :rows="3" /></el-form-item>
                <el-form-item v-if="selected.mappingMode === 'USER_INPUT'" label="签约用户权限"><el-switch v-model="selected.editable" active-text="允许用户填写或修改" /></el-form-item>
                <el-alert v-if="selected.validationErrors.length" :title="selected.validationErrors.join('；')" type="error" :closable="false" show-icon />
              </el-form>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="版本信息" name="detail">
        <el-card class="surface-card" shadow="never">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="模板编码">{{ detail?.templateCode }}</el-descriptions-item>
            <el-descriptions-item label="业务类型">{{ detail?.businessType }}</el-descriptions-item>
            <el-descriptions-item label="e签宝模板 ID">{{ detail?.docTemplateId || '-' }}</el-descriptions-item>
            <el-descriptions-item label="底稿文件">{{ detail?.sourceFileName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="控件指纹">{{ detail?.componentFingerprint || '-' }}</el-descriptions-item>
            <el-descriptions-item label="最近同步">{{ detail?.lastSyncedAt || '-' }}</el-descriptions-item>
            <el-descriptions-item label="校验结果">{{ detail?.validationStatus || '-' }}</el-descriptions-item>
            <el-descriptions-item label="发布人">{{ detail?.publishedByName || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="操作记录" name="audit">
        <el-card class="surface-card" shadow="never">
          <el-timeline>
            <el-timeline-item v-for="log in auditLogs" :key="log.id" :timestamp="log.createdAt" placement="top">
              <strong>{{ log.action }}</strong><p>{{ log.operatorName || '系统' }} · {{ log.detail || '无补充信息' }}</p>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-drawer v-model="validationDrawerVisible" title="模板校验报告" size="520px">
      <template v-if="validation">
        <el-result :icon="validation.passed ? 'success' : 'error'" :title="validation.passed ? '模板校验通过' : '模板暂不能发布'" :sub-title="`${validation.errorCount} 个阻断问题，${validation.warningCount} 个警告`" />
        <div class="validation-list">
          <div v-for="issue in validation.issues" :key="`${issue.code}-${issue.componentId}`" class="validation-item">
            <el-tag :type="issue.level === 'ERROR' ? 'danger' : 'warning'" size="small">{{ issue.level === 'ERROR' ? '阻断' : '警告' }}</el-tag>
            <div><strong>{{ issue.message }}</strong><small>{{ issue.componentKey || issue.componentId || issue.code }}</small></div>
          </div>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
.compact-metrics .metric-card { padding: 14px 18px; }
.compact-metrics .metric-card__value { font-size: 21px; }
.danger { color: #c53b2f; }
.status-value { color: #176b4d; font-size: 17px !important; }
.template-tabs { min-width: 0; }
.mapping-layout { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(400px, 0.85fr); gap: 14px; }
.mapping-panel { min-width: 0; height: 772px; }
.mapping-panel :deep(.el-card__body) { display: flex; height: calc(100% - 64px); flex-direction: column; padding: 0; }
.panel-header, .mapping-filters { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.mapping-filters { padding: 12px; border-bottom: 1px solid #e4e9e6; }
.component-list { max-height: 285px; overflow: auto; border-bottom: 1px solid #e4e9e6; }
.component-item { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 10px 12px; cursor: pointer; border: 0; border-bottom: 1px solid #edf0ee; background: white; text-align: left; }
.component-item:hover, .component-item.active { background: #edf6f2; }
.component-item.active { box-shadow: inset 3px 0 #176b4d; }
.component-item.error { box-shadow: inset 3px 0 #d24d3f; }
.component-item span { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.component-item small, .component-meta { color: #74817b; font-size: 11px; }
.mapping-editor { flex: 1; overflow: auto; padding: 16px; }
.mapping-editor h3 { margin: 0 0 7px; }
.component-meta { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-bottom: 18px; }
.mapping-editor .el-select { width: 100%; }
.field-code { float: right; margin-left: 18px; color: #8b9692; font-family: monospace; font-size: 11px; }
.validation-list { display: flex; flex-direction: column; gap: 10px; }
.validation-item { display: flex; align-items: flex-start; gap: 10px; padding: 12px; border: 1px solid #e2e7e4; border-radius: 6px; }
.validation-item div { display: flex; flex-direction: column; gap: 5px; }
.validation-item small { color: #74817b; }
.el-timeline p { margin: 6px 0 0; color: #74817b; }
@media (max-width: 1280px) { .mapping-layout { grid-template-columns: 1fr; } .mapping-panel { height: auto; min-height: 720px; } }
</style>
