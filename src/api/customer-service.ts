import request from '@/utils/request'
import type { ApiResponse, PageData } from '@/api/types'
import { unwrapApiResponse } from '@/api/types'

// ========== 类型定义 ==========

export interface KbDocumentItem {
  id: string
  title: string
  category: string
  originalFilename: string
  fileType: string
  fileSize: number
  filePath: string
  chunkCount: number
  status: string
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface SessionItem {
  id: string
  title: string
  status: string
  messageCount: number
  lastMessagePreview: string
  createdAt: string
  updatedAt: string
}

export interface MessageItem {
  id: string
  sessionId: string
  role: string
  content: string
  metadataJson: string | null
  status: string
  createdAt: string
}

// ========== 知识库文档 API ==========

export async function getKbDocumentList(params?: {
  status?: string
  category?: string
  page?: number
  pageSize?: number
}) {
  const response = await request.get<never, ApiResponse<PageData<KbDocumentItem>>>(
    '/admin/customer-service/kb/documents',
    { params }
  )
  return unwrapApiResponse(response)
}

export async function uploadKbDocument(file: File, title?: string, category?: string) {
  const formData = new FormData()
  formData.append('file', file)
  if (title) formData.append('title', title)
  if (category) formData.append('category', category)
  const response = await request.post<never, ApiResponse<KbDocumentItem>>(
    '/admin/customer-service/kb/documents',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return unwrapApiResponse(response)
}

export async function updateKbDocument(
  documentId: string,
  body: { title?: string; category?: string; status?: string }
) {
  const response = await request.put<never, ApiResponse<KbDocumentItem>>(
    `/admin/customer-service/kb/documents/${documentId}`,
    body
  )
  return unwrapApiResponse(response)
}

export async function vectorizeDocument(documentId: string) {
  const response = await request.post<never, ApiResponse<null>>(
    `/admin/customer-service/kb/documents/${documentId}/vectorize`,
    undefined,
    { timeout: 130_000 }  // 向量化可能耗时较长
  )
  return unwrapApiResponse(response)
}

export async function deleteKbDocument(documentId: string) {
  const response = await request.delete<never, ApiResponse<null>>(
    `/admin/customer-service/kb/documents/${documentId}`
  )
  return unwrapApiResponse(response)
}

// ========== 客服会话 API（管理端查看） ==========

export async function getSessionList(params?: { page?: number; pageSize?: number }) {
  // 暂时使用客户端接口，等后端管理端会话列表接口完成
  const response = await request.get<never, ApiResponse<PageData<SessionItem>>>(
    '/admin/customer-service/sessions',
    { params }
  )
  return unwrapApiResponse(response)
}

export async function getSessionMessages(sessionId: string) {
  const response = await request.get<never, ApiResponse<MessageItem[]>>(
    `/admin/customer-service/sessions/${sessionId}/messages`
  )
  return unwrapApiResponse(response)
}
