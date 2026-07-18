<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  Check,
  Delete,
  Edit,
  Finished,
  View,
  Plus,
  Refresh,
  Search,
  UploadFilled,
  VideoPlay,
  Warning,
} from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import DataSourceNotice from '@/components/DataSourceNotice.vue'
import PanoramaHotspotEditor from '@/components/immersive-tour/PanoramaHotspotEditor.vue'
import { getHouseList, type HouseItem } from '@/api/house'
import {
  createHotspot,
  createScene,
  createTour,
  deleteHotspot,
  deleteScene,
  deleteSceneImage,
  getHotspots,
  getSceneImages,
  getScenes,
  getTourAvailability,
  getTourByHouseId,
  offlineTour,
  publishTour,
  setEntryImage,
  setEntryScene,
  updateHotspot,
  updateScene,
  updateSceneImage,
  uploadSceneImages,
  type AvailabilityResponse,
  type HotspotPayload,
  type HotspotTargetType,
  type ImmersiveHotspot,
  type ImmersiveImage,
  type ImmersiveScene,
  type ImmersiveTourSummary,
  type ProjectionType,
  type RenderMode,
  type SceneType,
  type TourStatus,
} from '@/api/immersiveTour'

interface PendingFile {
  uid: string
  file: File
  previewUrl: string
  width?: number
  height?: number
}

interface HotspotForm {
  hotspotId?: string
  label: string
  targetType: HotspotTargetType
  targetSceneId: string
  targetImageId: string
  xRatio: number
  yRatio: number
}

const route = useRoute()
const router = useRouter()

const serviceOrigin = 'http://localhost:8001'
const houseId = ref(String(route.params.houseId || ''))
const tour = ref<ImmersiveTourSummary | null>(null)
const scenes = ref<ImmersiveScene[]>([])
const images = ref<ImmersiveImage[]>([])
const hotspots = ref<ImmersiveHotspot[]>([])
const pendingFiles = ref<PendingFile[]>([])
const selectedSceneId = ref('')
const selectedImageId = ref('')
const availability = ref<AvailabilityResponse | null>(null)
const lastError = ref('')

const loading = ref(false)
const sceneLoading = ref(false)
const imageLoading = ref(false)
const hotspotLoading = ref(false)
const creatingTour = ref(false)
const publishing = ref(false)
const offlining = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadSuccessCount = ref(0)
const uploadFailCount = ref(0)
const uploadError = ref('')
const houseDialogVisible = ref(false)
const houseLoading = ref(false)
const houseList = ref<HouseItem[]>([])
const houseKeyword = ref('')
const selectedHouse = ref<HouseItem | null>(null)

const sceneDialogVisible = ref(false)
const sceneSaving = ref(false)
const editingSceneId = ref<string | null>(null)
const sceneFormRef = ref<FormInstance>()
const sceneForm = reactive({
  name: '',
  sceneType: 'LIVING_ROOM' as SceneType,
  renderMode: 'PHOTO' as RenderMode,
  initialYaw: 0,
  initialPitch: 0,
  initialHfov: 90,
  sortOrder: 1,
  enabled: true,
})

const hotspotDialogVisible = ref(false)
const hotspotSaving = ref(false)
const hotspotFormRef = ref<FormInstance>()
const hotspotForm = reactive<HotspotForm>({
  label: '',
  targetType: 'SCENE',
  targetSceneId: '',
  targetImageId: '',
  xRatio: 0,
  yRatio: 0,
})

const fileInputRef = ref<HTMLInputElement>()
const previewImageRef = ref<HTMLImageElement>()
const dragHotspotId = ref<string | null>(null)
const targetImageOptions = ref<ImmersiveImage[]>([])
const imageNameDialogVisible = ref(false)
const imageNameSaving = ref(false)
const editingImage = ref<ImmersiveImage | null>(null)
const imageNameInput = ref('')

const sceneTypeOptions: Array<{ label: string; value: SceneType }> = [
  { value: 'ENTRANCE', label: '入户' },
  { value: 'LIVING_ROOM', label: '客厅' },
  { value: 'MASTER_BEDROOM', label: '主卧' },
  { value: 'SECOND_BEDROOM', label: '次卧' },
  { value: 'BEDROOM', label: '卧室' },
  { value: 'KITCHEN', label: '厨房' },
  { value: 'BATHROOM', label: '卫生间' },
  { value: 'BALCONY', label: '阳台' },
  { value: 'DINING_ROOM', label: '餐厅' },
  { value: 'STUDY', label: '书房' },
  { value: 'CORRIDOR', label: '过道' },
  { value: 'OTHER', label: '其他' },
]

const sceneTypeLabelMap = Object.fromEntries(sceneTypeOptions.map((item) => [item.value, item.label]))
const renderModeLabels: Record<RenderMode, string> = {
  PHOTO: '普通图片',
  PANORAMA: '全景图',
}
const projectionTypeLabels: Record<ProjectionType, string> = {
  FLAT: '平面图片',
  EQUIRECTANGULAR: '等距柱状全景图',
}
const tourStatusLabels: Record<TourStatus, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  OFFLINE: '已下线',
}

const sceneRules: FormRules = {
  name: [{ required: true, message: '请输入场景名称', trigger: 'blur' }],
  sceneType: [{ required: true, message: '请选择场景类型', trigger: 'change' }],
}

const hotspotRules: FormRules = {
  label: [{ required: true, message: '请输入热点名称', trigger: 'blur' }],
  targetSceneId: [
    {
      validator: (_rule, value, callback) => {
        if (hotspotForm.targetType === 'SCENE' && !value) callback(new Error('请选择目标场景'))
        else callback()
      },
      trigger: 'change',
    },
  ],
  targetImageId: [
    {
      validator: (_rule, value, callback) => {
        if (hotspotForm.targetType === 'IMAGE' && !value) callback(new Error('请选择目标图片'))
        else callback()
      },
      trigger: 'change',
    },
  ],
  xRatio: [{ required: true, type: 'number', min: 0, max: 1, message: '横向位置必须在 0 到 1 之间', trigger: 'blur' }],
  yRatio: [{ required: true, type: 'number', min: 0, max: 1, message: '纵向位置必须在 0 到 1 之间', trigger: 'blur' }],
}

