<script setup lang="ts">
import type { ImmersiveScene, RenderMode, SceneType } from '@/api/immersiveTour'

defineProps<{
  scenes: ImmersiveScene[]
  currentSceneId: string
}>()

const emit = defineEmits<{
  select: [sceneId: string]
}>()

const sceneTypeLabels: Partial<Record<SceneType, string>> = {
  ENTRANCE: '入户',
  LIVING_ROOM: '客厅',
  MASTER_BEDROOM: '主卧',
  SECOND_BEDROOM: '次卧',
  BEDROOM: '卧室',
  KITCHEN: '厨房',
  BATHROOM: '卫生间',
  BALCONY: '阳台',
  DINING_ROOM: '餐厅',
  STUDY: '书房',
  CORRIDOR: '过道',
  OTHER: '其他',
}

const renderModeLabels: Record<RenderMode, string> = {
  PHOTO: '普通图片',
  PANORAMA: '全景图',
}

function sceneTypeText(type?: SceneType | null) {
  return (type && sceneTypeLabels[type]) || '其他'
}

function renderModeText(mode?: RenderMode | null) {
  return renderModeLabels[mode || 'PHOTO']
}
</script>

<template>
  <aside class="scene-navigator">
    <div class="scene-navigator__title">场景列表</div>
    <button
      v-for="scene in scenes"
      :key="scene.sceneId"
      class="scene-navigator__item"
      :class="{ 'scene-navigator__item--active': scene.sceneId === currentSceneId }"
      type="button"
      @click="emit('select', scene.sceneId)"
    >
      <strong>{{ scene.name }}</strong>
      <span>{{ sceneTypeText(scene.sceneType) }} · {{ renderModeText(scene.renderMode) }}</span>
    </button>
    <div v-if="!scenes.length" class="scene-navigator__empty">暂无可用场景</div>
  </aside>
</template>

<style scoped lang="scss">
.scene-navigator {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 8px;
  width: 220px;
  padding: 14px;
  overflow-y: auto;
  border-right: 1px solid rgb(255 255 255 / 10%);
  background: #141a1f;
}

.scene-navigator__title {
  margin-bottom: 4px;
  color: #9daab4;
  font-size: 13px;
}

.scene-navigator__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 11px;
  color: #dce4ea;
  text-align: left;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 6px;
  background: #1d252c;
  cursor: pointer;
}

.scene-navigator__item--active {
  color: #ffffff;
  border-color: #4cc38a;
  background: #1f4d3b;
}

.scene-navigator__item span,
.scene-navigator__empty {
  color: #9daab4;
  font-size: 12px;
}

@media (max-width: 980px) {
  .scene-navigator {
    flex-direction: row;
    width: 100%;
    border-top: 1px solid rgb(255 255 255 / 10%);
    border-right: 0;
    overflow-x: auto;
  }

  .scene-navigator__title {
    display: none;
  }

  .scene-navigator__item {
    min-width: 150px;
  }
}
</style>
