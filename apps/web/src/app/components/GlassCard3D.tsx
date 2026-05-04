'use client'

import { ReactNode } from 'react'

interface GlassCard3DProps {
  children: ReactNode
  className?: string
}

export default function GlassCard3D({ children, className = '' }: GlassCard3DProps) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}
