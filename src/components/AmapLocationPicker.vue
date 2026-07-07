<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import AMapLoader from '@amap/amap-jsapi-loader'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    initialLng?: number
    initialLat?: number
  }>(),
  {
    initialLng: undefined,
    initialLat: undefined,
  },
)

export interface LocationConfirmPayload {
  lng: number
  lat: number
  address: string
  province: string
  city: string
  district: string
  township: string
  neighborhood: string
}

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', payload: LocationConfirmPayload): void
}>()

const DEFAULT_CENTER: [number, number] = [116.397428, 39.90923]
const AMAP_KEY = import.meta.env.VITE_AMAP_WEB_KEY as string
const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE as string

const mapContainer = ref<HTMLDivElement>()
const selectedAddress = ref('')
const selectedPosition = ref<{ lng: number; lat: number } | null>(null)
const selectedAddressComponent = ref<{ province: string; city: string; district: string; township: string; neighborhood: string } | null>(null)
const loading = ref(false)

// 搜索相关
const searchKeyword = ref('')
const searchTips = ref<Array<{ id: string; name: string; district: string; location: { lng: number; lat: number } }>>([])
const searching = ref(false)
const showTips = ref(false)

let mapInstance: AMap.Map | null = null
let markerInstance: AMap.Marker | null = null
let geocoderInstance: AMap.Geocoder | null = null
let autoCompleteInstance: AMap.AutoComplete | null = null
let placeSearchInstance: AMap.PlaceSearch | null = null

async function initMap() {
  if (!mapContainer.value) return
  loading.value = true

  try {
    if (AMAP_SECURITY_CODE) {
      ;(window as unknown as Record<string, unknown>)._AMapSecurityConfig = {
        securityJsCode: AMAP_SECURITY_CODE,
      }
    }

    const AMap = await AMapLoader.load({
      key: AMAP_KEY,
      version: '2.0',
      plugins: ['AMap.Geocoder', 'AMap.AutoComplete', 'AMap.PlaceSearch'],
    })

    const center: [number, number] =
      props.initialLng != null && props.initialLat != null
        ? [props.initialLng, props.initialLat]
        : DEFAULT_CENTER

    mapInstance = new AMap.Map(mapContainer.value, {
      center,
      zoom: 15,
      resizeEnable: true,
    })

    geocoderInstance = new AMap.Geocoder({})

    // 自动补全实例
    autoCompleteInstance = new AMap.AutoComplete({
      city: '全国',
    })

    // 地点搜索实例
    placeSearchInstance = new AMap.PlaceSearch({
      pageSize: 5,
      extensions: 'all',
    })

    if (props.initialLng != null && props.initialLat != null) {
      markerInstance = new AMap.Marker({
        position: [props.initialLng, props.initialLat],
        map: mapInstance,
      })
      selectedPosition.value = { lng: props.initialLng, lat: props.initialLat }
      await reverseGeocodeAddress(props.initialLng, props.initialLat)
    }

    // 点击地图放置标记
    mapInstance.on('click', async (e: AMap.MapsEvent<'click', unknown>) => {
      const { lng, lat } = e.lnglat
      updateMarker(lng, lat)
      await reverseGeocodeAddress(lng, lat)
    })
  } catch (err) {
    console.error('高德地图加载失败:', err)
    ElMessage.error('地图加载失败，请刷新后重试')
  } finally {
    loading.value = false
  }
}

function updateMarker(lng: number, lat: number) {
  if (!mapInstance) return
  if (markerInstance) {
    markerInstance.setPosition([lng, lat])
  } else {
    markerInstance = new AMap.Marker({
      position: [lng, lat],
      map: mapInstance,
    })
  }
  selectedPosition.value = { lng, lat }
}

async function reverseGeocodeAddress(lng: number, lat: number) {
  if (!geocoderInstance) {
    selectedAddress.value = `${lng.toFixed(6)}, ${lat.toFixed(6)}`
    selectedAddressComponent.value = null
    return
  }
  try {
    const result = await new Promise<AMap.ReGeocodeResult>((resolve, reject) => {
      ;(geocoderInstance as AMap.Geocoder).getAddress(
        [lng, lat],
        (status: string, result: string | AMap.ReGeocodeResult) => {
          if (status === 'complete' && typeof result !== 'string' && result.info === 'OK') {
            resolve(result)
          } else {
            reject(new Error(typeof result === 'string' ? result : '逆地理编码失败'))
          }
        },
      )
    })
    selectedAddress.value =
      result.regeocode?.formattedAddress ?? `${lng.toFixed(6)}, ${lat.toFixed(6)}`
    // 提取五级地址分量
    const comp = result.regeocode?.addressComponent
    selectedAddressComponent.value = {
      province: (comp as Record<string, unknown>)?.province as string || '',
      city: (comp as Record<string, unknown>)?.city as string || '',
      district: (comp as Record<string, unknown>)?.district as string || '',
      township: (comp as Record<string, unknown>)?.township as string || '',
      neighborhood: extractNeighborhoodName((comp as Record<string, unknown>)?.neighborhood),
    }
  } catch {
    selectedAddress.value = `${lng.toFixed(6)}, ${lat.toFixed(6)}`
    selectedAddressComponent.value = null
  }
}

function extractNeighborhoodName(val: unknown): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object' && 'name' in (val as Record<string, unknown>)) {
    return (val as Record<string, string>).name
  }
  return ''
}

