<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { TemplateComponent } from '@/api/contractTemplate'

GlobalWorkerOptions.workerSrc = workerUrl

const props = defineProps<{
  fileUrl: string
  components: TemplateComponent[]
  selectedComponentId: string | null
}>()

const emit = defineEmits<{ select: [componentId: string] }>()
const loading = ref(false)
const error = ref('')
const zoom = ref(1.15)
const pages = ref<Array<{ pageNum: number; width: number; height: number }>>([])
const canvases = new Map<number, HTMLCanvasElement>()
let pdf: PDFDocumentProxy | null = null
let loadToken = 0

const componentsByPage = computed(() => {
  const grouped = new Map<number, TemplateComponent[]>()
  for (const item of props.components) {
    const page = item.pageNum || 1
    grouped.set(page, [...(grouped.get(page) || []), item])
  }
  return grouped
})

function setCanvas(pageNum: number, element: unknown) {
  if (element instanceof HTMLCanvasElement) canvases.set(pageNum, element)
}

function componentClass(item: TemplateComponent) {
  return {
    'component-box--selected': item.componentId === props.selectedComponentId,
    'component-box--error': item.validationErrors.length > 0 || (item.required && !item.mappingMode),
    'component-box--signature': item.componentType === 6 || item.mappingMode === 'SIGNATURE',
    'component-box--mapped': Boolean(item.mappingMode),
  }
}

function boxStyle(item: TemplateComponent, page: { width: number; height: number }) {
  const x = item.positionX || 0
  const y = item.positionY || 0
  const width = Math.max(item.width || 72, 18)
  const height = Math.max(item.height || 24, 14)
  return {
    left: `${x * zoom.value}px`,
    top: `${Math.max(0, page.height - y - height) * zoom.value}px`,
    width: `${width * zoom.value}px`,
    height: `${height * zoom.value}px`,
  }
}

async function renderPages() {
  if (!pdf) return
  await nextTick()
  for (const meta of pages.value) {
    const canvas = canvases.get(meta.pageNum)
    if (!canvas) continue
    const page = await pdf.getPage(meta.pageNum)
    const viewport = page.getViewport({ scale: zoom.value })
    canvas.width = viewport.width
    canvas.height = viewport.height
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`
    const context = canvas.getContext('2d')
    if (context) await page.render({ canvas, canvasContext: context, viewport }).promise
  }
}

async function loadPdf() {
  const token = ++loadToken
  error.value = ''
  canvases.clear()
  if (!props.fileUrl) {
    pages.value = []
    return
  }
  loading.value = true
  try {
    await pdf?.destroy()
    pdf = await getDocument({ url: props.fileUrl, withCredentials: false }).promise
    if (token !== loadToken) return
    const result: Array<{ pageNum: number; width: number; height: number }> = []
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1 })
      result.push({ pageNum, width: viewport.width, height: viewport.height })
    }
    pages.value = result
    await renderPages()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'PDF 加载失败'
  } finally {
    if (token === loadToken) loading.value = false
  }
}

watch(() => props.fileUrl, loadPdf, { immediate: true })
watch(zoom, renderPages)
onBeforeUnmount(() => { void pdf?.destroy() })
</script>

<template>
  <div class="pdf-mapper">
    <div class="pdf-toolbar">
      <strong>合同与控件定位</strong>
      <div>
        <el-button size="small" :disabled="zoom <= 0.75" @click="zoom = Math.max(0.75, zoom - 0.1)">缩小</el-button>
        <span>{{ Math.round(zoom * 100) }}%</span>
        <el-button size="small" :disabled="zoom >= 1.8" @click="zoom = Math.min(1.8, zoom + 0.1)">放大</el-button>
      </div>
    </div>
    <div v-loading="loading" class="pdf-scroll">
      <el-empty v-if="!fileUrl" description="暂无模板预览，请先同步模板" />
      <el-result v-else-if="error" icon="error" title="PDF 加载失败" :sub-title="error" />
      <div v-else class="pdf-pages">
        <div
          v-for="page in pages"
          :key="page.pageNum"
          class="pdf-page"
          :style="{ width: `${page.width * zoom}px`, height: `${page.height * zoom}px` }"
        >
          <canvas :ref="(element) => setCanvas(page.pageNum, element)" />
          <button
            v-for="item in componentsByPage.get(page.pageNum) || []"
            :key="item.componentId"
            type="button"
            class="component-box"
            :class="componentClass(item)"
            :style="boxStyle(item, page)"
            :title="`${item.componentName} · ${item.componentKey || '未设置 Key'}`"
            @click="emit('select', item.componentId)"
          >
            <span>{{ item.componentName }}</span>
          </button>
          <span class="page-number">第 {{ page.pageNum }} 页</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.pdf-mapper { display: flex; min-height: 720px; flex-direction: column; overflow: hidden; border: 1px solid #dfe5e2; border-radius: 6px; background: #e9edeb; }
.pdf-toolbar { display: flex; z-index: 2; align-items: center; justify-content: space-between; min-height: 52px; padding: 0 14px; border-bottom: 1px solid #dfe5e2; background: white; }
.pdf-toolbar div { display: flex; align-items: center; gap: 9px; color: #74817b; font-size: 12px; }
.pdf-scroll { flex: 1; min-height: 0; overflow: auto; padding: 24px; }
.pdf-pages { display: flex; align-items: center; flex-direction: column; gap: 22px; }
.pdf-page { position: relative; flex: none; background: white; box-shadow: 0 3px 16px rgb(24 35 31 / 15%); }
.pdf-page canvas { position: absolute; inset: 0; }
.component-box { position: absolute; z-index: 1; overflow: visible; padding: 0; cursor: pointer; border: 2px solid #dc5e45; background: rgb(220 94 69 / 16%); }
.component-box span { position: absolute; bottom: 100%; left: -2px; max-width: 180px; padding: 2px 5px; overflow: hidden; color: white; background: #dc5e45; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.component-box--mapped { border-color: #297d60; background: rgb(41 125 96 / 14%); }
.component-box--mapped span { background: #297d60; }
.component-box--signature { border-color: #7757a8; background: rgb(119 87 168 / 15%); }
.component-box--signature span { background: #7757a8; }
.component-box--selected { z-index: 3; outline: 3px solid rgb(255 177 0 / 62%); outline-offset: 2px; }
.component-box--error { border-style: dashed; }
.page-number { position: absolute; right: 8px; bottom: 6px; color: #8a9691; font-size: 10px; }
</style>
