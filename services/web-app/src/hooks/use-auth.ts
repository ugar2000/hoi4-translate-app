'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { authService } from '@/services/auth.service'
import type { LoginCredentials, RegisterCredentials, User } from '@/types/auth.types'

// Query keys for React Query
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
}

// Hook for getting current user
export function useUser() {
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: authService.getCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook for login mutation
export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      console.log('Login mutation success:', data)

      try {
        // Set the auth token
        authService.setAuthToken(data.token)
        console.log('Auth token set successfully')

        // Update the user query cache
        queryClient.setQueryData(authKeys.user(), data.user)
        console.log('User data cached successfully')

        // Invalidate and refetch user data
        queryClient.invalidateQueries({ queryKey: authKeys.user() })
        console.log('User queries invalidated successfully')
      } catch (error) {
        console.error('Error in login success handler:', error)
      }
    },
    onError: (error) => {
      console.error('Login mutation failed:', error)
    },
  })
}

// Hook for register mutation
export function useRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      // Set the auth token
      authService.setAuthToken(data.token)

      // Update the user query cache
      queryClient.setQueryData(authKeys.user(), data.user)

      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: authKeys.user() })
    },
    onError: (error) => {
      console.error('Registration failed:', error)
    },
  })
}

// Hook for logout mutation
export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      // Clear user data from cache
      queryClient.setQueryData(authKeys.user(), null)

      // Clear all queries
      queryClient.clear()

      // Redirect to login
      router.push('/login')
    },
    onError: (error) => {
      console.error('Logout failed:', error)
      // Even if logout fails on server, clear local state
      queryClient.setQueryData(authKeys.user(), null)
      queryClient.clear()
      router.push('/login')
    },
  })
}

// Hook for auth state management
export function useAuth() {
  const [isClient, setIsClient] = useState(false)
  const { data: user, isLoading, error, refetch } = useUser()
  const loginMutation = useLogin()
  const registerMutation = useRegister()
  const logoutMutation = useLogout()

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Listen for auth changes (e.g., from other tabs)
  useEffect(() => {
    if (!isClient) return

    const handleAuthChange = () => {
      refetch()
    }

    window.addEventListener('auth-changed', handleAuthChange)
    return () => window.removeEventListener('auth-changed', handleAuthChange)
  }, [isClient, refetch])

  const isAuthenticated = isClient && !!user && !error
  const isUnauthenticated = isClient && !user && !isLoading

  return {
    // User data
    user,
    isAuthenticated,
    isUnauthenticated,
    isLoading: !isClient || isLoading,
    error,

    // Auth actions
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,

    // Mutation states
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,

    // Errors
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    logoutError: logoutMutation.error,

    // Utilities
    refetch,
  }
}

// Hook for protecting routes
export function useRequireAuth(redirectTo = '/login') {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentPath = window.location.pathname
      const redirectUrl = currentPath !== '/' ? `?redirect=${encodeURIComponent(currentPath)}` : ''
      router.push(`${redirectTo}${redirectUrl}`)
    }
  }, [isAuthenticated, isLoading, router, redirectTo])

  return { isAuthenticated, isLoading }
}

// Hook for redirecting authenticated users
export function useRedirectIfAuthenticated(redirectTo = '/translator') {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(redirectTo)
    }
  }, [isAuthenticated, isLoading, router, redirectTo])

  return { isAuthenticated, isLoading }
}