// 搜索输入处理
let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  const keyword = searchKeyword.value.trim()
  if (!keyword) {
    searchTips.value = []
    showTips.value = false
    return
  }
  searchTimer = setTimeout(() => {
    doSearch(keyword)
  }, 300)
}

function doSearch(keyword: string) {
  if (!autoCompleteInstance) return
  searching.value = true
  autoCompleteInstance.search(keyword, (status: string, result: AMap.AutoCompleteResult) => {
    searching.value = false
    if (status === 'complete' && result.info === 'OK' && result.tips) {
      searchTips.value = result.tips
        .filter((tip: AMap.AutoCompleteTip) => tip.location && tip.id && tip.name)
        .map((tip: AMap.AutoCompleteTip) => ({
          id: tip.id!,
          name: tip.name!,
          district: tip.district ?? '',
          location: tip.location! as { lng: number; lat: number },
        }))
      showTips.value = searchTips.value.length > 0
    } else {
      searchTips.value = []
      showTips.value = false
    }
  })
}

// 选中搜索提示
function selectSearchTip(tip: { id: string; name: string; location: { lng: number; lat: number } }) {
  showTips.value = false
  searchKeyword.value = tip.name

  const { lng, lat } = tip.location
  if (!mapInstance) return

  // 移动地图中心并放置标记
  mapInstance.setCenter([lng, lat])
  updateMarker(lng, lat)
  reverseGeocodeAddress(lng, lat)
}

// 选中搜索提示后也可以按回车搜索
function onSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    const keyword = searchKeyword.value.trim()
    if (!keyword || !placeSearchInstance || !mapInstance) return
    showTips.value = false

    placeSearchInstance.search(keyword, (status: string, result: AMap.PlaceSearchResult) => {
      if (status === 'complete' && result.info === 'OK' && result.poiList?.pois?.length) {
        const poi = result.poiList.pois[0]
        const [lng, lat] = poi.location as [number, number]
        mapInstance!.setCenter([lng, lat])
        updateMarker(lng, lat)
        reverseGeocodeAddress(lng, lat)
      }
    })
  }
}

function handleConfirm() {
  if (!selectedPosition.value) return
  const comp = selectedAddressComponent.value
  emit('confirm', {
    lng: selectedPosition.value.lng,
    lat: selectedPosition.value.lat,
    address: selectedAddress.value,
    province: comp?.province ?? '',
    city: comp?.city ?? '',
    district: comp?.district ?? '',
    township: comp?.township ?? '',
    neighborhood: comp?.neighborhood ?? '',
  })
  handleClose()
}

function handleClose() {
  emit('update:modelValue', false)
}

function destroyMap() {
  if (mapInstance) {
    mapInstance.destroy()
    mapInstance = null
    markerInstance = null
    geocoderInstance = null
    autoCompleteInstance = null
    placeSearchInstance = null
  }
  selectedAddress.value = ''
  selectedPosition.value = null
  selectedAddressComponent.value = null
  searchKeyword.value = ''
  searchTips.value = []
  showTips.value = false
}

watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      setTimeout(destroyMap, 300)
    }
  },
)

onBeforeUnmount(() => {
  destroyMap()
})
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="地图选址"
    width="700px"
    destroy-on-close
    @update:model-value="handleClose"
    @opened="initMap"
  >
    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="输入地址关键词搜索，如小区名、路名、地标…"
        :prefix-icon="Search"
        clearable
        @input="onSearchInput"
        @keydown="onSearchKeydown"
        @blur="() => setTimeout(() => (showTips = false), 200)"
        @focus="() => { if (searchTips.length) showTips = true }"
      />
      <div v-if="showTips && searchTips.length" class="search-tips">
        <div
          v-for="tip in searchTips"
          :key="tip.id"
          class="search-tips__item"
          @mousedown.prevent="selectSearchTip(tip)"
        >
          <span class="search-tips__name">{{ tip.name }}</span>
          <span v-if="tip.district" class="search-tips__district">{{ tip.district }}</span>
        </div>
      </div>
    </div>

    <!-- 地图 -->
    <div v-loading="loading || searching" class="map-wrapper">
      <div ref="mapContainer" class="map-container"></div>
    </div>

    <!-- 已选地址 -->
    <div v-if="selectedAddress" class="selected-info">
      <span class="selected-info__text">{{ selectedAddress }}</span>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :disabled="!selectedPosition" @click="handleConfirm">确认选址</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.search-bar {
  position: relative;
  margin-bottom: 12px;
}
.search-tips {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 9999;
  background: #fff;
  border: 1px solid #e6ebe9;
  border-radius: 0 0 4px 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 240px;
  overflow-y: auto;

  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    cursor: pointer;
    border-bottom: 1px solid #f5f5f5;
    transition: background 0.15s;

    &:last-child { border-bottom: none; }
    &:hover { background: #f0f7ff; }
  }

  &__name {
    font-size: 13px;
    color: #333;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__district {
    font-size: 11px;
    color: #a8b2ad;
    margin-left: 12px;
    flex-shrink: 0;
  }
}
.map-wrapper {
  min-height: 300px;
}
.map-container {
  width: 100%;
  height: 400px;
  border-radius: 4px;
  overflow: hidden;
  background: #f6f8f7;
}
.selected-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 12px;
  background: #f0f7ff;
  border-radius: 4px;
  font-size: 13px;
  color: #333;
  line-height: 1.5;

  &__icon { flex-shrink: 0; }
  &__text { word-break: break-all; }
}
</style>
