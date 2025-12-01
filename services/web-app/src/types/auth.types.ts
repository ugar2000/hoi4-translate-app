// Authentication related types

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  name?: string
}

export interface AuthResponse {
  token: string
  user: {
    id: number
    email: string
    name?: string
  }
}

export interface User {
  id: number
  email: string
  name?: string
}
