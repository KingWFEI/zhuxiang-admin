<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ImmersiveHotspot, ImmersiveImage } from '@/api/immersiveTour'

const props = defineProps<{
  image: ImmersiveImage | null
  imageUrl: string
  hotspots: ImmersiveHotspot[]
  message: string
}>()

const emit = defineEmits<{
  jump: [hotspot: ImmersiveHotspot]
  imageError: []
}>()

const stageRef = ref<HTMLElement>()
const imageRef = ref<HTMLImageElement>()
const imageRect = ref({ left: 0, top: 0, width: 0, height: 0 })

const hasImage = computed(() => Boolean(props.image && props.imageUrl))

function recalcImageRect() {
  const stage = stageRef.value
  const image = imageRef.value
  if (!stage || !image || !image.naturalWidth || !image.naturalHeight) {
    imageRect.value = { left: 0, top: 0, width: 0, height: 0 }
    return
  }

  const stageWidth = stage.clientWidth
  const stageHeight = stage.clientHeight
  const scale = Math.min(stageWidth / image.naturalWidth, stageHeight / image.naturalHeight)
  const width = image.naturalWidth * scale
  const height = image.naturalHeight * scale
  imageRect.value = {
    left: (stageWidth - width) / 2,
    top: (stageHeight - height) / 2,
    width,
    height,
  }
}

function handleImageLoad() {
  recalcImageRect()
}

function handleFullscreenChange() {
  void nextTick(recalcImageRect)
}

watch(
  () => props.imageUrl,
  () => {
    imageRect.value = { left: 0, top: 0, width: 0, height: 0 }
    void nextTick(recalcImageRect)
  },
)

onMounted(() => {
  window.addEventListener('resize', recalcImageRect)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  void nextTick(recalcImageRect)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', recalcImageRect)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})
</script>

<template>
  <div ref="stageRef" class="hotspot-viewer">
    <template v-if="hasImage">
      <img
        ref="imageRef"
        class="hotspot-viewer__image"
        :src="imageUrl"
        alt=""
        @load="handleImageLoad"
        @error="emit('imageError')"
      >
      <div
        class="hotspot-viewer__overlay"
        :style="{
          left: `${imageRect.left}px`,
          top: `${imageRect.top}px`,
          width: `${imageRect.width}px`,
          height: `${imageRect.height}px`,
        }"
      >
        <button
          v-for="hotspot in hotspots"
          :key="hotspot.hotspotId"
          class="hotspot-viewer__hotspot"
          :style="{ left: `${Number(hotspot.xRatio) * 100}%`, top: `${Number(hotspot.yRatio) * 100}%` }"
          type="button"
          @click="emit('jump', hotspot)"
        >
          <span class="hotspot-viewer__dot" />
          <span class="hotspot-viewer__label">{{ hotspot.label }}</span>
        </button>
      </div>
    </template>
    <div v-else class="hotspot-viewer__message">{{ message }}</div>
  </div>
</template>

<style scoped lang="scss">
.hotspot-viewer {
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  min-height: 520px;
  place-items: center;
  overflow: hidden;
  background: #070b0f;
}

.hotspot-viewer__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.hotspot-viewer__overlay {
  position: absolute;
}

.hotspot-viewer__hotspot {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  max-width: 190px;
  padding: 5px 9px 5px 6px;
  color: #fff;
  border: 1px solid rgb(255 255 255 / 70%);
  border-radius: 999px;
  background: rgb(18 29 38 / 78%);
  box-shadow: 0 8px 24px rgb(0 0 0 / 35%);
  cursor: pointer;
  transform: translate(-50%, -50%);
}

.hotspot-viewer__dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #4cc38a;
  box-shadow: 0 0 0 4px rgb(76 195 138 / 24%);
}

.hotspot-viewer__label {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hotspot-viewer__message {
  color: #aeb9c2;
  font-size: 16px;
}
</style>
