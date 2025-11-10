'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { historyService } from '@/services/history.service'
import type { HistoryEntry, CreateHistoryRequest } from '@/types/history.types'

// Query keys for React Query
export const historyKeys = {
  all: ['history'] as const,
  lists: () => [...historyKeys.all, 'list'] as const,
  list: (filters: string) => [...historyKeys.lists(), { filters }] as const,
  details: () => [...historyKeys.all, 'detail'] as const,
  detail: (id: number) => [...historyKeys.details(), id] as const,
}

// Hook for getting history list
export function useHistory() {
  return useQuery({
    queryKey: historyKeys.lists(),
    queryFn: historyService.getHistory,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook for creating history entry
export function useCreateHistory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: historyService.createHistory,
    onSuccess: (newEntry: HistoryEntry) => {
      // Update the history list cache
      queryClient.setQueryData<HistoryEntry[]>(historyKeys.lists(), (old) => {
        if (!old) return [newEntry]
        return [newEntry, ...old]
      })

      // Invalidate and refetch history list
      queryClient.invalidateQueries({ queryKey: historyKeys.lists() })
    },
    onError: (error) => {
      console.error('Create history error:', error)
    },
  })
}

// Hook for downloading original file
export function useDownloadOriginal() {
  return useMutation({
    mutationFn: historyService.downloadOriginalFile,
    onSuccess: ({ blob, filename }) => {
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    onError: (error) => {
      console.error('Download original file error:', error)
    },
  })
}

// Hook for downloading translated file
export function useDownloadTranslated() {
  return useMutation({
    mutationFn: historyService.downloadTranslatedFile,
    onSuccess: ({ blob, filename }) => {
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    onError: (error) => {
      console.error('Download translated file error:', error)
    },
  })
}

// Hook for deleting history entry
export function useDeleteHistory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: historyService.deleteHistoryEntry,
    onSuccess: (_, deletedId: number) => {
      // Update the history list cache
      queryClient.setQueryData<HistoryEntry[]>(historyKeys.lists(), (old) => {
        if (!old) return []
        return old.filter(entry => entry.id !== deletedId)
      })

      // Invalidate and refetch history list
      queryClient.invalidateQueries({ queryKey: historyKeys.lists() })
    },
    onError: (error) => {
      console.error('Delete history error:', error)
    },
  })
}
