<script setup lang="ts">
import 'pannellum'
import 'pannellum/build/pannellum.css'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Aim, Delete, FullScreen, Refresh, View } from '@element-plus/icons-vue'
import {
  type HotspotPayload,
  type HotspotTargetType,
  type ImmersiveHotspot,
  type ImmersiveImage,
  type ImmersiveScene,
  type ProjectionType,
  type RenderMode,
} from '@/api/immersiveTour'

type PannellumViewerInstance = ReturnType<Window['pannellum']['viewer']>

interface HotspotForm {
  hotspotId?: string
  label: string
  targetType: HotspotTargetType
  targetSceneId: string
  targetImageId: string
  yaw: number
  pitch: number
}

const props = defineProps<{
  scene: ImmersiveScene | null
  image: ImmersiveImage | null
  imageUrl: string
  hotspots: ImmersiveHotspot[]
  scenes: ImmersiveScene[]
  readonly?: boolean
}>()

const emit = defineEmits<{
  createHotspot: [payload: HotspotPayload]
  updateHotspot: [hotspotId: string, payload: HotspotPayload]
  deleteHotspot: [hotspotId: string]
  saveInitialView: [payload: { initialYaw: number; initialPitch: number; initialHfov: number }]
  jumpScene: [sceneId: string, imageId?: string]
}>()

const containerRef = ref<HTMLElement>()
const viewerRef = ref<PannellumViewerInstance | null>(null)
const resizeObserver = ref<ResizeObserver | null>(null)
const initVersion = ref(0)
const loading = ref(false)
const errorMessage = ref('')
const pointerStart = ref<{ x: number; y: number; time: number } | null>(null)
const dialogVisible = ref(false)
const hotspotFormRef = ref<FormInstance>()
const hotspotForm = ref<HotspotForm>({
  label: '',
  targetType: 'SCENE',
  targetSceneId: '',
  targetImageId: '',
  yaw: 0,
  pitch: 0,
})
const targetImageOptions = ref<ImmersiveImage[]>([])

const targetScenes = computed(() => props.scenes.filter((scene) => scene.sceneId !== props.scene?.sceneId))

const renderModeLabels: Record<RenderMode, string> = {
  PHOTO: '普通图片',
  PANORAMA: '全景图',
}
const projectionTypeLabels: Record<ProjectionType, string> = {
  FLAT: '平面图片',
  EQUIRECTANGULAR: '等距柱状全景图',
}

const rules: FormRules = {
  label: [{ required: true, message: '请输入热点名称', trigger: 'blur' }],
  targetSceneId: [
    {
      validator: (_rule, value, callback) => {
        if (hotspotForm.value.targetType === 'SCENE' && !value) callback(new Error('请选择目标场景'))
        else callback()
      },
      trigger: 'change',
    },
  ],
  targetImageId: [
    {
      validator: (_rule, value, callback) => {
        if (hotspotForm.value.targetType === 'IMAGE' && !value) callback(new Error('请选择目标图片'))
        else callback()
      },
      trigger: 'change',
    },
  ],
  yaw: [{ required: true, type: 'number', min: -180, max: 180, message: '水平角度必须在 -180 到 180 之间', trigger: 'blur' }],
  pitch: [{ required: true, type: 'number', min: -90, max: 90, message: '垂直角度必须在 -90 到 90 之间', trigger: 'blur' }],
}

function renderModeText(mode?: RenderMode | null) {
  return renderModeLabels[mode || 'PHOTO']
}

function projectionTypeText(type?: ProjectionType | null) {
  return projectionTypeLabels[type || 'EQUIRECTANGULAR']
}

function resolveHotspotTargetType(hotspot: Pick<ImmersiveHotspot, 'targetType' | 'targetImageId'>): HotspotTargetType {
  return hotspot.targetType || (hotspot.targetImageId ? 'IMAGE' : 'SCENE')
}

function targetImageLabel(image: ImmersiveImage) {
  const entryText = image.entry ? '入口图片' : '普通图片'
  return `${image.name?.trim() || '未命名图片'} · ${entryText}`
}

