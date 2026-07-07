import request from '@/utils/request'
import type { ApiResponse } from './types'

export type TourStatus = 'DRAFT' | 'PUBLISHED' | 'OFFLINE'
export type RenderMode = 'PHOTO' | 'PANORAMA'
export type ProjectionType = 'FLAT' | 'EQUIRECTANGULAR'
export type HotspotTargetType = 'SCENE' | 'IMAGE'

export type SceneType =
  | 'ENTRANCE'
  | 'LIVING_ROOM'
  | 'MASTER_BEDROOM'
  | 'SECOND_BEDROOM'
  | 'BEDROOM'
  | 'KITCHEN'
  | 'BATHROOM'
  | 'BALCONY'
  | 'DINING_ROOM'
  | 'STUDY'
  | 'CORRIDOR'
  | 'OTHER'

export interface ImmersiveTourSummary {
  tourId: string
  houseId: string
  title: string
  coverImageUrl: string | null
  floorPlanUrl: string | null
  entrySceneId: string | null
  status: TourStatus
  publishedAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface ImmersiveScene {
  sceneId: string
  tourId: string
  name: string
  sceneType: SceneType
  entryImageId: string | null
  floorPlanXRatio: number | null
  floorPlanYRatio: number | null
  renderMode: RenderMode | null
  initialYaw: number | null
  initialPitch: number | null
  initialHfov: number | null
  sortOrder: number | null
  enabled: number | null
  createdAt: string | null
  updatedAt: string | null
  images?: ImmersiveImage[] | null
}

export interface ImmersiveImage {
  imageId: string
  sceneId: string
  name: string | null
  imageUrl: string
  thumbnailUrl: string | null
  width: number | null
  height: number | null
  projectionType: ProjectionType | null
  imageWidth: number | null
  imageHeight: number | null
  sortOrder: number | null
  entry: boolean
  createdAt: string | null
  hotspots?: ImmersiveHotspot[] | null
}

export interface ImmersiveHotspot {
  hotspotId: string
  sourceImageId: string
  label: string
  xRatio: number | null
  yRatio: number | null
  yaw: number | null
  pitch: number | null
  targetType: HotspotTargetType | null
  targetSceneId: string | null
  targetImageId: string | null
  targetSceneName?: string | null
  targetImageUrl?: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface AdminImmersiveTourDetail extends ImmersiveTourSummary {
  scenes: ImmersiveScene[]
}

export interface AvailabilityResponse {
  available: boolean
  tourId: string | null
  coverImageUrl: string | null
}

export interface CreateImmersiveTourRequest {
  title: string
}

export interface CreateImmersiveSceneRequest {
  name: string
  sceneType: SceneType
  renderMode?: RenderMode | null
  initialYaw?: number | null
  initialPitch?: number | null
  initialHfov?: number | null
  sortOrder?: number | null
}

export interface UpdateImmersiveSceneRequest {
  name?: string
  sceneType?: SceneType
  renderMode?: RenderMode | null
  initialYaw?: number | null
  initialPitch?: number | null
  initialHfov?: number | null
  enabled?: number
}

export interface SetEntrySceneRequest {
  sceneId: string
}

export interface SetEntryImageRequest {
  imageId: string
}

export interface UpdateImmersiveImageRequest {
  name?: string | null
}

export interface HotspotPayload {
  label: string
  targetType?: HotspotTargetType
  targetSceneId?: string
  targetImageId?: string
  xRatio?: number
  yRatio?: number
  yaw?: number
  pitch?: number
}

function unwrapImmersiveResponse<T>(response: ApiResponse<T>) {
  if (response.code !== 200) {
    throw new Error(response.message || '请求失败')
  }
  return response.data
}

export async function getTourByHouseId(houseId: string) {
  const response = await request.get<never, ApiResponse<ImmersiveTourSummary>>(
    `/admin/houses/${houseId}/immersive-tour`,
  )
  return unwrapImmersiveResponse(response)
}

export async function createTour(houseId: string, data: CreateImmersiveTourRequest) {
  const response = await request.post<never, ApiResponse<ImmersiveTourSummary>>(
    `/admin/houses/${houseId}/immersive-tour`,
    data,
  )
  return unwrapImmersiveResponse(response)
}

export async function getTourDetail(tourId: string) {
  const response = await request.get<never, ApiResponse<AdminImmersiveTourDetail>>(
    `/admin/immersive-tours/${tourId}`,
  )
  return unwrapImmersiveResponse(response)
}

export async function getScenes(tourId: string) {
  const response = await request.get<never, ApiResponse<ImmersiveScene[]>>(
    `/admin/immersive-tours/${tourId}/scenes`,
  )
  return unwrapImmersiveResponse(response)
}

export async function createScene(tourId: string, data: CreateImmersiveSceneRequest) {
  const response = await request.post<never, ApiResponse<ImmersiveScene>>(
    `/admin/immersive-tours/${tourId}/scenes`,
    data,
  )
  return unwrapImmersiveResponse(response)
}

export async function updateScene(sceneId: string, data: UpdateImmersiveSceneRequest) {
  const response = await request.put<never, ApiResponse<void>>(
    `/admin/immersive-scenes/${sceneId}`,
    data,
  )
  return unwrapImmersiveResponse(response)
}

export async function deleteScene(sceneId: string) {
  const response = await request.delete<never, ApiResponse<void>>(
    `/admin/immersive-scenes/${sceneId}`,
  )
  return unwrapImmersiveResponse(response)
}

export async function getSceneImages(sceneId: string) {
  const response = await request.get<never, ApiResponse<ImmersiveImage[]>>(
    `/admin/immersive-scenes/${sceneId}/images`,
  )
  return unwrapImmersiveResponse(response)
}

export async function uploadSceneImages(
  sceneId: string,
  files: File[],
  projectionType?: ProjectionType,
  onUploadProgress?: (progress: number) => void,
) {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  if (projectionType) formData.append('projectionType', projectionType)
  const response = await request.post<never, ApiResponse<ImmersiveImage[]>>(
    `/admin/immersive-scenes/${sceneId}/images`,
    formData,
    {
      timeout: 60000,
      onUploadProgress(event) {
        if (event.total) onUploadProgress?.(Math.round((event.loaded / event.total) * 100))
      },
    },
  )
  return unwrapImmersiveResponse(response)
}

export async function deleteSceneImage(imageId: string) {
  const response = await request.delete<never, ApiResponse<void>>(
    `/admin/immersive-images/${imageId}`,
  )
  return unwrapImmersiveResponse(response)
}

export async function updateSceneImage(imageId: string, data: UpdateImmersiveImageRequest) {
  const response = await request.put<never, ApiResponse<void>>(
    `/admin/immersive-images/${imageId}`,
    data,
  )
  return unwrapImmersiveResponse(response)
}

export async function setEntryImage(sceneId: string, data: SetEntryImageRequest) {
  const response = await request.put<never, ApiResponse<void>>(
    `/admin/immersive-scenes/${sceneId}/entry-image`,
    data,
  )
  return unwrapImmersiveResponse(response)
}

export async function setEntryScene(tourId: string, data: SetEntrySceneRequest) {
  const response = await request.put<never, ApiResponse<void>>(
    `/admin/immersive-tours/${tourId}/entry-scene`,
    data,
  )
  return unwrapImmersiveResponse(response)
}

export async function getHotspots(imageId: string) {
  const response = await request.get<never, ApiResponse<ImmersiveHotspot[]>>(
    `/admin/immersive-images/${imageId}/hotspots`,
  )
  return unwrapImmersiveResponse(response)
}

export async function createHotspot(imageId: string, data: HotspotPayload) {
  const response = await request.post<never, ApiResponse<ImmersiveHotspot>>(
    `/admin/immersive-images/${imageId}/hotspots`,
    data,
  )
  return unwrapImmersiveResponse(response)
}

export async function updateHotspot(hotspotId: string, data: HotspotPayload) {
  const response = await request.put<never, ApiResponse<void>>(
    `/admin/immersive-hotspots/${hotspotId}`,
    data,
  )
  return unwrapImmersiveResponse(response)
}

export async function deleteHotspot(hotspotId: string) {
  const response = await request.delete<never, ApiResponse<void>>(
    `/admin/immersive-hotspots/${hotspotId}`,
  )
  return unwrapImmersiveResponse(response)
}

export async function publishTour(tourId: string) {
  const response = await request.post<never, ApiResponse<ImmersiveTourSummary>>(
    `/admin/immersive-tours/${tourId}/publish`,
  )
  return unwrapImmersiveResponse(response)
}

export async function offlineTour(tourId: string) {
  const response = await request.post<never, ApiResponse<ImmersiveTourSummary>>(
    `/admin/immersive-tours/${tourId}/offline`,
  )
  return unwrapImmersiveResponse(response)
}

export async function getTourAvailability(houseId: string) {
  const response = await request.get<never, ApiResponse<AvailabilityResponse>>(
    `/houses/${houseId}/immersive-tour/availability`,
  )
  return unwrapImmersiveResponse(response)
}

export async function getAppTourDetail(houseId: string) {
  const response = await request.get<never, ApiResponse<AdminImmersiveTourDetail>>(
    `/houses/${houseId}/immersive-tour`,
  )
  return unwrapImmersiveResponse(response)
}
