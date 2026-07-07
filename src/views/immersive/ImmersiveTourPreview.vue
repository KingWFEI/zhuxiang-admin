<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { FullScreen, Refresh, SwitchButton } from '@element-plus/icons-vue'
import {
  getAppTourDetail,
  getHotspots,
  getTourAvailability,
  type AdminImmersiveTourDetail,
  type ImmersiveHotspot,
  type ImmersiveImage,
} from '@/api/immersiveTour'
import SceneNavigator from '@/views/immersive/components/SceneNavigator.vue'
import ImageHotspotViewer from '@/views/immersive/components/ImageHotspotViewer.vue'
import PanoramaHotspotViewer from '@/components/immersive-tour/PanoramaHotspotViewer.vue'

const route = useRoute()
const router = useRouter()

const serviceOrigin = 'http://localhost:8001'
const previewRootRef = ref<HTMLElement>()
const houseId = ref(String(route.params.houseId || ''))
const loading = ref(false)
const errorMessage = ref('')
const tour = ref<AdminImmersiveTourDetail | null>(null)
const currentSceneId = ref('')
const currentImageId = ref('')
const imageError = ref(false)
const fallbackHotspots = ref<ImmersiveHotspot[]>([])

const enabledScenes = computed(() => {
  return (tour.value?.scenes || [])
    .filter((scene) => scene.enabled !== 0)
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
})

const currentScene = computed(() => enabledScenes.value.find((scene) => scene.sceneId === currentSceneId.value) || null)

const currentImage = computed<ImmersiveImage | null>(() => {
  const scene = currentScene.value
  if (!scene) return null
  const images = scene.images || []
  return (
    images.find((image) => image.imageId === currentImageId.value) ||
    images.find((image) => image.imageId === scene.entryImageId) ||
    images.find((image) => image.entry) ||
    null
  )
})

const currentHotspots = computed(() => {
  const embeddedHotspots = currentImage.value?.hotspots || []
  return embeddedHotspots.length ? embeddedHotspots : fallbackHotspots.value
})

const currentImageUrl = computed(() => normalizeAssetUrl(currentImage.value?.imageUrl))
const currentRenderMode = computed(() => currentScene.value?.renderMode || 'PHOTO')

const viewerMessage = computed(() => {
  if (loading.value) return '正在加载沉浸式看房数据'
  if (errorMessage.value) return errorMessage.value
  if (!currentScene.value) return '入口场景不存在'
  if (!currentImage.value) return currentRenderMode.value === 'PANORAMA' ? '该全景场景未设置入口图片' : '该场景未设置入口图片'
  if (imageError.value) return '图片加载失败'
  return ''
})

