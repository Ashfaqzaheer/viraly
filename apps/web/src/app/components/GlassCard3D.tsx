'use client'

import { ReactNode } from 'react'

interface GlassCard3DProps {
  children: ReactNode
  className?: string
  glareColor?: string
  tiltIntensity?: number
}

export default function GlassCard3D({ children, className = '' }: GlassCard3DProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {children}
    </div>
  )
}
