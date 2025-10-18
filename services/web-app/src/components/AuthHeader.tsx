'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function AuthHeader() {
  const [loggedIn, setLoggedIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const updateState = () => setLoggedIn(!!localStorage.getItem('token'))
    updateState()
    const handler = () => updateState()
    window.addEventListener('storage', handler)
    window.addEventListener('auth-changed', handler as EventListener)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('auth-changed', handler as EventListener)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    setLoggedIn(false)
    window.dispatchEvent(new Event('auth-changed'))
    router.push('/login')
  }

  return (
    <div className="p-4 flex justify-between items-center gap-4">
      <div className="flex gap-4 text-sm">
        <Link href="/">Home</Link>
        {loggedIn && <Link href="/history">History</Link>}
      </div>
      <div className="flex gap-2 items-center">
        {loggedIn ? (
          <Button onClick={handleLogout}>Logout</Button>
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
