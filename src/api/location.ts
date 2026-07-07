import request from '@/utils/request'
import type { ApiResponse } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export interface ReverseGeocodeResult {
  province: string
  city: string
  district: string
  township: string
  neighborhood: string
}

export async function reverseGeocode(lat: number, lng: number) {
  const response = await request.get<never, ApiResponse<ReverseGeocodeResult>>(
    '/location/reverse-geocode-all',
    { params: { lat, lng } },
  )
  return unwrapApiResponse(response)
}