function loadTargetImages(selectedTargetImageId = '') {
  targetImageOptions.value = props.scene?.images || []
  if (selectedTargetImageId) {
    hotspotForm.value.targetImageId = selectedTargetImageId
  } else if (!targetImageOptions.value.some((item) => item.imageId === hotspotForm.value.targetImageId)) {
    hotspotForm.value.targetImageId = targetImageOptions.value.find((item) => item.imageId !== props.image?.imageId)?.imageId || ''
  }
}

function handleTargetTypeChange(type: HotspotTargetType) {
  hotspotForm.value.targetType = type
  hotspotForm.value.targetImageId = ''
  if (type === 'SCENE') {
    hotspotForm.value.targetSceneId = targetScenes.value[0]?.sceneId || ''
    return
  }
  hotspotForm.value.targetSceneId = props.scene?.sceneId || ''
  loadTargetImages()
}

function isValidYawPitch(yaw: number, pitch: number) {
  return Number.isFinite(yaw) && yaw >= -180 && yaw <= 180 && Number.isFinite(pitch) && pitch >= -90 && pitch <= 90
}

function destroyViewer() {
  resizeObserver.value?.disconnect()
  resizeObserver.value = null
  if (viewerRef.value) {
    try {
      viewerRef.value.destroy()
    } catch {
      // Ignore Pannellum cleanup errors when DOM has already been removed.
    }
  }
  viewerRef.value = null
}

function toHotspotConfig(hotspot: ImmersiveHotspot) {
  if (hotspot.yaw == null || hotspot.pitch == null) return null
  return {
    id: hotspot.hotspotId,
    yaw: Number(hotspot.yaw),
    pitch: Number(hotspot.pitch),
    type: 'info' as const,
    text: hotspot.label,
    clickHandlerFunc: (event: MouseEvent) => {
      event.stopPropagation()
      if (props.readonly) {
        emit('jumpScene', hotspot.targetSceneId || props.scene?.sceneId || '', hotspot.targetImageId || undefined)
      } else {
        openEditDialog(hotspot)
      }
    },
  }
}

async function initViewer() {
  const version = initVersion.value + 1
  initVersion.value = version
  destroyViewer()
  errorMessage.value = ''
  if (!props.image || !props.imageUrl) return
  await nextTick()
  if (version !== initVersion.value || !containerRef.value) return
  if (props.image.projectionType && props.image.projectionType !== 'EQUIRECTANGULAR') {
    errorMessage.value = '入口图片不是等距柱状全景图'
    return
  }

  loading.value = true

  try {
    viewerRef.value = window.pannellum.viewer(containerRef.value, {
      type: 'equirectangular',
      panorama: props.imageUrl,
      autoLoad: true,
      yaw: props.scene?.initialYaw ?? 0,
      pitch: props.scene?.initialPitch ?? 0,
      hfov: props.scene?.initialHfov ?? 90,
      showControls: true,
      showFullscreenCtrl: true,
      showZoomCtrl: true,
      keyboardZoom: true,
      crossOrigin: 'anonymous',
      hotSpots: props.hotspots.map(toHotspotConfig).filter((item) => item !== null),
    })
    resizeObserver.value = new ResizeObserver(() => viewerRef.value?.resize())
    resizeObserver.value.observe(containerRef.value)
    viewerRef.value.on('load', () => {
      loading.value = false
      viewerRef.value?.resize()
    })
    viewerRef.value.on('error', (...args: unknown[]) => {
      loading.value = false
      errorMessage.value = `全景图加载失败：${props.imageUrl} ${args.join(' ')}`
    })
  } catch (error) {
    loading.value = false
    errorMessage.value = error instanceof Error ? error.message : 'Pannellum 初始化失败'
  }
}

function handlePointerDown(event: PointerEvent) {
  if (props.readonly) return
  pointerStart.value = { x: event.clientX, y: event.clientY, time: Date.now() }
}

