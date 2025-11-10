// API related types

export interface ApiError {
  message: string
  code?: string
  details?: any
}

export interface ApiResponse<T = any> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T = any> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Translation related types
export interface TranslationRequest {
  text: string
  sourceLang: string
  targetLang: string
}

export interface TranslationResponse {
  translatedText: string
  confidence: number
}

// File upload types
export interface FileUploadResponse {
  fileId: string
  fileName: string
  fileSize: number
  uploadedAt: string
}
