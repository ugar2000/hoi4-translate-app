import { apiClient, type AxiosError } from '@/lib/api-client'
import type { LoginCredentials, RegisterCredentials, AuthResponse, User } from '@/types/auth.types'

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('Login attempt with:', credentials)
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials)
      return response.data
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage = axiosError.response?.data?.message || 'Login failed'
      throw new Error(errorMessage)
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', credentials)
      return response.data
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage = axiosError.response?.data?.message || 'Registration failed'
      throw new Error(errorMessage)
    }
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } catch (error) {
      console.warn('Logout request failed, but continuing with local cleanup:', error)
    }

    // Always clear local auth state regardless of server response
    this.clearAuthToken()
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiClient.get<User>('/auth/me')
      return response.data
    } catch (error) {
      const axiosError = error as AxiosError

      if (axiosError.response?.status === 401) {
        // Unauthorized - clear local auth state
        this.clearAuthToken()
        return null
      }

      console.error('Error getting current user:', error)
      this.clearAuthToken()
      return null
    }
  }

  setAuthToken(token: string): void {
    // Set HTTP-only cookie
    document.cookie = `auth-token=${token}; path=/; secure; samesite=strict; max-age=${7 * 24 * 60 * 60}` // 7 days

    // Dispatch auth change event
    window.dispatchEvent(new Event('auth-changed'))
  }

  clearAuthToken(): void {
    // Clear the auth token cookie
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'

    // Dispatch auth change event
    window.dispatchEvent(new Event('auth-changed'))
  }

  getAuthToken(): string | null {
    if (typeof document === 'undefined') return null

    const cookies = document.cookie.split(';')
    const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth-token='))

    if (!authCookie) return null

    return authCookie.split('=')[1] || null
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken()
  }
}

export const authService = new AuthService()
