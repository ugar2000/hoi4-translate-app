import axios, { AxiosInstance, AxiosError } from 'axios'

// Dynamic API URL getter to handle environment variable loading issues
const getApiUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  
  if (!envUrl || envUrl === 'undefined' || envUrl.trim() === '') {
    console.warn('NEXT_PUBLIC_API_URL is not set or invalid, using fallback: http://localhost:3005')
    return 'http://localhost:3005'
  }
  
  return envUrl.trim()
}

// Get auth token from cookies
const getAuthToken = (): string | null => {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie.split(';')
  const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth-token='))

  if (!authCookie) return null

  return authCookie.split('=')[1] || null
}

// Clear auth token from cookies
const clearAuthToken = (): void => {
  if (typeof document === 'undefined') return
  
  // Clear the auth token cookie
  document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  
  // Dispatch auth change event
  window.dispatchEvent(new Event('auth-changed'))
}

// Create axios instance
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: `${getApiUrl()}/api`,
    timeout: 10000,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor
  client.interceptors.request.use(
    (config) => {
      console.log(`Making ${config.method?.toUpperCase()} request to: ${config.url}`)
      
      // Remove JSON header for FormData payloads so browser sets the boundary
      if (config.data instanceof FormData && config.headers) {
        if (typeof config.headers.delete === 'function') {
          config.headers.delete('Content-Type')
        } else {
          Reflect.deleteProperty(config.headers, 'Content-Type')
        }
      }

      // Add JWT token to Authorization header if available
      const token = getAuthToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
        console.log('Added Authorization header with JWT token')
      }
      
      return config
    },
    (error) => {
      console.error('Request interceptor error:', error)
      return Promise.reject(error)
    }
  )

  // Response interceptor
  client.interceptors.response.use(
    (response) => {
      console.log(`Response from ${response.config.url}:`, response.status)
      return response
    },
    (error: AxiosError) => {
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
      })

      // Handle common error cases
      if (error.response?.status === 401) {
        // Unauthorized - clear auth token and redirect to login
        console.warn('Unauthorized request detected - clearing auth token')
        clearAuthToken()
      }

      if (error.response?.status === 403) {
        // Forbidden
        console.warn('Forbidden request detected')
      }

      if (error.response && error.response.status >= 500) {
        // Server error
        console.error('Server error detected')
      }

      return Promise.reject(error)
    }
  )

  return client
}

// Export singleton instance
export const apiClient = createApiClient()

// Export types for better TypeScript support
export type { AxiosResponse, AxiosError } from 'axios'
