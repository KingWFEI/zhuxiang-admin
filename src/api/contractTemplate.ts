import request from '@/utils/request'
import type { ApiResponse, PageData } from './types'

export type TemplateStatus =
  | 'DRAFT'
  | 'EDITING'
  | 'VALIDATING'
  | 'READY'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'DRIFTED'
  | 'ERROR'

export type MappingMode =
  | 'SYSTEM_FIELD'
  | 'FIXED_VALUE'
  | 'DERIVED'
  | 'USER_INPUT'
  | 'SIGNATURE'
  | 'IGNORE'

export type ValidationLevel = 'ERROR' | 'WARNING'

export interface ContractTemplateSummary {
  id: string
  businessType: string
  templateCode: string
  templateName: string
  version: number
  environment: 'SANDBOX' | 'PRODUCTION'
  docTemplateId: string | null
  status: TemplateStatus
  componentCount: number
  mappedCount: number
  requiredUnmappedCount: number
  lastSyncedAt: string | null
  publishedAt: string | null
  updatedAt: string
}

export interface ContractTemplateDetail extends ContractTemplateSummary {
  sourceFileId: string | null
  sourceFileName: string | null
  templateType: number
  componentFingerprint: string | null
  esignCreateTime: number | null
  esignUpdateTime: number | null
  validationStatus: string | null
  validationMessage: string | null
  createdByName: string | null
  publishedByName: string | null
}

export interface TemplateComponent {
  id: string
  componentId: string
  componentKey: string | null
  componentName: string
  componentType: number
  required: boolean
  pageNum: number | null
  positionX: number | null
  positionY: number | null
  width: number | null
  height: number | null
  signerRole: string | null
  mappingMode: MappingMode | null
  businessFieldCode: string | null
  fixedValue: string | null
  editable: boolean
  syncStatus: 'NEW' | 'MAPPED' | 'CHANGED' | 'REMOVED' | 'NORMAL'
  validationErrors: string[]
}

export interface ContractFieldDefinition {
  fieldCode: string
  displayName: string
  category: string
  valueType: string
  supportedComponentTypes: number[]
  sensitive: boolean
  description: string
}

export interface TemplateValidationIssue {
  level: ValidationLevel
  code: string
  message: string
  componentId: string | null
  componentKey: string | null
}

export interface TemplateValidationResult {
  passed: boolean
  errorCount: number
  warningCount: number
  componentCount: number
  mappedCount: number
  issues: TemplateValidationIssue[]
  validatedAt: string
}

export interface TemplatePageLink {
  url: string
  longUrl?: string | null
  expiresAt?: string | null
  docTemplateId?: string | null
}

export interface TemplatePreview {
  fileUrl: string
  fileName: string
  pageWidth: number | null
  pageHeight: number | null
  expiresAt: string | null
}

export interface CreateTemplatePayload {
  businessType: string
  templateCode: string
  templateName: string
  environment: 'SANDBOX' | 'PRODUCTION'
  versionNote?: string
}

export interface ComponentMappingPayload {
  componentId: string
  mappingMode: MappingMode
  businessFieldCode?: string | null
  fixedValue?: string | null
  editable?: boolean
}

export interface TemplateAuditLog {
  id: string
  action: string
  operatorName: string | null
  detail: string | null
  createdAt: string
}

function unwrap<T>(response: ApiResponse<T>): T {
  if (response.code !== 200) throw new Error(response.message || '请求失败')
  return response.data
}

export async function listContractTemplates(params: {
  page: number
  pageSize: number
  keyword?: string
  status?: TemplateStatus | ''
}) {
  const response = await request.get<never, ApiResponse<PageData<ContractTemplateSummary>>>(
    '/admin/contract-templates',
    { params },
  )
  return unwrap(response)
}

export async function getContractTemplate(templateId: string) {
  const response = await request.get<never, ApiResponse<ContractTemplateDetail>>(
    `/admin/contract-templates/${templateId}`,
  )
  return unwrap(response)
}

export async function createContractTemplate(payload: CreateTemplatePayload) {
  const response = await request.post<never, ApiResponse<ContractTemplateDetail>>(
    '/admin/contract-templates',
    payload,
  )
  return unwrap(response)
}

export async function uploadTemplateSourceFile(templateId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await request.post<never, ApiResponse<ContractTemplateDetail>>(
    `/admin/contract-templates/${templateId}/source-file`,
    formData,
    { timeout: 120000 },
  )
  return unwrap(response)
}

export async function getTemplateCreateUrl(templateId: string) {
  const response = await request.post<never, ApiResponse<TemplatePageLink>>(
    `/admin/contract-templates/${templateId}/esign/create-url`,
  )
  return unwrap(response)
}

export async function getTemplateEditUrl(templateId: string) {
  const response = await request.post<never, ApiResponse<TemplatePageLink>>(
    `/admin/contract-templates/${templateId}/esign/edit-url`,
  )
  return unwrap(response)
}

export async function syncTemplateComponents(templateId: string) {
  const response = await request.post<never, ApiResponse<TemplateComponent[]>>(
    `/admin/contract-templates/${templateId}/sync-components`,
  )
  return unwrap(response)
}

export async function getTemplateComponents(templateId: string) {
  const response = await request.get<never, ApiResponse<TemplateComponent[]>>(
    `/admin/contract-templates/${templateId}/components`,
  )
  return unwrap(response)
}

export async function getContractFieldDefinitions() {
  const response = await request.get<never, ApiResponse<ContractFieldDefinition[]>>(
    '/admin/contract-field-definitions',
  )
  return unwrap(response)
}

export async function saveComponentMappings(
  templateId: string,
  mappings: ComponentMappingPayload[],
) {
  const response = await request.put<never, ApiResponse<TemplateComponent[]>>(
    `/admin/contract-templates/${templateId}/component-mappings`,
    { mappings },
  )
  return unwrap(response)
}

export async function validateContractTemplate(templateId: string) {
  const response = await request.post<never, ApiResponse<TemplateValidationResult>>(
    `/admin/contract-templates/${templateId}/validate`,
  )
  return unwrap(response)
}

export async function generateTemplateTestFile(templateId: string) {
  const response = await request.post<never, ApiResponse<TemplatePreview>>(
    `/admin/contract-templates/${templateId}/generate-test-file`,
  )
  return unwrap(response)
}

export async function publishContractTemplate(templateId: string) {
  const response = await request.post<never, ApiResponse<ContractTemplateDetail>>(
    `/admin/contract-templates/${templateId}/publish`,
  )
  return unwrap(response)
}

export async function offlineContractTemplate(templateId: string) {
  const response = await request.post<never, ApiResponse<ContractTemplateDetail>>(
    `/admin/contract-templates/${templateId}/offline`,
  )
  return unwrap(response)
}

export async function cloneContractTemplate(templateId: string) {
  const response = await request.post<never, ApiResponse<ContractTemplateDetail>>(
    `/admin/contract-templates/${templateId}/clone-version`,
  )
  return unwrap(response)
}

export async function getTemplatePreview(templateId: string) {
  const response = await request.get<never, ApiResponse<TemplatePreview>>(
    `/admin/contract-templates/${templateId}/preview-url`,
  )
  return unwrap(response)
}

export async function getTemplateAuditLogs(templateId: string) {
  const response = await request.get<never, ApiResponse<TemplateAuditLog[]>>(
    `/admin/contract-templates/${templateId}/audit-logs`,
  )
  return unwrap(response)
}
