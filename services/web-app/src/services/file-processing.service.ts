import { apiClient, type AxiosError } from '@/lib/api-client'

export type FileProcessResponse = {
  fileId: string
  uploadJobId: string
  fileName: string
}

class FileProcessingService {
  async start(file: File, targetLang: string): Promise<FileProcessResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('targetLang', targetLang)

    try {
      const response = await apiClient.post<FileProcessResponse>(
        '/files/process',
        formData,
      )
      return response.data
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>
      const message =
        axiosError.response?.data?.message ||
        axiosError.message ||
        'Failed to start file processing'
      throw new Error(message)
    }
  }
}

export const fileProcessingService = new FileProcessingService()