function normalizeAssetUrl(url?: string | null) {
  if (!url) return ''
  if (import.meta.env.DEV && url.startsWith(`${serviceOrigin}/files/`)) {
    return url.replace(`${serviceOrigin}/files`, '/immersive-files')
  }
  if (import.meta.env.DEV && url.startsWith('/files/')) {
    return url.replace('/files', '/immersive-files')
  }
  if (/^https?:\/\//i.test(url)) return url
  return `${serviceOrigin}${url.startsWith('/') ? '' : '/'}${url}`
}

function findEntryScene(detail: AdminImmersiveTourDetail) {
  const scenes = (detail.scenes || []).filter((scene) => scene.enabled !== 0)
  return scenes.find((scene) => scene.sceneId === detail.entrySceneId) || scenes[0] || null
}

function findSceneByImageId(imageId: string) {
  return enabledScenes.value.find((scene) => (scene.images || []).some((image) => image.imageId === imageId)) || null
}

function findEntryImageId(scene = currentScene.value) {
  const images = scene?.images || []
  return images.find((image) => image.imageId === scene?.entryImageId)?.imageId || images.find((image) => image.entry)?.imageId || images[0]?.imageId || ''
}

async function loadPreview() {
  if (!houseId.value) {
    errorMessage.value = '房源 ID 缺失'
    return
  }

  loading.value = true
  errorMessage.value = ''
  imageError.value = false
  try {
    const availability = await getTourAvailability(houseId.value)
    if (!availability.available) {
      tour.value = null
      currentSceneId.value = ''
      errorMessage.value = '该房源暂未发布沉浸式看房'
      return
    }

    const detail = await getAppTourDetail(houseId.value)
    tour.value = detail
    if (!detail.scenes?.length) {
      currentSceneId.value = ''
      errorMessage.value = '场景数据为空'
      return
    }

    const entryScene = findEntryScene(detail)
    if (!entryScene) {
      currentSceneId.value = ''
      errorMessage.value = '入口场景不存在'
      return
    }
    currentSceneId.value = entryScene.sceneId
    currentImageId.value = findEntryImageId(entryScene)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '请求失败，请检查沉浸式服务状态'
  } finally {
    loading.value = false
  }
}

function selectScene(sceneId: string) {
  currentSceneId.value = sceneId
  currentImageId.value = findEntryImageId(enabledScenes.value.find((scene) => scene.sceneId === sceneId) || null)
  imageError.value = false
}

function jumpByHotspot(hotspot: ImmersiveHotspot) {
  const targetImageId = hotspot.targetType === 'IMAGE' ? hotspot.targetImageId || undefined : undefined
  switchTarget(hotspot.targetSceneId || currentSceneId.value, targetImageId)
}

function switchTarget(targetSceneId: string, targetImageId?: string) {
  const targetScene = targetImageId ? findSceneByImageId(targetImageId) || enabledScenes.value.find((scene) => scene.sceneId === targetSceneId) : enabledScenes.value.find((scene) => scene.sceneId === targetSceneId)
  if (!targetScene) {
    ElMessage.warning('热点目标场景已删除')
    return
  }
  currentSceneId.value = targetScene.sceneId
  currentImageId.value = targetImageId || findEntryImageId(targetScene)
  imageError.value = false
}

async function openFullscreen() {
  await nextTick()
  if (!previewRootRef.value) return
  if (document.fullscreenElement) {
    await document.exitFullscreen()
  } else {
    await previewRootRef.value.requestFullscreen()
  }
}

function handleBackManage() {
  if (houseId.value) {
    void router.push(`/immersive-tour/house/${houseId.value}`)
  } else {
    void router.push('/immersive-tour/debug')
  }
}

watch(
  () => [currentImage.value?.imageId, currentImage.value?.hotspots?.length] as const,
  async ([imageId, embeddedHotspotCount]) => {
    fallbackHotspots.value = []
    if (!imageId || embeddedHotspotCount) return
    try {
      fallbackHotspots.value = await getHotspots(imageId)
    } catch {
      fallbackHotspots.value = []
    }
  },
)

onMounted(loadPreview)
</script>

<template>
  <div ref="previewRootRef" class="preview-page">
    <header class="preview-topbar">
      <div class="preview-topbar__left">
        <el-button :icon="SwitchButton" @click="handleBackManage">返回管理页</el-button>
        <div class="preview-title">
          <span>房源 ID：{{ houseId || '-' }}</span>
          <strong>{{ tour?.title || '沉浸式看房预览' }}</strong>
          <span>当前场景：{{ currentScene?.name || '-' }}</span>
        </div>
      </div>
      <div class="preview-topbar__actions">
        <el-button :icon="FullScreen" @click="openFullscreen">全屏预览</el-button>
        <el-button :icon="Refresh" :loading="loading" @click="loadPreview">刷新</el-button>
      </div>
    </header>

    <main class="preview-shell">
      <SceneNavigator :scenes="enabledScenes" :current-scene-id="currentSceneId" @select="selectScene" />
      <ImageHotspotViewer
        v-if="currentRenderMode === 'PHOTO'"
        :image="currentImage"
        :image-url="currentImageUrl"
        :hotspots="currentHotspots.filter((item) => item.xRatio != null && item.yRatio != null)"
        :message="viewerMessage"
        @jump="jumpByHotspot"
        @image-error="imageError = true"
      />
      <PanoramaHotspotViewer
        v-else
        :scene="currentScene"
        :image="currentImage"
        :image-url="currentImageUrl"
        :hotspots="currentHotspots.filter((item) => item.yaw != null && item.pitch != null)"
        @jump-scene="switchTarget"
        @error="(message) => (errorMessage = message)"
      />
    </main>
  </div>
</template>

<style scoped lang="scss">
.preview-page {
  display: flex;
  min-height: calc(100vh - 116px);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #dfe5e2;
  border-radius: 6px;
  background: #0b1015;
}

.preview-page:fullscreen {
  min-height: 100vh;
  border: 0;
  border-radius: 0;
}

.preview-topbar {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  color: #e8eef2;
  border-bottom: 1px solid rgb(255 255 255 / 10%);
  background: #111820;
}

.preview-topbar__left,
.preview-topbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-title {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.preview-title span {
  color: #aeb9c2;
  font-size: 13px;
}

.preview-title strong {
  font-size: 16px;
}

.preview-shell {
  display: flex;
  min-height: 0;
  flex: 1;
}

@media (max-width: 980px) {
  .preview-page {
    min-height: calc(100vh - 104px);
  }

  .preview-topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .preview-shell {
    flex-direction: column-reverse;
  }
}
</style>
