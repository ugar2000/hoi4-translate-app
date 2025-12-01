import { apiClient, type AxiosError } from '@/lib/api-client'
import type { TranslationRequest, TranslationResponse, FileUploadResponse } from '@/types/api.types'

// Example service showing how to use the API client
class ExampleService {
  async translateText(request: TranslationRequest): Promise<TranslationResponse> {
    try {
      const response = await apiClient.post<TranslationResponse>('/translate', request)
      return response.data
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage = axiosError.response?.data?.message || 'Translation failed'
      throw new Error(errorMessage)
    }
  }

  async getTranslationHistory(): Promise<TranslationResponse[]> {
    try {
      const response = await apiClient.get<TranslationResponse[]>('/translate/history')
      return response.data
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage = axiosError.response?.data?.message || 'Failed to get history'
      throw new Error(errorMessage)
    }
  }

  async uploadFile(file: File): Promise<FileUploadResponse> {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await apiClient.post<FileUploadResponse>('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      return response.data
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage = axiosError.response?.data?.message || 'File upload failed'
      throw new Error(errorMessage)
    }
  }
}

export const exampleService = new ExampleService()

// This file demonstrates:
// 1. How to use the centralized API client
// 2. Proper TypeScript typing with generics
// 3. Consistent error handling pattern
// 4. Different types of requests (GET, POST, file upload)
// 5. Custom headers when needed
