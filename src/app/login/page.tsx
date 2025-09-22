'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    if (res.ok) {
      const data = await res.json()
      localStorage.setItem('token', data.token)
      window.dispatchEvent(new Event('auth-changed'))
      router.push('/')
    } else {
      alert('Login failed')
    }
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <form onSubmit={handleSubmit} className="max-w-sm mx-auto space-y-4 bg-white/90 backdrop-blur-sm p-6 rounded-lg shadow">
        <h1 className="text-xl font-semibold text-center">Login</h1>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full border rounded p-2"
          required
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full border rounded p-2"
          required
        />
        <Button type="submit" className="w-full">Login</Button>
      </form>
    </main>
  )
}
