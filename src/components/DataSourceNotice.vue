<script setup lang="ts">
import { computed } from 'vue'

type SourceType = 'real' | 'mock' | 'mixed'

const props = defineProps<{
  type: SourceType
  detail?: string
}>()

const sourceConfig = computed(() => {
  if (props.type === 'real') {
    return { label: '实时接口', alertType: 'success' as const, icon: 'Connection' }
  }
  if (props.type === 'mixed') {
    return { label: '混合数据', alertType: 'warning' as const, icon: 'DataAnalysis' }
  }
  return { label: '模拟数据', alertType: 'info' as const, icon: 'Files' }
})
</script>

<template>
  <el-alert :type="sourceConfig.alertType" :closable="false" show-icon class="source-notice">
    <template #title>
      <span class="source-notice__label">{{ sourceConfig.label }}</span>
      <span class="source-notice__detail">
        {{
          detail ||
            (type === 'mock'
              ? '当前后端尚未提供对应管理接口，页面数据仅用于交互与布局演示。'
              : '页面数据来自后端真实接口。')
        }}
      </span>
    </template>
  </el-alert>
</template>

<style scoped lang="scss">
.source-notice {
  border-radius: 6px;
}

.source-notice__label {
  margin-right: 8px;
  font-weight: 700;
}

.source-notice__detail {
  font-weight: 400;
}
</style>
