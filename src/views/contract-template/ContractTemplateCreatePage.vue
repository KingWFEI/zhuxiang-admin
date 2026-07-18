<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules, type UploadFile } from 'element-plus'
import { ArrowLeft, DocumentAdd, Link, Refresh, UploadFilled } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import {
  createContractTemplate,
  getTemplateCreateUrl,
  syncTemplateComponents,
  uploadTemplateSourceFile,
  type ContractTemplateDetail,
} from '@/api/contractTemplate'

const router = useRouter()
const step = ref(0)
const formRef = ref<FormInstance>()
const saving = ref(false)
const uploading = ref(false)
const syncing = ref(false)
const draft = ref<ContractTemplateDetail | null>(null)
const sourceFile = ref<File | null>(null)
const componentsFound = ref(0)
const form = reactive({
  businessType: 'HOUSE_LEASE',
  templateCode: 'HOUSE_LEASE_CONTRACT',
  templateName: '房屋租赁合同',
  environment: 'SANDBOX' as 'SANDBOX' | 'PRODUCTION',
  versionNote: '',
})

const rules: FormRules = {
  templateName: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  templateCode: [
    { required: true, message: '请输入模板编码', trigger: 'blur' },
    { pattern: /^[A-Z][A-Z0-9_]{2,99}$/, message: '仅支持大写字母、数字和下划线', trigger: 'blur' },
  ],
  environment: [{ required: true, message: '请选择环境', trigger: 'change' }],
}

const canUpload = computed(() => Boolean(draft.value?.id && sourceFile.value))

function handleFileChange(uploadFile: UploadFile) {
  const file = uploadFile.raw
  if (!file) return
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    ElMessage.error('只能上传 PDF 合同底稿')
    sourceFile.value = null
    return
  }
  if (file.size > 50 * 1024 * 1024) {
    ElMessage.error('PDF 文件不能超过 50MB')
    sourceFile.value = null
    return
  }
  sourceFile.value = file
}

async function createDraft() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    draft.value = await createContractTemplate({ ...form })
    step.value = 1
    ElMessage.success('模板草稿已创建')
  } finally {
    saving.value = false
  }
}

async function uploadSource() {
  if (!draft.value || !sourceFile.value) return
  uploading.value = true
  try {
    draft.value = await uploadTemplateSourceFile(draft.value.id, sourceFile.value)
    step.value = 2
    ElMessage.success('合同底稿已上传至 e签宝')
  } finally {
    uploading.value = false
  }
}

async function openEsignDesigner() {
  if (!draft.value) return
  const link = await getTemplateCreateUrl(draft.value.id)
  const opened = window.open(link.longUrl || link.url, '_blank', 'noopener,noreferrer')
  if (!opened) ElMessage.warning('浏览器拦截了新窗口，请允许弹窗后重试')
}

async function syncComponents() {
  if (!draft.value) return
  syncing.value = true
  try {
    const components = await syncTemplateComponents(draft.value.id)
    componentsFound.value = components.length
    step.value = 3
    ElMessage.success(`已同步 ${components.length} 个控件`)
  } finally {
    syncing.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <PageHeader title="新建合同模板" description="上传 PDF 底稿，在 e签宝中配置控件，随后同步并完成业务字段映射。">
      <template #actions>
        <el-button :icon="ArrowLeft" @click="router.push('/contracts/templates')">返回列表</el-button>
      </template>
    </PageHeader>

    <el-card class="surface-card wizard-card" shadow="never">
      <el-steps :active="step" finish-status="success" align-center>
        <el-step title="基础信息" description="创建模板草稿" />
        <el-step title="上传底稿" description="上传 PDF 至 e签宝" />
        <el-step title="配置控件" description="在 e签宝制作模板" />
        <el-step title="同步映射" description="校验并发布" />
      </el-steps>

      <div v-if="step === 0" class="step-content form-step">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="118px">
          <el-form-item label="模板名称" prop="templateName"><el-input v-model="form.templateName" maxlength="100" /></el-form-item>
          <el-form-item label="模板编码" prop="templateCode"><el-input v-model="form.templateCode" maxlength="100" /></el-form-item>
          <el-form-item label="业务类型"><el-select v-model="form.businessType"><el-option label="房屋租赁合同" value="HOUSE_LEASE" /></el-select></el-form-item>
          <el-form-item label="e签宝环境" prop="environment">
            <el-radio-group v-model="form.environment">
              <el-radio value="SANDBOX">沙箱环境</el-radio>
              <el-radio value="PRODUCTION">正式环境</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="版本说明"><el-input v-model="form.versionNote" type="textarea" :rows="3" maxlength="500" show-word-limit /></el-form-item>
        </el-form>
        <div class="step-actions"><el-button type="primary" :loading="saving" :icon="DocumentAdd" @click="createDraft">创建草稿并继续</el-button></div>
      </div>

      <div v-else-if="step === 1" class="step-content centered-step">
        <el-upload drag :auto-upload="false" :limit="1" accept="application/pdf,.pdf" :on-change="handleFileChange">
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">拖拽合同 PDF 到此处，或<em>点击选择</em></div>
          <template #tip><div class="el-upload__tip">仅支持 PDF，最大 50MB。上传后将作为 e签宝模板底稿。</div></template>
        </el-upload>
        <div class="step-actions">
          <el-button @click="step = 0">上一步</el-button>
          <el-button type="primary" :disabled="!canUpload" :loading="uploading" :icon="UploadFilled" @click="uploadSource">上传底稿</el-button>
        </div>
      </div>

      <div v-else-if="step === 2" class="step-content centered-step">
        <div class="guide-icon"><el-icon><Link /></el-icon></div>
        <h2>前往 e签宝配置合同控件</h2>
        <p>请为每个可填写控件设置唯一、稳定的 componentKey，并为甲乙方签名区设置对应 signerRole。</p>
        <el-alert title="完成控件配置并保存后，请回到本页面点击“同步控件”。" type="warning" :closable="false" show-icon />
        <div class="step-actions">
          <el-button type="primary" :icon="Link" @click="openEsignDesigner">打开 e签宝模板制作页</el-button>
          <el-button :icon="Refresh" :loading="syncing" @click="syncComponents">我已完成，立即同步控件</el-button>
        </div>
      </div>

      <div v-else class="step-content centered-step">
        <div class="success-mark">{{ componentsFound }}</div>
        <h2>控件同步完成</h2>
        <p>已读取 {{ componentsFound }} 个控件。下一步完成数据来源映射、字段校验、测试文件生成和发布。</p>
        <div class="step-actions">
          <el-button :icon="Refresh" :loading="syncing" @click="syncComponents">重新同步</el-button>
          <el-button type="primary" @click="router.push(`/contracts/templates/${draft?.id}/configure`)">配置字段映射</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.wizard-card { min-height: 620px; }
.step-content { width: min(760px, 100%); margin: 52px auto 0; }
.form-step { width: min(660px, 100%); }
.centered-step { text-align: center; }
.centered-step p { max-width: 620px; margin: 10px auto 24px; color: #74817b; line-height: 1.7; }
.centered-step .el-alert { margin: 24px 0; text-align: left; }
.step-actions { display: flex; justify-content: center; gap: 10px; margin-top: 28px; }
.guide-icon, .success-mark { display: grid; width: 72px; height: 72px; margin: 0 auto 18px; place-items: center; border-radius: 50%; background: #edf6f2; color: #176b4d; font-size: 32px; }
.success-mark { font-size: 26px; font-weight: 750; }
h2 { margin: 0; font-size: 22px; }
</style>
