'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

interface HeaderProps {
  className?: string
}

const getPageTitle = (pathname: string) => {
  switch (pathname) {
    case '/translator':
      return {
        title: 'Translator',
        description: 'Upload and translate your game files with ease'
      }
    case '/history':
      return {
        title: 'Translation History',
        description: 'View and download your previous translations'
      }
    case '/settings':
      return {
        title: 'Settings',
        description: 'Manage your account and preferences'
      }
    default:
      return {
        title: 'Dashboard',
        description: 'Welcome to Paradox Game Translator'
      }
  }
}

export default function Header({ className }: HeaderProps) {
  const pathname = usePathname()
  const { title, description } = getPageTitle(pathname)

  return (
    <header className={`bg-gradient-to-r from-white/90 via-blue-50/80 to-purple-50/80 backdrop-blur-xl border-b border-gray-200/30 px-6 py-4 shadow-lg ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{title}</h1>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <div className="relative hidden md:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search translations..."
              className="block w-64 pl-10 pr-3 py-2 border border-white/30 rounded-xl leading-5 bg-white/20 backdrop-blur-sm placeholder-gray-400 text-gray-700 focus:outline-none focus:placeholder-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19l5-5 5 5-5 5-5-5z" />
            </svg>
            <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400"></span>
          </button>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Translation
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
