'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui'
import Link from 'next/link'
import { useLogin } from '@/hooks/use-auth'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/translator'

  const { mutateAsync: login, isPending: isLoading, error } = useLogin()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      console.log('Login attempt with:', { email, password })
      console.log('Redirect URL:', redirectUrl)

      await login({ email, password })
      console.log('Login successful, about to redirect')

      // Add a small delay to ensure auth state is updated
      setTimeout(() => {
        console.log('Redirecting to:', redirectUrl)
        router.push(redirectUrl)
      }, 100)

    } catch (err) {
      console.error('Login failed:', err)
    }
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center px-4 py-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('/api/placeholder/1920/1080')] bg-cover bg-center opacity-10"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-slate-900/40"></div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="w-full max-w-md relative z-10">
        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 space-y-6 border border-white/20">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-300">Sign in to continue to Paradox Translator</p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error.message}
              </div>
            </div>
          )}

          <div className="space-y-5">
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl p-4 pl-12 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition duration-200 text-white placeholder-gray-300"
                required
                disabled={isLoading}
              />
              <svg className="w-5 h-5 text-gray-300 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>

            <PasswordInput
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              variant="glass"
              size="lg"
              required
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 rounded-xl font-semibold text-lg transition duration-200 transform hover:scale-[1.02] shadow-lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </div>
            ) : 'Sign In'}
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-300">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold hover:underline transition duration-200">
                Create one now
              </Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
