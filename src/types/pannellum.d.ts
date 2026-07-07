import type { HotspotPayload } from '@/api/immersiveTour'

export {}

declare global {
  interface Window {
    pannellum: PannellumApi
  }
}

declare module 'pannellum'
declare module 'pannellum/build/pannellum.css'

interface PannellumApi {
  viewer(container: HTMLElement | string, config: PannellumViewerConfig): PannellumViewer
}

interface PannellumViewerConfig {
  type: 'equirectangular'
  panorama: string
  autoLoad?: boolean
  yaw?: number
  pitch?: number
  hfov?: number
  showControls?: boolean
  showFullscreenCtrl?: boolean
  showZoomCtrl?: boolean
  keyboardZoom?: boolean
  crossOrigin?: string
  hotSpots?: PannellumHotSpotConfig[]
}

interface PannellumHotSpotConfig {
  id?: string
  pitch: number
  yaw: number
  type?: 'info' | 'scene'
  text?: string
  cssClass?: string
  clickHandlerFunc?: (event: MouseEvent, args?: unknown) => void
  clickHandlerArgs?: unknown
}

interface PannellumViewer {
  getPitch(): number
  getYaw(): number
  getHfov(): number
  mouseEventToCoords(event: MouseEvent): [number, number]
  addHotSpot(config: PannellumHotSpotConfig, sceneId?: string): PannellumViewer
  removeHotSpot(hotspotId: string, sceneId?: string): boolean | PannellumViewer
  loadScene(sceneId: string, pitch?: number | 'same', yaw?: number | 'same' | 'sameAzimuth', hfov?: number | 'same'): PannellumViewer
  resize(): void
  destroy(): void
  toggleFullscreen(): PannellumViewer
  on(eventName: string, handler: (...args: unknown[]) => void): PannellumViewer
  off(eventName?: string, handler?: (...args: unknown[]) => void): PannellumViewer
}

export type PanoramaHotspotSubmitPayload = HotspotPayload
