import { apiClient, type AxiosError } from '@/lib/api-client'
import type { HistoryEntry, CreateHistoryRequest } from '@/types/history.types'

class HistoryService {
  async getHistory(): Promise<HistoryEntry[]> {
    try {
      const response = await apiClient.get<HistoryEntry[]>('/history')
      return response.data
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage = axiosError.response?.data?.message || 'Failed to get history'
      throw new Error(errorMessage)
    }
  }

  async createHistory(request: CreateHistoryRequest): Promise<HistoryEntry> {
    try {
      const formData = new FormData()
      formData.append('originLang', request.originLang)
      formData.append('translatedLang', request.translatedLang)
      formData.append('original', request.original)
      formData.append('translated', request.translated)

      const response = await apiClient.post<HistoryEntry>('/history', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      return response.data
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage = axiosError.response?.data?.message || 'Failed to create history entry'
      throw new Error(errorMessage)
    }
  }

  async downloadOriginalFile(id: number): Promise<{ blob: Blob; filename: string }> {
    try {
      const response = await apiClient.get(`/history/${id}/original`, {
        responseType: 'blob',
      })
      
      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition']
      let filename = `original-${id}.txt`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]*)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      return {
        blob: response.data,
        filename,
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage = axiosError.response?.data?.message || 'Failed to download original file'
      throw new Error(errorMessage)
    }
  }

  async downloadTranslatedFile(id: number): Promise<{ blob: Blob; filename: string }> {
    try {
      const response = await apiClient.get(`/history/${id}/translated`, {
        responseType: 'blob',
      })
      
      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition']
      let filename = `translated-${id}.txt`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]*)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      return {
        blob: response.data,
        filename,
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage = axiosError.response?.data?.message || 'Failed to download translated file'
      throw new Error(errorMessage)
    }
  }

  async deleteHistoryEntry(id: number): Promise<void> {
    try {
      await apiClient.delete(`/history/${id}`)
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage = axiosError.response?.data?.message || 'Failed to delete history entry'
      throw new Error(errorMessage)
    }
  }
}

export const historyService = new HistoryService()
