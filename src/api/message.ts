import request from '@/utils/request'
import type { ApiResponse, PageData } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

export interface MessageItem {
  id: string
  category: string
  title: string
  content: string
  iconKey: string
  actionType: string
  actionTarget: string
  isRead: boolean
  createdAt: string
}

export interface UnreadCounts {
  total: number
  system: number
  appointment: number
  bill: number
  lease: number
  lock: number
  repair: number
}

export interface MessageQuery {
  category?: string
  isRead?: boolean
  page: number
  pageSize: number
}

async function unwrap<T>(promise: Promise<ApiResponse<T>>) {
  return unwrapApiResponse(await promise)
}

export function getMessageList(params: MessageQuery) {
  return unwrap(
    request.get<never, ApiResponse<PageData<MessageItem>>>('/messages', { params }),
  )
}

export function getUnreadCounts() {
  return unwrap(request.get<never, ApiResponse<UnreadCounts>>('/messages/unread-counts'))
}

export function markMessageRead(id: string) {
  return unwrap(request.put<never, ApiResponse<boolean>>(`/messages/${id}/read`))
}

export function markAllMessagesRead() {
  return unwrap(request.put<never, ApiResponse<boolean>>('/messages/read-all'))
}

export function clearReadMessages() {
  return unwrap(request.delete<never, ApiResponse<boolean>>('/messages/read'))
}

export function deleteMessage(id: string) {
  return unwrap(request.delete<never, ApiResponse<boolean>>(`/messages/${id}`))
}

export interface SendMessageRequest {
  userIds: string[]
  title: string
  content: string
  actionType: string
  actionTarget: string
}

export function sendMessage(data: SendMessageRequest) {
  return unwrap(request.post<never, ApiResponse<number>>('/admin/messages', data))
}
