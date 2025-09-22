'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005/api').replace(/\/$/, '')

type HistoryEntry = {
  id: number
  originLang: string
  translatedLang: string
  createdAt: string
  originalFile: string
  originalFileName: string
  translatedFile: string
  translatedFileName: string
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setError('You must be logged in to view your translation history.')
      setLoading(false)
      return
    }

    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_URL}/history`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to load history (status ${response.status})`)
        }

        const data: HistoryEntry[] = await response.json()
        setEntries(data)
      } catch (err) {
        console.error('Failed to fetch history', err)
        setError('Unable to load translation history.')
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [])

  const handleDownload = async (id: number, type: 'original' | 'translated', fileName: string) => {
    const token = localStorage.getItem('token')
    if (!token) {
      setError('You must be logged in to download files.')
      return
    }

    try {
      const response = await fetch(`${API_URL}/history/${id}/${type}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download file', err)
      alert('Failed to download the requested file. Please try again.')
    }
  }

  const renderContent = () => {
    if (loading) {
      return <p>Loading history…</p>
    }

    if (error) {
      return <p className="text-red-600">{error}</p>
    }

    if (entries.length === 0) {
      return <p>No translations saved yet.</p>
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
                    onClick={() => handleDownload(entry.id, 'original', entry.originalFileName)}
                  >
                    Download Original
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDownload(entry.id, 'translated', entry.translatedFileName)}
                  >
                    Download Translated
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Translation History</h1>
      {renderContent()}
    </main>
  )
}
