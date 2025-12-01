'use client'

import { useRequireAuth } from '@/hooks/use-auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
  fallback?: React.ReactNode
}

export function ProtectedRoute({ 
  children, 
  redirectTo = '/login',
  fallback = <div className="flex items-center justify-center min-h-screen">Loading...</div>
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useRequireAuth(redirectTo)

  if (isLoading) {
    return <>{fallback}</>
  }

  if (!isAuthenticated) {
    return null // Will redirect via useRequireAuth
  }

  return <>{children}</>
}