function handlePointerUp(event: PointerEvent) {
  if (props.readonly || !viewerRef.value || !pointerStart.value) return
  const target = event.target as HTMLElement
  if (target.closest('.pnlm-controls, .pnlm-hotspot, .pnlm-hot-spot')) return
  const distance = Math.hypot(event.clientX - pointerStart.value.x, event.clientY - pointerStart.value.y)
  const elapsed = Date.now() - pointerStart.value.time
  pointerStart.value = null
  if (distance > 6 || elapsed > 500) return

  const [pitch, yaw] = viewerRef.value.mouseEventToCoords(event)
  hotspotForm.value = {
    label: '',
    targetType: 'SCENE',
    targetSceneId: targetScenes.value[0]?.sceneId || '',
    targetImageId: '',
    yaw: Number(yaw.toFixed(6)),
    pitch: Number(pitch.toFixed(6)),
  }
  dialogVisible.value = true
}

function openEditDialog(hotspot: ImmersiveHotspot) {
  if (hotspot.yaw == null || hotspot.pitch == null) {
    ElMessage.warning('该热点缺少全景坐标')
    return
  }
  hotspotForm.value = {
    hotspotId: hotspot.hotspotId,
    label: hotspot.label,
    targetType: resolveHotspotTargetType(hotspot),
    targetSceneId: hotspot.targetSceneId || '',
    targetImageId: hotspot.targetImageId || '',
    yaw: Number(Number(hotspot.yaw).toFixed(6)),
    pitch: Number(Number(hotspot.pitch).toFixed(6)),
  }
  if (hotspotForm.value.targetType === 'IMAGE') {
    hotspotForm.value.targetSceneId = props.scene?.sceneId || ''
    loadTargetImages(hotspotForm.value.targetImageId)
  }
  dialogVisible.value = true
}

async function submitHotspot() {
  const valid = await hotspotFormRef.value?.validate().catch(() => false)
  if (!valid) return
  const form = hotspotForm.value
  if (!isValidYawPitch(form.yaw, form.pitch)) {
    ElMessage.warning('全景坐标超出范围')
    return
  }
  const payload: HotspotPayload = {
    label: form.label,
    targetType: form.targetType,
    yaw: form.yaw,
    pitch: form.pitch,
  }
  if (form.targetType === 'IMAGE') {
    payload.targetImageId = form.targetImageId
  } else {
    payload.targetSceneId = form.targetSceneId
  }
  if (form.hotspotId) {
    emit('updateHotspot', form.hotspotId, payload)
  } else {
    emit('createHotspot', payload)
  }
  dialogVisible.value = false
}

