'use client'

import React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface BackgroundProps {
    children: React.ReactNode
    className?: string
}

export const Background = ({ children, className }: BackgroundProps) => {
    return (
        <div className={cn("min-h-screen w-full relative", className)}>
            <Image
                src="/images/main_bg.jpg"
                alt="Background"
                fill
                priority
                className="object-cover fixed inset-0 -z-10"
                quality={100}
            />
            <div className="relative z-10">
                {children}
            </div>
        </div>
    )
}