const selectedScene = computed(() => scenes.value.find((item) => item.sceneId === selectedSceneId.value) || null)
const selectedSceneWithImages = computed(() => (selectedScene.value ? { ...selectedScene.value, images: images.value } : null))
const selectedImage = computed(() => images.value.find((item) => item.imageId === selectedImageId.value) || null)
const targetSceneOptions = computed(() => scenes.value.filter((item) => item.sceneId !== selectedSceneId.value))
const canUseTour = computed(() => Boolean(tour.value?.tourId))
const selectedHouseText = computed(() => selectedHouse.value ? `${selectedHouse.value.title}（${selectedHouse.value.id}）` : houseId.value)
const filteredHouseList = computed(() => {
  const keyword = houseKeyword.value.trim().toLowerCase()
  if (!keyword) return houseList.value
  return houseList.value.filter((house) =>
    [house.id, house.title, house.location, house.address, house.roomType]
      .some((value) => value?.toLowerCase().includes(keyword)),
  )
})
const selectedRenderMode = computed<RenderMode>(() => selectedScene.value?.renderMode || 'PHOTO')
const selectedProjectionType = computed<ProjectionType>(() =>
  selectedRenderMode.value === 'PANORAMA' ? 'EQUIRECTANGULAR' : 'FLAT',
)

function imageCount(scene: ImmersiveScene) {
  return scene.images?.length ?? (scene.sceneId === selectedSceneId.value ? images.value.length : 0)
}

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

