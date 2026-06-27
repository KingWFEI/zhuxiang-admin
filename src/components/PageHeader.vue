<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <header class="page-header">
    <div class="page-header__copy">
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped lang="scss">
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  min-height: 54px;
}

.page-header__copy {
  min-width: 0;
}

h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 720;
  letter-spacing: 0;
  line-height: 1.25;
}

p {
  margin: 7px 0 0;
  color: #74817b;
  font-size: 13px;
  line-height: 1.5;
}

.page-header__actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
}

@media (max-width: 640px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  h1 {
    font-size: 21px;
  }
}
</style>
