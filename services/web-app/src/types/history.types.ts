// History related types

export interface HistoryEntry {
  id: number
  originLang: string
  translatedLang: string
  createdAt: string
  originalFile: string
  originalFileName: string
  translatedFile: string
  translatedFileName: string
}

export interface CreateHistoryRequest {
  originLang: string
  translatedLang: string
  original: File
  translated: File
}

export interface HistoryListResponse {
  entries: HistoryEntry[]
}

export interface FileDownloadResponse {
  blob: Blob
  filename: string
}