function fileSizeText(size: number) {
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

function setError(error: unknown) {
  lastError.value = error instanceof Error ? error.message : String(error || '请求失败')
}

function pendingRatioText(item: PendingFile) {
  if (!item.width || !item.height) return '尺寸读取中'
  return `${item.width} x ${item.height}，比例 ${(item.width / item.height).toFixed(2)}:1`
}

function isMaybePanorama(item: PendingFile) {
  if (!item.width || !item.height) return true
  const ratio = item.width / item.height
  return ratio >= 1.8 && ratio <= 2.2
}

function renderModeText(mode?: RenderMode | null) {
  return renderModeLabels[mode || 'PHOTO']
}

function projectionTypeText(type?: ProjectionType | null) {
  return projectionTypeLabels[type || 'FLAT']
}

function imageNameText(image?: Pick<ImmersiveImage, 'name' | 'imageId'> | null) {
  return image?.name?.trim() || '未命名图片'
}

function tourStatusText(status?: TourStatus | null) {
  return status ? tourStatusLabels[status] || status : '-'
}

function isValidRatio(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 1
}

async function fetchHouseOptions() {
  houseLoading.value = true
  try {
    houseList.value = await getHouseList()
    if (houseId.value && !selectedHouse.value) {
      selectedHouse.value = houseList.value.find((house) => house.id === houseId.value) || null
    }
  } catch (error) {
    setError(error)
  } finally {
    houseLoading.value = false
  }
}

async function openHouseDialog() {
  houseDialogVisible.value = true
  if (!houseList.value.length) await fetchHouseOptions()
}

async function selectHouse(house: HouseItem) {
  selectedHouse.value = house
  houseId.value = house.id
  houseDialogVisible.value = false
  await queryTour()
}

function openPreviewPage() {
  const targetHouseId = houseId.value.trim()
  if (!targetHouseId) {
    ElMessage.warning('请先选择房源')
    return
  }
  const previewUrl = router.resolve(`/immersive-tour/preview/${targetHouseId}`).href
  window.open(previewUrl, '_blank', 'noopener,noreferrer')
}

function clearPendingFiles() {
  pendingFiles.value.forEach((item) => URL.revokeObjectURL(item.previewUrl))
  pendingFiles.value = []
  if (fileInputRef.value) fileInputRef.value.value = ''
}

async function queryTour() {
  if (!houseId.value.trim()) {
    ElMessage.warning('请先选择房源')
    return
  }
  loading.value = true
  lastError.value = ''
  availability.value = null
  try {
    const result = await getTourByHouseId(houseId.value.trim())
    tour.value = result
    await fetchScenes()
    if (route.params.houseId !== houseId.value.trim()) {
      await router.replace(`/immersive-tour/house/${houseId.value.trim()}`)
    }
  } catch (error) {
    tour.value = null
    scenes.value = []
    images.value = []
    hotspots.value = []
    selectedSceneId.value = ''
    selectedImageId.value = ''
    setError(error)
  } finally {
    loading.value = false
  }
}

async function handleCreateTour() {
  if (!houseId.value.trim()) {
    ElMessage.warning('请先选择房源')
    return
  }
  creatingTour.value = true
  lastError.value = ''
  try {
    tour.value = await createTour(houseId.value.trim(), {
      title: `${selectedHouse.value?.title || houseId.value.trim()} 沉浸式看房`,
    })
    ElMessage.success('项目已创建')
    await fetchScenes()
  } catch (error) {
    setError(error)
  } finally {
    creatingTour.value = false
  }
}

async function fetchScenes() {
  if (!tour.value?.tourId) return
  sceneLoading.value = true
  try {
    scenes.value = await getScenes(tour.value.tourId)
    if (!selectedSceneId.value || !scenes.value.some((item) => item.sceneId === selectedSceneId.value)) {
      selectedSceneId.value = scenes.value[0]?.sceneId || ''
    }
    if (selectedSceneId.value) {
      await selectScene(selectedSceneId.value)
    } else {
      images.value = []
      hotspots.value = []
      selectedImageId.value = ''
      clearPendingFiles()
    }
  } catch (error) {
    setError(error)
  } finally {
    sceneLoading.value = false
  }
}

async function selectScene(sceneId: string) {
  if (!sceneId) return
  selectedSceneId.value = sceneId
  selectedImageId.value = ''
  hotspots.value = []
  clearPendingFiles()
  await fetchImages(sceneId)
}

async function fetchImages(sceneId = selectedSceneId.value) {
  if (!sceneId) return
  imageLoading.value = true
  try {
    images.value = await getSceneImages(sceneId)
    const scene = scenes.value.find((item) => item.sceneId === sceneId)
    if (scene) scene.images = images.value
    selectedImageId.value = images.value[0]?.imageId || ''
    if (selectedImageId.value) await fetchHotspots(selectedImageId.value)
  } catch (error) {
    setError(error)
  } finally {
    imageLoading.value = false
  }
}

async function selectImage(imageId: string) {
  selectedImageId.value = imageId
  await fetchHotspots(imageId)
}

function loadTargetImages(selectedTargetImageId = '') {
  targetImageOptions.value = images.value
  if (selectedTargetImageId) {
    hotspotForm.targetImageId = selectedTargetImageId
  } else if (!targetImageOptions.value.some((item) => item.imageId === hotspotForm.targetImageId)) {
    hotspotForm.targetImageId = targetImageOptions.value.find((item) => item.imageId !== selectedImageId.value)?.imageId || ''
  }
}

function resolveHotspotTargetType(hotspot: Pick<ImmersiveHotspot, 'targetType' | 'targetImageId'>): HotspotTargetType {
  return hotspot.targetType || (hotspot.targetImageId ? 'IMAGE' : 'SCENE')
}

function targetSceneLabel(scene: ImmersiveScene) {
  return `${scene.name} (${sceneTypeLabelMap[scene.sceneType] || scene.sceneType})`
}

function targetImageLabel(image: ImmersiveImage) {
  const entryText = image.entry ? '入口图片' : '普通图片'
  return `${imageNameText(image)} · ${entryText}`
}

async function fetchHotspots(imageId = selectedImageId.value) {
  if (!imageId) {
    hotspots.value = []
    return
  }
  hotspotLoading.value = true
  try {
    hotspots.value = await getHotspots(imageId)
  } catch (error) {
    setError(error)
  } finally {
    hotspotLoading.value = false
  }
}

function openSceneDialog(scene?: ImmersiveScene) {
  if (scene) {
    editingSceneId.value = scene.sceneId
    sceneForm.name = scene.name
    sceneForm.sceneType = scene.sceneType
    sceneForm.renderMode = scene.renderMode || 'PHOTO'
    sceneForm.initialYaw = scene.initialYaw ?? 0
    sceneForm.initialPitch = scene.initialPitch ?? 0
    sceneForm.initialHfov = scene.initialHfov ?? 90
    sceneForm.sortOrder = scene.sortOrder ?? 1
    sceneForm.enabled = scene.enabled !== 0
  } else {
    editingSceneId.value = null
    sceneForm.name = ''
    sceneForm.sceneType = 'LIVING_ROOM'
    sceneForm.renderMode = 'PHOTO'
    sceneForm.initialYaw = 0
    sceneForm.initialPitch = 0
    sceneForm.initialHfov = 90
    sceneForm.sortOrder = scenes.value.length + 1
    sceneForm.enabled = true
  }
  sceneDialogVisible.value = true
}

async function saveScene() {
  const valid = await sceneFormRef.value?.validate().catch(() => false)
  if (!valid || !tour.value?.tourId) return
  sceneSaving.value = true
  try {
    if (editingSceneId.value) {
      await updateScene(editingSceneId.value, {
        name: sceneForm.name,
        sceneType: sceneForm.sceneType,
        renderMode: sceneForm.renderMode,
        initialYaw: sceneForm.renderMode === 'PANORAMA' ? sceneForm.initialYaw : null,
        initialPitch: sceneForm.renderMode === 'PANORAMA' ? sceneForm.initialPitch : null,
        initialHfov: sceneForm.renderMode === 'PANORAMA' ? sceneForm.initialHfov : null,
        enabled: sceneForm.enabled ? 1 : 0,
      })
      ElMessage.success('场景已更新')
    } else {
      await createScene(tour.value.tourId, {
        name: sceneForm.name,
        sceneType: sceneForm.sceneType,
        renderMode: sceneForm.renderMode,
        initialYaw: sceneForm.renderMode === 'PANORAMA' ? sceneForm.initialYaw : null,
        initialPitch: sceneForm.renderMode === 'PANORAMA' ? sceneForm.initialPitch : null,
        initialHfov: sceneForm.renderMode === 'PANORAMA' ? sceneForm.initialHfov : null,
        sortOrder: sceneForm.sortOrder,
      })
      ElMessage.success('场景已创建')
    }
    sceneDialogVisible.value = false
    await fetchScenes()
  } catch (error) {
    setError(error)
  } finally {
    sceneSaving.value = false
  }
}

async function handleDeleteScene(scene: ImmersiveScene) {
  try {
    await ElMessageBox.confirm(`确定删除场景「${scene.name}」吗？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await deleteScene(scene.sceneId)
    ElMessage.success('场景已删除')
    await fetchScenes()
  } catch (error) {
    setError(error)
  }
}

async function handleSetEntryScene(scene: ImmersiveScene) {
  if (!tour.value?.tourId) return
  try {
    await setEntryScene(tour.value.tourId, { sceneId: scene.sceneId })
    ElMessage.success('入口场景已设置')
    await queryTour()
  } catch (error) {
    setError(error)
  }
}

function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  addPendingFiles(Array.from(input.files || []))
}

function handleDrop(event: DragEvent) {
  addPendingFiles(Array.from(event.dataTransfer?.files || []))
}

function addPendingFiles(files: File[]) {
  const validFiles = files.filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
  if (validFiles.length !== files.length) ElMessage.warning('已过滤非 JPG/PNG/WebP 图片')
  const filesToAdd = selectedRenderMode.value === 'PANORAMA' ? validFiles.slice(0, 1) : validFiles
  if (selectedRenderMode.value === 'PANORAMA' && validFiles.length > 1) {
    ElMessage.warning('全景图模式第一版一次只允许上传一张图片')
  }
  const items = filesToAdd.map((file) => ({
      uid: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }))
  pendingFiles.value.push(...items)
  items.forEach(loadPendingImageMeta)
}

function loadPendingImageMeta(item: PendingFile) {
  const image = new Image()
  image.onload = () => {
    item.width = image.naturalWidth
    item.height = image.naturalHeight
  }
  image.src = item.previewUrl
}

function removePendingFile(uid: string) {
  const file = pendingFiles.value.find((item) => item.uid === uid)
  if (file) URL.revokeObjectURL(file.previewUrl)
  pendingFiles.value = pendingFiles.value.filter((item) => item.uid !== uid)
}

async function startUpload() {
  if (!selectedSceneId.value) {
    ElMessage.warning('请先选择场景')
    return
  }
  if (!pendingFiles.value.length) {
    ElMessage.warning('请先选择图片')
    return
  }
  if (selectedRenderMode.value === 'PANORAMA' && pendingFiles.value.length > 1) {
    ElMessage.warning('全景图模式第一版一次只允许上传一张图片')
    return
  }
  uploading.value = true
  uploadProgress.value = 0
  uploadSuccessCount.value = 0
  uploadFailCount.value = 0
  uploadError.value = ''
  try {
    const result = await uploadSceneImages(
      selectedSceneId.value,
      pendingFiles.value.map((item) => item.file),
      selectedProjectionType.value,
      (progress) => {
        uploadProgress.value = progress
      },
    )
    uploadSuccessCount.value = result.length
    clearPendingFiles()
    await fetchImages()
    ElMessage.success('图片上传完成')
  } catch (error) {
    uploadFailCount.value = pendingFiles.value.length
    uploadError.value = error instanceof Error ? error.message : String(error || '上传失败')
  } finally {
    uploading.value = false
  }
}

async function handleSetEntryImage(image: ImmersiveImage) {
  if (!selectedSceneId.value) return
  if (selectedRenderMode.value === 'PANORAMA' && image.projectionType !== 'EQUIRECTANGULAR') {
    ElMessage.warning('全景图场景入口图片必须是等距柱状全景图')
    return
  }
  try {
    await setEntryImage(selectedSceneId.value, { imageId: image.imageId })
    ElMessage.success('入口图片已设置')
    await fetchScenes()
  } catch (error) {
    setError(error)
  }
}

function openRenameImageDialog(image: ImmersiveImage) {
  editingImage.value = image
  imageNameInput.value = image.name || ''
  imageNameDialogVisible.value = true
}

async function saveImageName() {
  if (!editingImage.value) return
  imageNameSaving.value = true
  try {
    await updateSceneImage(editingImage.value.imageId, { name: imageNameInput.value.trim() || null })
    ElMessage.success('图片名称已更新')
    imageNameDialogVisible.value = false
    await fetchImages()
  } catch (error) {
    setError(error)
  } finally {
    imageNameSaving.value = false
  }
}

async function handleDeleteImage(image: ImmersiveImage) {
  try {
    await ElMessageBox.confirm(`确定删除图片「${imageNameText(image)}」吗？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await deleteSceneImage(image.imageId)
    ElMessage.success('图片已删除')
    await fetchImages()
  } catch (error) {
    setError(error)
  }
}

function getImageContentRect(event: MouseEvent | PointerEvent) {
  const img = previewImageRef.value
  if (!img || !img.naturalWidth || !img.naturalHeight) return null
  const rect = img.getBoundingClientRect()
  const naturalRatio = img.naturalWidth / img.naturalHeight
  const boxRatio = rect.width / rect.height
  let width = rect.width
  let height = rect.height
  let left = rect.left
  let top = rect.top
  if (boxRatio > naturalRatio) {
    width = rect.height * naturalRatio
    left = rect.left + (rect.width - width) / 2
  } else {
    height = rect.width / naturalRatio
    top = rect.top + (rect.height - height) / 2
  }
  const xRatio = (event.clientX - left) / width
  const yRatio = (event.clientY - top) / height
  if (xRatio < 0 || xRatio > 1 || yRatio < 0 || yRatio > 1) return null
  return { xRatio: Number(xRatio.toFixed(6)), yRatio: Number(yRatio.toFixed(6)) }
}

function openHotspotDialog(draft: HotspotForm) {
  hotspotForm.hotspotId = draft.hotspotId
  hotspotForm.label = draft.label
  hotspotForm.targetType = draft.targetType
  hotspotForm.targetSceneId = draft.targetSceneId
  hotspotForm.targetImageId = draft.targetImageId
  hotspotForm.xRatio = Number(draft.xRatio.toFixed(6))
  hotspotForm.yRatio = Number(draft.yRatio.toFixed(6))
  if (draft.targetType === 'IMAGE') {
    hotspotForm.targetSceneId = selectedSceneId.value
    loadTargetImages(draft.targetImageId)
  }
  hotspotDialogVisible.value = true
}

function handleImageClick(event: MouseEvent) {
  if (!selectedImage.value || dragHotspotId.value) return
  const ratio = getImageContentRect(event)
  if (!ratio) return
  hotspotForm.hotspotId = undefined
  hotspotForm.label = ''
  hotspotForm.targetType = 'SCENE'
  hotspotForm.targetSceneId = targetSceneOptions.value[0]?.sceneId || ''
  hotspotForm.targetImageId = ''
  hotspotForm.xRatio = Number(ratio.xRatio.toFixed(6))
  hotspotForm.yRatio = Number(ratio.yRatio.toFixed(6))
  hotspotDialogVisible.value = true
}

function editHotspot(hotspot: ImmersiveHotspot) {
  openHotspotDialog({
    hotspotId: hotspot.hotspotId,
    label: hotspot.label,
    targetType: resolveHotspotTargetType(hotspot),
    targetSceneId: hotspot.targetSceneId || '',
    targetImageId: hotspot.targetImageId || '',
    xRatio: Number(hotspot.xRatio),
    yRatio: Number(hotspot.yRatio),
  })
}

function handleHotspotTargetTypeChange(type: HotspotTargetType) {
  hotspotForm.targetType = type
  hotspotForm.targetImageId = ''
  if (type === 'SCENE') {
    hotspotForm.targetSceneId = targetSceneOptions.value[0]?.sceneId || ''
    return
  }
  hotspotForm.targetSceneId = selectedSceneId.value
  loadTargetImages()
}

async function saveHotspot() {
  const valid = await hotspotFormRef.value?.validate().catch(() => false)
  if (!valid || !selectedImageId.value) return
  if (!isValidRatio(hotspotForm.xRatio) || !isValidRatio(hotspotForm.yRatio)) {
    ElMessage.warning('横向位置和纵向位置必须在 0 到 1 之间')
    return
  }
  const payload: HotspotPayload = {
    label: hotspotForm.label,
    targetType: hotspotForm.targetType,
    xRatio: hotspotForm.xRatio,
    yRatio: hotspotForm.yRatio,
  }
  if (hotspotForm.targetType === 'IMAGE') {
    payload.targetImageId = hotspotForm.targetImageId
  } else {
    payload.targetSceneId = hotspotForm.targetSceneId
  }
  hotspotSaving.value = true
  try {
    if (hotspotForm.hotspotId) {
      await updateHotspot(hotspotForm.hotspotId, payload)
      ElMessage.success('热点已更新')
    } else {
      await createHotspot(selectedImageId.value, payload)
      ElMessage.success('热点已创建')
    }
    hotspotDialogVisible.value = false
    await fetchHotspots()
  } catch (error) {
    setError(error)
  } finally {
    hotspotSaving.value = false
  }
}

async function createPanoramaHotspot(payload: HotspotPayload) {
  if (!selectedImageId.value) return
  try {
    await createHotspot(selectedImageId.value, payload)
    ElMessage.success('全景热点已创建')
    await fetchHotspots()
  } catch (error) {
    setError(error)
  }
}

async function updatePanoramaHotspot(hotspotId: string, payload: HotspotPayload) {
  try {
    await updateHotspot(hotspotId, payload)
    ElMessage.success('全景热点已更新')
    await fetchHotspots()
  } catch (error) {
    setError(error)
  }
}

async function deletePanoramaHotspot(hotspotId: string) {
  try {
    await deleteHotspot(hotspotId)
    ElMessage.success('全景热点已删除')
    await fetchHotspots()
  } catch (error) {
    setError(error)
  }
}

async function savePanoramaInitialView(payload: { initialYaw: number; initialPitch: number; initialHfov: number }) {
  if (!selectedSceneId.value || !selectedScene.value) return
  try {
    await updateScene(selectedSceneId.value, {
      name: selectedScene.value.name,
      sceneType: selectedScene.value.sceneType,
      renderMode: selectedScene.value.renderMode || 'PANORAMA',
      enabled: selectedScene.value.enabled ?? 1,
      ...payload,
    })
    ElMessage.success('初始视角保存成功')
    await fetchScenes()
  } catch (error) {
    setError(error)
  }
}

async function handleDeleteHotspot(hotspot: ImmersiveHotspot) {
  try {
    await ElMessageBox.confirm(`确定删除热点「${hotspot.label}」吗？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await deleteHotspot(hotspot.hotspotId)
    ElMessage.success('热点已删除')
    await fetchHotspots()
  } catch (error) {
    setError(error)
  }
}

function startDragHotspot(hotspot: ImmersiveHotspot, event: PointerEvent) {
  event.preventDefault()
  dragHotspotId.value = hotspot.hotspotId
  window.addEventListener('pointermove', handleHotspotDragging)
  window.addEventListener('pointerup', stopDragHotspot, { once: true })
}

function handleHotspotDragging(event: PointerEvent) {
  if (!dragHotspotId.value) return
  const ratio = getImageContentRect(event)
  if (!ratio) return
  const index = hotspots.value.findIndex((item) => item.hotspotId === dragHotspotId.value)
  if (index >= 0) {
    hotspots.value[index] = { ...hotspots.value[index], ...ratio }
  }
}

async function stopDragHotspot() {
  window.removeEventListener('pointermove', handleHotspotDragging)
  const hotspot = hotspots.value.find((item) => item.hotspotId === dragHotspotId.value)
  dragHotspotId.value = null
  if (!hotspot) return
  if (!isValidRatio(Number(hotspot.xRatio)) || !isValidRatio(Number(hotspot.yRatio))) {
    await fetchHotspots()
    return
  }
  try {
    await updateHotspot(hotspot.hotspotId, {
      label: hotspot.label,
      targetType: resolveHotspotTargetType(hotspot),
      targetSceneId: hotspot.targetSceneId || undefined,
      targetImageId: hotspot.targetImageId || undefined,
      xRatio: Number(Number(hotspot.xRatio).toFixed(6)),
      yRatio: Number(Number(hotspot.yRatio).toFixed(6)),
    })
  } catch (error) {
    setError(error)
    await fetchHotspots()
  }
}

async function jumpToTargetScene(hotspot: ImmersiveHotspot) {
  if (resolveHotspotTargetType(hotspot) === 'IMAGE' && hotspot.targetImageId) {
    await jumpToTarget(hotspot.targetSceneId || selectedSceneId.value, hotspot.targetImageId)
    return
  }
  await jumpToTarget(hotspot.targetSceneId || '')
}

async function jumpToTarget(sceneId: string, imageId?: string) {
  let target = scenes.value.find((item) => item.sceneId === sceneId)
  if (imageId && (!target || !target.images?.some((image) => image.imageId === imageId))) {
    for (const scene of scenes.value) {
      const sceneImages = scene.sceneId === selectedSceneId.value ? images.value : await getSceneImages(scene.sceneId)
      scene.images = sceneImages
      if (sceneImages.some((image) => image.imageId === imageId)) {
        target = scene
        break
      }
    }
  }
  if (!target) {
    ElMessage.warning('目标场景不存在')
    return
  }
  await selectScene(target.sceneId)
  await nextTick()
  const entryImageId = imageId || target.entryImageId || images.value[0]?.imageId
  if (entryImageId) await selectImage(entryImageId)
}

async function handlePublish() {
  if (!tour.value?.tourId) return
  publishing.value = true
  try {
    tour.value = await publishTour(tour.value.tourId)
    availability.value = await getTourAvailability(houseId.value.trim())
    ElMessage.success(`发布成功，当前${availability.value.available ? '可预览' : '不可预览'}`)
  } catch (error) {
    setError(error)
  } finally {
    publishing.value = false
  }
}

async function handleOffline() {
  if (!tour.value?.tourId) return
  offlining.value = true
  try {
    tour.value = await offlineTour(tour.value.tourId)
    availability.value = await getTourAvailability(houseId.value.trim())
    ElMessage.success('项目已下线')
  } catch (error) {
    setError(error)
  } finally {
    offlining.value = false
  }
}

watch(
  () => route.params.houseId,
  (value) => {
    if (value && value !== houseId.value) {
      houseId.value = String(value)
      selectedHouse.value = houseList.value.find((house) => house.id === houseId.value) || null
      void queryTour()
    }
  },
)

onMounted(async () => {
  await fetchHouseOptions()
  if (houseId.value) await queryTour()
})
onBeforeUnmount(() => {
  clearPendingFiles()
  window.removeEventListener('pointermove', handleHotspotDragging)
})
</script>

<template>
  <div class="page-container immersive-page">
    <PageHeader title="沉浸式看房管理" description="普通图片和全景图双模式联调页面，接口直连 immersive-tour-service。">
      <template #actions>
        <el-button :icon="View" :disabled="!houseId.trim()" @click="openPreviewPage">预览效果</el-button>
        <el-button :icon="Refresh" :loading="loading" @click="queryTour">刷新</el-button>
      </template>
    </PageHeader>
    <DataSourceNotice type="real" detail="当前页面通过 /immersive-api 代理访问 http://localhost:8001，不使用模拟数据。" />

    <el-card class="surface-card" shadow="never">
      <div class="tour-toolbar">
        <el-form label-width="82px" class="tour-form">
          <el-form-item label="房源">
            <div class="house-picker-field">
              <el-input :model-value="selectedHouseText" readonly placeholder="请选择房源" />
              <el-button type="primary" plain @click="openHouseDialog">选择房源</el-button>
            </div>
          </el-form-item>
          <el-form-item label="项目标题">
            <el-input :model-value="tour?.title || ''" disabled placeholder="未查询到项目" />
          </el-form-item>
          <el-form-item label="项目 ID">
            <el-input :model-value="tour?.tourId || ''" disabled placeholder="-" />
          </el-form-item>
          <el-form-item label="状态">
            <el-tag v-if="tour" :type="tour.status === 'PUBLISHED' ? 'success' : tour.status === 'OFFLINE' ? 'info' : 'warning'">
              {{ tourStatusText(tour.status) }}
            </el-tag>
            <span v-else class="muted-text">-</span>
          </el-form-item>
        </el-form>
        <div class="tour-actions">
          <el-button :icon="Refresh" :loading="loading" @click="queryTour">查询项目</el-button>
          <el-button type="primary" :icon="Plus" :disabled="Boolean(tour)" :loading="creatingTour" @click="handleCreateTour">创建项目</el-button>
          <el-button type="success" :icon="Finished" :disabled="!canUseTour" :loading="publishing" @click="handlePublish">发布</el-button>
          <el-button :icon="Warning" :disabled="!canUseTour" :loading="offlining" @click="handleOffline">下线</el-button>
        </div>
      </div>
      <el-alert v-if="lastError" class="error-alert" type="error" :title="lastError" show-icon :closable="false" />
      <el-empty v-if="!tour && !loading" description="未查询到沉浸式项目，可点击创建项目。" :image-size="88" />
    </el-card>

    <div v-if="canUseTour" class="workspace-grid">
      <section class="panel scene-panel">
        <div class="panel__header">
          <strong>场景列表</strong>
          <el-button size="small" type="primary" :icon="Plus" :disabled="!canUseTour" @click="openSceneDialog()">新建场景</el-button>
        </div>
        <div v-loading="sceneLoading" class="scene-list">
          <button
            v-for="scene in scenes"
            :key="scene.sceneId"
            class="scene-item"
            :class="{ 'scene-item--active': scene.sceneId === selectedSceneId }"
            type="button"
            @click="selectScene(scene.sceneId)"
          >
            <span class="scene-item__title">{{ scene.name }}</span>
            <span class="scene-item__meta">{{ sceneTypeLabelMap[scene.sceneType] || scene.sceneType }} · 排序 {{ scene.sortOrder ?? '-' }}</span>
            <span class="scene-item__badges">
              <el-tag size="small" :type="(scene.renderMode || 'PHOTO') === 'PANORAMA' ? 'danger' : 'info'">{{ renderModeText(scene.renderMode) }}</el-tag>
              <el-tag size="small" :type="scene.enabled === 0 ? 'info' : 'success'">{{ scene.enabled === 0 ? '停用' : '启用' }}</el-tag>
              <el-tag v-if="scene.sceneId === tour?.entrySceneId" size="small" type="warning">入口场景</el-tag>
              <el-tag size="small">{{ imageCount(scene) }} 张图</el-tag>
            </span>
          </button>
          <el-empty v-if="!scenes.length" description="暂无场景" :image-size="72" />
        </div>
        <div v-if="selectedScene" class="scene-actions">
          <el-button size="small" :icon="Edit" @click="openSceneDialog(selectedScene)">编辑</el-button>
          <el-button size="small" :icon="Check" :disabled="selectedScene.sceneId === tour?.entrySceneId" @click="handleSetEntryScene(selectedScene)">设为入口</el-button>
          <el-button size="small" type="danger" :icon="Delete" @click="handleDeleteScene(selectedScene)">删除</el-button>
        </div>
      </section>

      <section class="panel image-panel">
        <div class="panel__header">
          <strong>图片管理</strong>
          <span class="muted-text">{{ selectedScene?.name || '未选择场景' }}</span>
        </div>
        <div class="upload-box" :class="{ 'upload-box--disabled': !selectedSceneId }" @dragover.prevent @drop.prevent="handleDrop">
          <el-icon><UploadFilled /></el-icon>
          <strong>点击选择图片，或拖拽到此处上传</strong>
          <span v-if="selectedRenderMode === 'PHOTO'">普通图片模式：支持 JPG、PNG、WebP，可一次选择多张</span>
          <span v-else>全景图模式：一次上传一张等距柱状全景图</span>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            :disabled="!selectedSceneId || uploading"
            @change="handleFileInput"
          >
        </div>
        <div v-if="pendingFiles.length" class="pending-list">
          <div v-for="item in pendingFiles" :key="item.uid" class="pending-item">
            <img :src="item.previewUrl" alt="">
            <div>
              <strong>{{ item.file.name }}</strong>
              <span>{{ fileSizeText(item.file.size) }}</span>
              <span>{{ pendingRatioText(item) }}</span>
              <el-tag v-if="selectedRenderMode === 'PANORAMA' && !isMaybePanorama(item)" size="small" type="warning">
                该图片可能不是标准等距柱状全景图
              </el-tag>
            </div>
            <el-button text type="danger" :icon="Delete" :disabled="uploading" @click="removePendingFile(item.uid)" />
          </div>
        </div>
        <div class="upload-status">
          <el-button type="primary" :icon="UploadFilled" :loading="uploading" :disabled="!selectedSceneId || !pendingFiles.length" @click="startUpload">
            开始上传
          </el-button>
          <el-progress v-if="uploading || uploadProgress > 0" class="upload-progress" :percentage="uploadProgress" />
          <span class="muted-text">成功 {{ uploadSuccessCount }}，失败 {{ uploadFailCount }}</span>
        </div>
        <el-alert v-if="uploadError" type="error" :title="uploadError" show-icon :closable="false" />

        <div v-loading="imageLoading" class="image-grid">
          <article v-for="image in images" :key="image.imageId" class="image-card" :class="{ 'image-card--active': image.imageId === selectedImageId }">
            <button type="button" class="image-thumb" @click="selectImage(image.imageId)">
              <img :src="normalizeAssetUrl(image.thumbnailUrl || image.imageUrl)" alt="">
            </button>
            <div class="image-card__body">
              <strong>{{ imageNameText(image) }}</strong>
              <span class="image-id">ID：{{ image.imageId }}</span>
              <span>排序：{{ image.sortOrder ?? '-' }}</span>
              <span>入口图片: {{ image.entry ? '是' : '否' }}</span>
              <span>图片类型：{{ projectionTypeText(image.projectionType) }}</span>
              <span>尺寸: {{ image.imageWidth || image.width || '-' }} x {{ image.imageHeight || image.height || '-' }}</span>
              <span class="image-url">{{ image.imageUrl }}</span>
            </div>
            <div class="image-card__actions">
              <el-button link type="primary" :disabled="image.entry" @click="handleSetEntryImage(image)">设为入口图片</el-button>
              <el-button link type="primary" @click="openRenameImageDialog(image)">重命名</el-button>
              <el-button link type="primary" @click="selectImage(image.imageId)">编辑热点</el-button>
              <el-button link type="danger" @click="handleDeleteImage(image)">删除</el-button>
            </div>
          </article>
          <el-empty v-if="selectedSceneId && !images.length" description="暂无图片" :image-size="72" />
        </div>
      </section>

      <section class="panel hotspot-panel">
        <div class="panel__header">
          <strong>热点编辑 · {{ renderModeText(selectedRenderMode) }}</strong>
          <el-button size="small" :icon="Refresh" :disabled="!selectedImageId" :loading="hotspotLoading" @click="fetchHotspots()">刷新热点</el-button>
        </div>
        <template v-if="selectedRenderMode === 'PHOTO'">
          <div v-if="selectedImage" v-loading="hotspotLoading" class="hotspot-stage">
            <img
              ref="previewImageRef"
              class="hotspot-image"
              :src="normalizeAssetUrl(selectedImage.imageUrl)"
              alt=""
              @click="handleImageClick"
            >
            <button
              v-for="hotspot in hotspots.filter((item) => item.xRatio != null && item.yRatio != null)"
              :key="hotspot.hotspotId"
              class="hotspot-dot"
              :style="{ left: `${Number(hotspot.xRatio) * 100}%`, top: `${Number(hotspot.yRatio) * 100}%` }"
              type="button"
              @click.stop="editHotspot(hotspot)"
              @pointerdown.stop="startDragHotspot(hotspot, $event)"
            >
              <span>{{ hotspot.label }}</span>
            </button>
          </div>
          <el-empty v-else description="请选择一张图片编辑热点" :image-size="88" />
          <div class="hotspot-list">
            <div v-for="hotspot in hotspots" :key="hotspot.hotspotId" class="hotspot-row">
              <div>
                <strong>{{ hotspot.label }}</strong>
                <span>横向 {{ hotspot.xRatio == null ? '-' : Number(hotspot.xRatio).toFixed(3) }}，纵向 {{ hotspot.yRatio == null ? '-' : Number(hotspot.yRatio).toFixed(3) }}</span>
              </div>
              <el-button link type="primary" :icon="VideoPlay" @click="jumpToTargetScene(hotspot)">跳转</el-button>
              <el-button link type="danger" :icon="Delete" @click="handleDeleteHotspot(hotspot)">删除</el-button>
            </div>
          </div>
        </template>
        <PanoramaHotspotEditor
          v-else
          v-loading="hotspotLoading"
          :scene="selectedSceneWithImages"
          :image="selectedImage"
          :image-url="normalizeAssetUrl(selectedImage?.imageUrl)"
          :hotspots="hotspots"
          :scenes="scenes"
          @create-hotspot="createPanoramaHotspot"
          @update-hotspot="updatePanoramaHotspot"
          @delete-hotspot="deletePanoramaHotspot"
          @save-initial-view="savePanoramaInitialView"
          @jump-scene="jumpToTarget"
        />
      </section>
    </div>

    <el-dialog v-model="houseDialogVisible" title="选择房源" width="min(900px, 92vw)">
      <div class="house-dialog-toolbar">
        <el-input
          v-model="houseKeyword"
          clearable
          placeholder="搜索房源标题、区域、地址、户型或 ID"
          :prefix-icon="Search"
        />
        <el-button :icon="Refresh" :loading="houseLoading" @click="fetchHouseOptions">刷新</el-button>
      </div>
      <el-table
        v-loading="houseLoading"
        :data="filteredHouseList"
        border
        empty-text="暂无房源数据"
        max-height="520"
        highlight-current-row
        @row-dblclick="selectHouse"
      >
        <el-table-column label="房源" min-width="240">
          <template #default="{ row }">
            <div class="house-option-cell">
              <strong>{{ row.title }}</strong>
              <span>{{ row.location || '-' }} · {{ row.roomType || '户型未填' }}</span>
              <small>ID {{ row.id }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="地址" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ row.address || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">{{ row.status || '-' }}</template>
        </el-table-column>
        <el-table-column label="月租" width="120">
          <template #default="{ row }">{{ row.price == null ? '-' : `￥${Math.round(row.price / 100)}` }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="selectHouse(row)">选择</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="sceneDialogVisible" :title="editingSceneId ? '编辑场景' : '新建场景'" width="520px" destroy-on-close>
      <el-form ref="sceneFormRef" :model="sceneForm" :rules="sceneRules" label-width="96px">
        <el-form-item label="场景名称" prop="name">
          <el-input v-model="sceneForm.name" maxlength="100" />
        </el-form-item>
        <el-form-item label="场景类型" prop="sceneType">
          <el-select v-model="sceneForm.sceneType" style="width: 100%">
            <el-option v-for="item in sceneTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="展示模式">
          <el-radio-group v-model="sceneForm.renderMode">
            <el-radio-button label="PHOTO">普通图片</el-radio-button>
            <el-radio-button label="PANORAMA">360° 全景</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <template v-if="sceneForm.renderMode === 'PANORAMA'">
          <el-form-item label="初始水平视角">
            <el-input-number v-model="sceneForm.initialYaw" :min="-180" :max="180" :step="0.1" controls-position="right" />
          </el-form-item>
          <el-form-item label="初始垂直视角">
            <el-input-number v-model="sceneForm.initialPitch" :min="-90" :max="90" :step="0.1" controls-position="right" />
          </el-form-item>
          <el-form-item label="初始视野范围">
            <el-input-number v-model="sceneForm.initialHfov" :min="30" :max="120" :step="1" controls-position="right" />
          </el-form-item>
        </template>
        <el-form-item label="排序">
          <el-input-number v-model="sceneForm.sortOrder" :min="0" :max="9999" controls-position="right" :disabled="Boolean(editingSceneId)" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="sceneForm.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="sceneDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="sceneSaving" @click="saveScene">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="hotspotDialogVisible" :title="hotspotForm.hotspotId ? '编辑热点' : '新建热点'" width="520px" destroy-on-close>
      <el-form ref="hotspotFormRef" :model="hotspotForm" :rules="hotspotRules" label-width="104px">
        <el-form-item label="热点名称" prop="label">
          <el-input v-model="hotspotForm.label" />
        </el-form-item>
        <el-form-item label="跳转方式">
          <el-radio-group v-model="hotspotForm.targetType" @change="(value) => handleHotspotTargetTypeChange(value as HotspotTargetType)">
            <el-radio-button label="SCENE">跳转场景</el-radio-button>
            <el-radio-button label="IMAGE">跳转图片</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="hotspotForm.targetType === 'SCENE'" label="目标场景" prop="targetSceneId">
          <el-select v-model="hotspotForm.targetSceneId" style="width: 100%">
            <el-option v-for="scene in targetSceneOptions" :key="scene.sceneId" :label="targetSceneLabel(scene)" :value="scene.sceneId" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="hotspotForm.targetType === 'IMAGE'" label="目标图片" prop="targetImageId">
          <el-select v-model="hotspotForm.targetImageId" style="width: 100%" placeholder="请选择目标图片">
            <el-option
              v-for="image in targetImageOptions"
              :key="image.imageId"
              :label="targetImageLabel(image)"
              :value="image.imageId"
              :disabled="image.imageId === selectedImageId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="横向位置" prop="xRatio">
          <el-input-number v-model="hotspotForm.xRatio" :min="0" :max="1" :step="0.000001" :precision="6" controls-position="right" />
        </el-form-item>
        <el-form-item label="纵向位置" prop="yRatio">
          <el-input-number v-model="hotspotForm.yRatio" :min="0" :max="1" :step="0.000001" :precision="6" controls-position="right" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch :model-value="true" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="hotspotDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="hotspotSaving" @click="saveHotspot">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="imageNameDialogVisible" title="重命名图片" width="420px" destroy-on-close>
      <el-form label-width="82px">
        <el-form-item label="图片名称">
          <el-input v-model="imageNameInput" maxlength="100" show-word-limit placeholder="例如：客厅门口" @keyup.enter="saveImageName" />
        </el-form-item>
        <el-form-item label="图片 ID">
          <el-input :model-value="editingImage?.imageId || ''" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="imageNameDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="imageNameSaving" @click="saveImageName">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.immersive-page {
  min-width: 1120px;
}

.tour-toolbar,
.tour-actions,
.upload-status,
.house-dialog-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.tour-toolbar {
  justify-content: space-between;
}

.tour-form {
  display: grid;
  flex: 1;
  grid-template-columns: 220px minmax(240px, 1fr) minmax(260px, 1fr) 160px;
  gap: 12px;
}

.tour-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.house-picker-field,
.house-dialog-toolbar {
  display: flex;
  width: 100%;
  gap: 8px;
  align-items: center;
}

.house-picker-field .el-input,
.house-dialog-toolbar .el-input {
  flex: 1;
}

.house-option-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.house-option-cell strong,
.house-option-cell span,
.house-option-cell small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.house-option-cell span,
.house-option-cell small {
  color: #84918b;
  font-size: 12px;
}

.house-dialog-toolbar {
  margin-bottom: 12px;
}

.error-alert {
  margin-top: 14px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: 300px minmax(440px, 1fr) 420px;
  gap: 16px;
  align-items: start;
}

.panel {
  min-width: 0;
  padding: 16px;
  border: 1px solid #dfe5e2;
  border-radius: 6px;
  background: #fff;
}

.panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.scene-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 260px;
}

.scene-item {
  display: flex;
  flex-direction: column;
  gap: 7px;
  width: 100%;
  padding: 12px;
  text-align: left;
  border: 1px solid #dfe5e2;
  border-radius: 6px;
  background: #fbfcfc;
  cursor: pointer;
}

.scene-item--active {
  border-color: #176b4d;
  background: #edf6f2;
}

.scene-item__title {
  font-weight: 650;
}

.scene-item__meta,
.pending-item span,
.image-card__body span,
.hotspot-row span {
  color: #84918b;
  font-size: 12px;
}

.scene-item__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.scene-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.upload-box {
  position: relative;
  display: grid;
  min-height: 138px;
  place-items: center;
  padding: 18px;
  text-align: center;
  border: 2px dashed #8bb8a6;
  border-radius: 6px;
  background: #f4faf7;
  color: #176b4d;
}

.upload-box--disabled {
  opacity: 0.55;
}

.upload-box .el-icon {
  font-size: 34px;
}

.upload-box input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.pending-list,
.image-grid,
.hotspot-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.pending-item {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) 36px;
  gap: 10px;
  align-items: center;
  padding: 8px;
  border: 1px solid #e3e8e6;
  border-radius: 6px;
}

.pending-item img {
  width: 64px;
  height: 48px;
  object-fit: cover;
  border-radius: 4px;
}

.pending-item strong,
.image-card__body strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-progress {
  width: 180px;
}

.image-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.image-card {
  overflow: hidden;
  border: 1px solid #dfe5e2;
  border-radius: 6px;
  background: #fff;
}

.image-card--active {
  border-color: #176b4d;
}

.image-thumb {
  display: block;
  width: 100%;
  height: 128px;
  padding: 0;
  border: 0;
  background: #eef2f0;
  cursor: pointer;
}

.image-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-card__body {
  display: grid;
  gap: 4px;
  padding: 10px;
}

.image-url {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-id {
  color: #84918b;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.image-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 10px 10px;
}

.hotspot-stage {
  position: relative;
  display: grid;
  height: 360px;
  place-items: center;
  overflow: hidden;
  border: 1px solid #dfe5e2;
  border-radius: 6px;
  background: #111;
}

.hotspot-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  cursor: crosshair;
}

.hotspot-dot {
  position: absolute;
  display: grid;
  width: 18px;
  height: 18px;
  padding: 0;
  place-items: center;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #e05252;
  box-shadow: 0 2px 10px rgb(0 0 0 / 35%);
  cursor: grab;
  transform: translate(-50%, -50%);
}

.hotspot-dot span {
  position: absolute;
  top: 19px;
  left: 50%;
  max-width: 120px;
  padding: 2px 6px;
  overflow: hidden;
  color: white;
  border-radius: 4px;
  background: rgb(0 0 0 / 68%);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
  transform: translateX(-50%);
}

.hotspot-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 52px 52px;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #edf1ef;
}

pre {
  max-height: 360px;
  padding: 12px;
  overflow: auto;
  border-radius: 6px;
  background: #f7f9f8;
  font-size: 12px;
}

@media (max-width: 1280px) {
  .workspace-grid {
    grid-template-columns: 280px minmax(420px, 1fr);
  }

  .hotspot-panel {
    grid-column: 1 / -1;
  }
}
</style>
