'use client'

// ---------- Types ----------

export type RegulatoryDocRow = {
  id: string
  doc_type_name: string
  doc_type_code: string
  category: string
  document_number: string | null
  linked_to: string | null
  linked_type: string | null
  issue_date: string
  expiry_date: string | null
  status: string
  has_file: boolean
  verified: boolean
}

export type DocTypeOption = {
  id: string
  name: string
  code: string
  category: string
  description: string | null
  valid_for_days: number | null
  issuing_authority: string | null
  required_fields: unknown
}

export type BatchOption = {
  id: string
  code: string
}

export type ProductOption = {
  id: string
  name: string
  sku: string | null
}

export type FacilityOption = {
  id: string
  name: string
}

export type ShipmentOption = {
  id: string
  shipment_code: string
}

export type QualityTestOption = {
  id: string
  test_type: string
  batch_code: string
}

// ---------- Label Maps ----------

export const docStatusLabels: Record<string, string> = {
  draft: 'Borrador',
  valid: 'Válido',
  expired: 'Vencido',
  revoked: 'Revocado',
  superseded: 'Superado',
}

export const docStatusBadgeStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  valid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  revoked: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  superseded: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

export const categoryLabels: Record<string, string> = {
  quality: 'Calidad',
  transport: 'Transporte',
  compliance: 'Cumplimiento',
  origin: 'Origen',
  safety: 'Seguridad',
  commercial: 'Comercial',
}

export const categoryBadgeStyles: Record<string, string> = {
  quality: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  transport: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  compliance: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  origin: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  safety: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  commercial: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}
