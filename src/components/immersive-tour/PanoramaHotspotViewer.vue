<script setup lang="ts">
import 'pannellum'
import 'pannellum/build/pannellum.css'
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { ImmersiveHotspot, ImmersiveImage, ImmersiveScene } from '@/api/immersiveTour'

type PannellumViewerInstance = ReturnType<Window['pannellum']['viewer']>

const props = defineProps<{
  scene: ImmersiveScene | null
  image: ImmersiveImage | null
  imageUrl: string
  hotspots: ImmersiveHotspot[]
}>()

const emit = defineEmits<{
  jumpScene: [sceneId: string, imageId?: string]
  error: [message: string]
}>()

const containerRef = ref<HTMLElement>()
const viewerRef = ref<PannellumViewerInstance | null>(null)
const resizeObserver = ref<ResizeObserver | null>(null)
const initVersion = ref(0)
const loading = ref(false)
const localError = ref('')

function destroyViewer() {
  resizeObserver.value?.disconnect()
  resizeObserver.value = null
  if (viewerRef.value) {
    try {
      viewerRef.value.destroy()
    } catch {
      // Ignore teardown races.
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
    clickHandlerFunc: () => emit('jumpScene', hotspot.targetSceneId || props.scene?.sceneId || '', hotspot.targetImageId || undefined),
  }
}

async function initViewer() {
  const version = initVersion.value + 1
  initVersion.value = version
  destroyViewer()
  localError.value = ''
  if (!props.image || !props.imageUrl) return
  await nextTick()
  if (version !== initVersion.value || !containerRef.value) return
  if (props.image.projectionType && props.image.projectionType !== 'EQUIRECTANGULAR') {
    localError.value = '入口图片不是等距柱状全景图'
    emit('error', localError.value)
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
      localError.value = `全景图加载失败：${props.imageUrl} ${args.join(' ')}`
      emit('error', localError.value)
    })
  } catch (error) {
    loading.value = false
    localError.value = error instanceof Error ? error.message : 'Pannellum 初始化失败'
    emit('error', localError.value)
  }
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
  <div class="panorama-viewer">
    <div v-if="image && imageUrl" ref="containerRef" class="panorama-viewer__container" />
    <div v-else class="panorama-viewer__message">该全景场景未设置入口图片</div>
    <div v-if="loading" class="panorama-viewer__loading">全景加载中...</div>
    <div v-if="localError" class="panorama-viewer__error">{{ localError }}</div>
  </div>
</template>

<style scoped lang="scss">
.panorama-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 520px;
  overflow: hidden;
  background: #05080c;
}

.panorama-viewer__container {
  width: 100%;
  height: 100%;
  min-height: 520px;
}

.panorama-viewer__message,
.panorama-viewer__loading,
.panorama-viewer__error {
  position: absolute;
  inset: 0;
  display: grid;
  padding: 18px;
  place-items: center;
  color: #aeb9c2;
  text-align: center;
}

.panorama-viewer__error {
  color: #ffb4a8;
  background: rgb(0 0 0 / 48%);
}
</style>