async function confirmDelete() {
  if (!hotspotForm.value.hotspotId) return
  try {
    await ElMessageBox.confirm(`确定删除热点「${hotspotForm.value.label}」吗？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  emit('deleteHotspot', hotspotForm.value.hotspotId)
  dialogVisible.value = false
}

function saveCurrentView() {
  if (!viewerRef.value) {
    ElMessage.warning('全景播放器尚未初始化')
    return
  }
  emit('saveInitialView', {
    initialYaw: Number(viewerRef.value.getYaw().toFixed(6)),
    initialPitch: Number(viewerRef.value.getPitch().toFixed(6)),
    initialHfov: Number(viewerRef.value.getHfov().toFixed(6)),
  })
}

function toggleFullscreen() {
  viewerRef.value?.toggleFullscreen()
}

watch(
  () => [props.scene?.sceneId, props.image?.imageId, props.imageUrl],
  () => {
    void initViewer()
  },
  { immediate: true },
)

watch(
  () => props.hotspots,
  () => {
    void initViewer()
  },
  { deep: true },
)

onBeforeUnmount(destroyViewer)
</script>

<template>
  <div class="panorama-editor">
    <div class="panorama-editor__toolbar">
      <span>{{ projectionTypeText(image?.projectionType) }}</span>
      <el-button size="small" :icon="Aim" :disabled="readonly || !image" @click="saveCurrentView">保存当前视角</el-button>
      <el-button size="small" :icon="FullScreen" :disabled="!image" @click="toggleFullscreen">全屏</el-button>
      <el-button size="small" :icon="Refresh" :disabled="!image" @click="initViewer">重载</el-button>
    </div>
    <div class="panorama-editor__stage">
      <div
        v-if="image && imageUrl"
        ref="containerRef"
        class="panorama-editor__viewer"
        @pointerdown="handlePointerDown"
        @pointerup="handlePointerUp"
      />
      <div v-else class="panorama-editor__empty">全景图场景没有入口图片</div>
      <div v-if="loading" class="panorama-editor__loading">全景加载中...</div>
      <div v-if="errorMessage" class="panorama-editor__error">{{ errorMessage }}</div>
    </div>

    <el-dialog v-model="dialogVisible" :title="hotspotForm.hotspotId ? '编辑全景热点' : '新建全景热点'" width="520px" destroy-on-close>
      <el-form ref="hotspotFormRef" :model="hotspotForm" :rules="rules" label-width="108px">
        <el-form-item label="热点名称" prop="label">
          <el-input v-model="hotspotForm.label" />
        </el-form-item>
        <el-form-item label="跳转方式">
          <el-radio-group v-model="hotspotForm.targetType" @change="(value) => handleTargetTypeChange(value as HotspotTargetType)">
            <el-radio-button label="SCENE">跳转场景</el-radio-button>
            <el-radio-button label="IMAGE">跳转图片</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="hotspotForm.targetType === 'SCENE'" label="目标场景" prop="targetSceneId">
          <el-select v-model="hotspotForm.targetSceneId" style="width: 100%">
            <el-option
              v-for="targetScene in targetScenes"
              :key="targetScene.sceneId"
              :label="`${targetScene.name} (${renderModeText(targetScene.renderMode)})`"
              :value="targetScene.sceneId"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="hotspotForm.targetType === 'IMAGE'" label="目标图片" prop="targetImageId">
          <el-select v-model="hotspotForm.targetImageId" style="width: 100%" placeholder="请选择目标图片">
            <el-option
              v-for="targetImage in targetImageOptions"
              :key="targetImage.imageId"
              :label="targetImageLabel(targetImage)"
              :value="targetImage.imageId"
              :disabled="targetImage.imageId === image?.imageId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="水平角度" prop="yaw">
          <el-input-number v-model="hotspotForm.yaw" :min="-180" :max="180" :step="0.000001" :precision="6" controls-position="right" />
        </el-form-item>
        <el-form-item label="垂直角度" prop="pitch">
          <el-input-number v-model="hotspotForm.pitch" :min="-90" :max="90" :step="0.000001" :precision="6" controls-position="right" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button v-if="hotspotForm.hotspotId" type="danger" :icon="Delete" @click="confirmDelete">删除</el-button>
        <el-button
          v-if="hotspotForm.targetSceneId || hotspotForm.targetImageId"
          :icon="View"
          @click="emit('jumpScene', hotspotForm.targetSceneId || scene?.sceneId || '', hotspotForm.targetImageId || undefined)"
        >
          预览跳转
        </el-button>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitHotspot">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.panorama-editor {
  display: flex;
  min-height: 520px;
  flex-direction: column;
}

.panorama-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

.panorama-editor__toolbar span {
  color: #84918b;
  font-size: 12px;
}

.panorama-editor__stage {
  position: relative;
  flex: 1;
  min-height: 460px;
  overflow: hidden;
  border: 1px solid #dfe5e2;
  border-radius: 6px;
  background: #05080c;
}

.panorama-editor__viewer {
  width: 100%;
  height: 100%;
  min-height: 460px;
}

.panorama-editor__empty,
.panorama-editor__loading,
.panorama-editor__error {
  position: absolute;
  inset: 0;
  display: grid;
  padding: 18px;
  place-items: center;
  text-align: center;
}

.panorama-editor__empty,
.panorama-editor__loading {
  color: #aeb9c2;
}

.panorama-editor__error {
  color: #ffb4a8;
  background: rgb(0 0 0 / 48%);
}
</style>
