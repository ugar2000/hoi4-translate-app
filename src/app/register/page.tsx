'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005/api'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    if (res.ok) {
      router.push('/login')
    } else {
      alert('Registration failed')
    }
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <form onSubmit={handleSubmit} className="max-w-sm mx-auto space-y-4 bg-white/90 backdrop-blur-sm p-6 rounded-lg shadow">
        <h1 className="text-xl font-semibold text-center">Register</h1>
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
        <Button type="submit" className="w-full">Register</Button>
      </form>
    </main>
  )
}
