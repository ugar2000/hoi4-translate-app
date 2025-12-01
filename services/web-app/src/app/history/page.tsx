'use client'

import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { EmptyState, EmptyStateIcons } from '@/components/EmptyState'
import AppLayout from '@/components/AppLayout'
import { useHistory, useDownloadOriginal, useDownloadTranslated, useDeleteHistory } from '@/hooks/use-history'

function HistoryContent() {
  const { data: entries, isLoading, error } = useHistory()
  const downloadOriginal = useDownloadOriginal()
  const downloadTranslated = useDownloadTranslated()
  const deleteHistory = useDeleteHistory()

  if (isLoading) {
    return <LoadingSpinner message="Loading history..." />
  }

  if (error) {
    return (
      <EmptyState
        icon={
          <div className="w-24 h-24 mb-6 rounded-full bg-red-100 flex items-center justify-center">
            {EmptyStateIcons.Error}
          </div>
        }
        title="Failed to Load History"
        description={error.message}
        action={{
          label: "Try Again",
          onClick: () => window.location.reload(),
          variant: "outline"
        }}
      />
    )
  }

  if (!entries || entries.length === 0) {
    return (
      <EmptyState
        icon={EmptyStateIcons.Document}
        title="No Translation History"
        description="You haven't created any translations yet. Start translating files to see your history here."
        action={{
          label: "Start Translating",
          onClick: () => window.location.href = '/translator'
        }}
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white/90 backdrop-blur-sm rounded-lg shadow">
        <thead>
          <tr className="text-left">
            <th className="px-4 py-2">Created</th>
            <th className="px-4 py-2">Source</th>
            <th className="px-4 py-2">Target</th>
            <th className="px-4 py-2">Original File</th>
            <th className="px-4 py-2">Translated File</th>
            <th className="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-t border-gray-200">
              <td className="px-4 py-2 whitespace-nowrap">{new Date(entry.createdAt).toLocaleString()}</td>
              <td className="px-4 py-2">{entry.originLang}</td>
              <td className="px-4 py-2">{entry.translatedLang}</td>
              <td className="px-4 py-2">{entry.originalFileName}</td>
              <td className="px-4 py-2">{entry.translatedFileName}</td>
              <td className="px-4 py-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadOriginal.mutate(entry.id)}
                  disabled={downloadOriginal.isPending}
                >
                  {downloadOriginal.isPending ? 'Downloading...' : 'Download Original'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => downloadTranslated.mutate(entry.id)}
                  disabled={downloadTranslated.isPending}
                >
                  {downloadTranslated.isPending ? 'Downloading...' : 'Download Translated'}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteHistory.mutate(entry.id)}
                  disabled={deleteHistory.isPending}
                >
                  {deleteHistory.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function HistoryPage() {
  return (
    <ProtectedRoute fallback={<LoadingSpinner message="Checking authentication..." className="min-h-screen" />}>
      <AppLayout>
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <h1 className="text-2xl font-bold mb-6">Translation History</h1>
          <HistoryContent />
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
