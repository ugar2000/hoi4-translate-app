'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

export default function AuthHeader() {
  const { isAuthenticated, user, logout, isLoggingOut } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="p-4 flex justify-between items-center gap-4">
      <div className="flex gap-4 text-sm">
        <Link href="/">Home</Link>
        {isAuthenticated && <Link href="/history">History</Link>}
      </div>
      <div className="flex gap-2 items-center">
        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            {user?.email && (
              <span className="text-sm text-gray-600">Welcome, {user.email}</span>
            )}
            <Button onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        ) : (
          <>
            <Link href="/login" className="text-sm underline">Login</Link>
            <Link href="/register" className="text-sm underline">Register</Link>
          </>
        )}
      </div>
    </div>
  )
}
