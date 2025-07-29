'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export default function AuthHeader() {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem('token'))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    setLoggedIn(false)
  }

  return (
    <div className="p-4 flex justify-end gap-2">
      {loggedIn ? (
        <Button onClick={handleLogout}>Logout</Button>
      ) : (
        <>
          <Link href="/login" className="text-sm underline">Login</Link>
          <Link href="/register" className="text-sm underline">Register</Link>
        </>
      )}
    </div>
  )
}
